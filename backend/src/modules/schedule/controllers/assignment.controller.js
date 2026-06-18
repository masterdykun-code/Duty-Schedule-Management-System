import { pool } from "../../../db.js";
import { recordActivityLog } from "../../activity/services/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notification/services/notification.service.js";
import { getRequestedWeekStart } from "../../../utils/schedule-date.js";
import {
  getAssignmentCellContext,
  upsertAssignedSchedule,
  findMissingRequiredAssignments,
  getAssignmentPayload,
} from "../services/assignment.service.js";
import {
  validateSaveAssignmentCellDTO,
  validateWeekStartDTO,
} from "../dtos/schedule.dto.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function getAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);
    if (!weekStart) {
      return sendError(res, "week_start phải có định dạng YYYY-MM-DD", 400);
    }

    const payload = await getAssignmentPayload(weekStart);
    sendSuccess(res, payload);
  } catch (error) {
    sendError(res, "Lỗi khi lấy dữ liệu phân công lịch trực", 500, { error: error.message });
  }
}

export async function saveAssignmentCell(req, res) {
  const client = await pool.connect();

  try {
    const dto = validateSaveAssignmentCellDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { employeeIds, departmentId, roomId, shiftId, dutyDate, note } = dto.data;

    await client.query("BEGIN");

    const context = await getAssignmentCellContext(client, roomId, shiftId);
    if (!context) {
      await client.query("ROLLBACK");
      return sendError(res, "Ca trực này không áp dụng cho phòng/khoa đã chọn", 400);
    }

    if (employeeIds.length > context.max_staff) {
      await client.query("ROLLBACK");
      return sendError(res, `Chỉ được phân công tối đa ${context.max_staff} người cho ca này`, 400);
    }

    if (employeeIds.length > 0) {
      const employeesResult = await client.query(
        `
        SELECT employee_id
        FROM employees
        WHERE employee_id = ANY($1::bigint[])
          AND department_id = $2
          AND status = 'ACTIVE'
        `,
        [employeeIds, context.department_id],
      );

      if (employeesResult.rowCount !== employeeIds.length) {
        await client.query("ROLLBACK");
        return sendError(res, "Nhân viên được chọn không hợp lệ hoặc không thuộc khoa này", 400);
      }

      const busyResult = await client.query(
        `
        SELECT e.full_name, r.room_code
        FROM schedules s
        JOIN employees e ON e.employee_id = s.employee_id
        JOIN rooms r ON r.room_id = s.room_id
        WHERE s.employee_id = ANY($1::bigint[])
          AND s.duty_date = $2::date
          AND s.shift_id = $3
          AND s.status <> 'CANCELLED'
          AND s.room_id <> $4
        `,
        [employeeIds, dutyDate, shiftId, roomId],
      );

      if (busyResult.rowCount > 0) {
        await client.query("ROLLBACK");
        return sendError(res, `${busyResult.rows[0].full_name} đã được phân công ca này tại phòng ${busyResult.rows[0].room_code}`, 400);
      }
    }

    const currentResult = await client.query(
      `
      SELECT schedule_id, employee_id
      FROM schedules
      WHERE room_id = $1
        AND duty_date = $2::date
        AND shift_id = $3
        AND status <> 'CANCELLED'
      `,
      [roomId, dutyDate, shiftId],
    );

    const selectedEmployeeSet = new Set(employeeIds);
    const removedScheduleIds = currentResult.rows
      .filter((schedule) => !selectedEmployeeSet.has(Number(schedule.employee_id)))
      .map((schedule) => schedule.schedule_id);

    if (removedScheduleIds.length > 0) {
      await client.query(
        `
        UPDATE schedules
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE schedule_id = ANY($1::bigint[])
        `,
        [removedScheduleIds],
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const employeeId of employeeIds) {
      const action = await upsertAssignedSchedule(client, {
        employeeId,
        departmentId: context.department_id,
        roomId,
        shiftId,
        dutyDate,
        assignedByUserId: req.user.sub,
        note,
      });

      if (action === "created") {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }
    }

    await recordActivityLog(client, {
      req,
      action: "ASSIGN_SCHEDULE_MANUAL",
      entityType: "schedules",
      description: `Phân công thủ công ngày ${dutyDate}, phòng ${context.room_code}, ca ${context.shift_code}`,
      metadata: {
        duty_date: dutyDate,
        department_id: context.department_id,
        department_code: context.department_code,
        room_id: roomId,
        room_code: context.room_code,
        shift_id: shiftId,
        shift_code: context.shift_code,
        employee_ids: employeeIds,
        created_count: createdCount,
        updated_count: updatedCount,
        removed_count: removedScheduleIds.length,
        note,
      },
    });

    if (employeeIds.length > 0) {
      await createNotificationsForEmployeeIds(client, {
        employeeIds,
        senderUserId: req.user.sub,
        title: "Lịch trực mới",
        message: `Bạn có lịch trực ${context.shift_name} ngày ${dutyDate} tại phòng ${context.room_code}.`,
        notificationType: "SCHEDULE_ASSIGNED",
        entityType: "schedules",
        linkTarget: "personal_schedule",
        metadata: {
          duty_date: dutyDate,
          department_id: context.department_id,
          department_code: context.department_code,
          room_id: roomId,
          room_code: context.room_code,
          shift_id: shiftId,
          shift_code: context.shift_code,
        },
      });
    }

    if (removedScheduleIds.length > 0) {
      const removedEmployeeIds = currentResult.rows
        .filter((schedule) => !selectedEmployeeSet.has(Number(schedule.employee_id)))
        .map((schedule) => Number(schedule.employee_id));

      await createNotificationsForEmployeeIds(client, {
        employeeIds: removedEmployeeIds,
        senderUserId: req.user.sub,
        title: "Lịch trực đã thay đổi",
        message: `Ca trực ${context.shift_name} ngày ${dutyDate} tại phòng ${context.room_code} đã được cập nhật.`,
        notificationType: "SCHEDULE_UPDATED",
        entityType: "schedules",
        linkTarget: "personal_schedule",
        metadata: {
          duty_date: dutyDate,
          department_id: context.department_id,
          department_code: context.department_code,
          room_id: roomId,
          room_code: context.room_code,
          shift_id: shiftId,
          shift_code: context.shift_code,
          removed_schedule_ids: removedScheduleIds,
        },
      });
    }

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Lưu phân công thành công",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = ["23505", "23514"].includes(error.code);
    sendError(
      res,
      isConflict ? error.message : "Lỗi khi lưu phân công",
      isConflict ? 400 : 500,
      { error: error.message }
    );
  } finally {
    client.release();
  }
}

export async function validateAssignmentSchedule(req, res) {
  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;
    const missing = await findMissingRequiredAssignments(pool, weekStart);

    sendSuccess(res, {
      complete: missing.length === 0,
      missing_count: missing.length,
      missing,
      message:
        missing.length === 0
          ? "Lịch trực đã được phân công đầy đủ"
          : "Vui lòng phân công đầy đủ các ca trực bắt buộc",
    });
  } catch (error) {
    sendError(res, "Lỗi khi kiểm tra lịch trực", 500, { error: error.message });
  }
}

export async function autoAssignSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;

    await client.query("BEGIN");

    const [missingCells, employeesResult, weekSchedulesResult] = await Promise.all([
      findMissingRequiredAssignments(client, weekStart),
      client.query(`
        SELECT employee_id, full_name, position, department_id, room_id
        FROM employees
        WHERE status = 'ACTIVE'
        ORDER BY full_name ASC
      `),
      client.query(
        `
        SELECT employee_id, to_char(duty_date, 'YYYY-MM-DD') AS duty_date, shift_id
        FROM schedules
        WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
          AND status <> 'CANCELLED'
        `,
        [weekStart],
      ),
    ]);

    const employeesByDepartment = groupEmployeesByDepartment(employeesResult.rows);
    const { busyKeys, weeklyCounts } = buildWeekScheduleIndexes(weekSchedulesResult.rows);

    let createdCount = 0;
    let updatedCount = 0;
    const assignedEmployeeIds = [];
    const remaining = [];

    for (const cell of missingCells) {
      const needed = Number(cell.min_staff) - Number(cell.assigned_count);
      const selected = selectEmployeesForCell(cell, {
        employeesByDepartment,
        busyKeys,
        weeklyCounts,
        limit: Math.max(0, needed),
      });

      for (const employee of selected) {
        assignedEmployeeIds.push(employee.employee_id);

        const action = await upsertAssignedSchedule(client, {
          employeeId: employee.employee_id,
          departmentId: cell.department_id,
          roomId: cell.room_id,
          shiftId: cell.shift_id,
          dutyDate: cell.duty_date,
          assignedByUserId: req.user.sub,
        });

        if (action === "created") {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }

        markEmployeeBusy(employee, cell, { busyKeys, weeklyCounts });
      }

      if (selected.length < needed) {
        remaining.push({
          ...cell,
          assigned_count: Number(cell.assigned_count) + selected.length,
        });
      }
    }

    await recordActivityLog(client, {
      req,
      action: "ASSIGN_SCHEDULE_AUTO",
      entityType: "schedules",
      description: `Phân công tự động tuần bắt đầu ${weekStart}`,
      metadata: {
        week_start: weekStart,
        created_count: createdCount,
        updated_count: updatedCount,
        remaining_missing_count: remaining.length,
      },
    });

    if (assignedEmployeeIds.length > 0) {
      await createNotificationsForEmployeeIds(client, {
        employeeIds: assignedEmployeeIds,
        senderUserId: req.user.sub,
        title: "Lịch trực tuần mới",
        message: `Bạn có lịch trực mới trong tuần bắt đầu ${weekStart}.`,
        notificationType: "SCHEDULE_ASSIGNED",
        entityType: "schedules",
        linkTarget: "personal_schedule",
        metadata: {
          week_start: weekStart,
          created_count: createdCount,
          updated_count: updatedCount,
        },
      });
    }

    await client.query("COMMIT");

    sendSuccess(res, {
      message:
        remaining.length === 0
          ? "Phân công tự động thành công"
          : "Phân công tự động một phần, vẫn còn ca thiếu nhân viên",
      created_count: createdCount,
      updated_count: updatedCount,
      remaining_missing_count: remaining.length,
      remaining_missing: remaining,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = ["23505", "23514"].includes(error.code);
    sendError(
      res,
      isConflict ? error.message : "Lỗi khi phân công tự động",
      isConflict ? 400 : 500,
      { error: error.message }
    );
  } finally {
    client.release();
  }
}

export async function resetAssignmentSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;

    await client.query("BEGIN");

    const affectedResult = await client.query(
      `
      SELECT DISTINCT employee_id
      FROM schedules
      WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
        AND status <> 'CANCELLED'
      `,
      [weekStart],
    );

    const result = await client.query(
      `
      UPDATE schedules
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
        AND status <> 'CANCELLED'
      `,
      [weekStart],
    );

    await recordActivityLog(client, {
      req,
      action: "RESET_ASSIGNMENT",
      entityType: "schedules",
      description: `Reset phân công tuần bắt đầu ${weekStart}`,
      metadata: {
        week_start: weekStart,
        updated_count: result.rowCount,
      },
    });

    if (affectedResult.rowCount > 0) {
      await createNotificationsForEmployeeIds(client, {
        employeeIds: affectedResult.rows.map((row) => Number(row.employee_id)),
        senderUserId: req.user.sub,
        title: "Lịch trực đã được reset",
        message: `Lịch trực tuần bắt đầu ${weekStart} đã được reset. Vui lòng kiểm tra lại lịch cá nhân.`,
        notificationType: "SCHEDULE_RESET",
        entityType: "schedules",
        linkTarget: "personal_schedule",
        metadata: {
          week_start: weekStart,
          updated_count: result.rowCount,
        },
      });
    }

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Reset phân công thành công",
      updated_count: result.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi reset phân công", 500, { error: error.message });
  } finally {
    client.release();
  }
}

function groupEmployeesByDepartment(rows) {
  const employeesByDepartment = new Map();

  rows.forEach((employee) => {
    const departmentId = Number(employee.department_id);
    const current = employeesByDepartment.get(departmentId) || [];
    current.push({
      ...employee,
      employee_id: Number(employee.employee_id),
      department_id: departmentId,
      room_id: employee.room_id ? Number(employee.room_id) : null,
    });
    employeesByDepartment.set(departmentId, current);
  });

  return employeesByDepartment;
}

function buildWeekScheduleIndexes(rows) {
  const busyKeys = new Set();
  const weeklyCounts = new Map();

  rows.forEach((schedule) => {
    const employeeId = Number(schedule.employee_id);
    busyKeys.add(`${employeeId}-${schedule.duty_date}-${schedule.shift_id}`);
    weeklyCounts.set(employeeId, (weeklyCounts.get(employeeId) || 0) + 1);
  });

  return { busyKeys, weeklyCounts };
}

function selectEmployeesForCell(cell, { employeesByDepartment, busyKeys, weeklyCounts, limit }) {
  return (employeesByDepartment.get(Number(cell.department_id)) || [])
    .filter((employee) => !busyKeys.has(`${employee.employee_id}-${cell.duty_date}-${cell.shift_id}`))
    .sort((left, right) => {
      const leftRoomMatch = left.room_id === Number(cell.room_id) ? 0 : 1;
      const rightRoomMatch = right.room_id === Number(cell.room_id) ? 0 : 1;
      return (
        leftRoomMatch - rightRoomMatch ||
        (weeklyCounts.get(left.employee_id) || 0) -
          (weeklyCounts.get(right.employee_id) || 0) ||
        left.full_name.localeCompare(right.full_name)
      );
    })
    .slice(0, limit);
}

function markEmployeeBusy(employee, cell, { busyKeys, weeklyCounts }) {
  busyKeys.add(`${employee.employee_id}-${cell.duty_date}-${cell.shift_id}`);
  weeklyCounts.set(employee.employee_id, (weeklyCounts.get(employee.employee_id) || 0) + 1);
}
