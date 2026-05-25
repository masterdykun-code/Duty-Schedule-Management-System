import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notifications/notification.service.js";
import { getRequestedWeekStart } from "../common/schedule-date.js";
import { findMissingRequiredAssignments, upsertAssignedSchedule } from "./assignment.service.js";

export async function autoAssignSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStart = getRequestedWeekStart(req.body.week_start || req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

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
      description: `Phan cong tu dong tuan bat dau ${weekStart}`,
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
        title: "Lich truc tuan moi",
        message: `Ban co lich truc moi trong tuan bat dau ${weekStart}.`,
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

    res.json({
      message:
        remaining.length === 0
          ? "Phan cong tu dong thanh cong"
          : "Phan cong tu dong mot phan, van con ca thieu nhan vien",
      created_count: createdCount,
      updated_count: updatedCount,
      remaining_missing_count: remaining.length,
      remaining_missing: remaining,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = ["23505", "23514"].includes(error.code);
    res.status(isConflict ? 400 : 500).json({
      message: isConflict ? error.message : "Loi khi phan cong tu dong",
      error: error.message,
    });
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
