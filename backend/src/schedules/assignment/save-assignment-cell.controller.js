import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notifications/notification.service.js";
import { isValidIsoDate } from "../common/schedule-date.js";
import { parsePositiveId, uniquePositiveIds } from "../common/schedule-ids.js";
import { getAssignmentCellContext, upsertAssignedSchedule } from "./assignment.service.js";

export async function saveAssignmentCell(req, res) {
  const client = await pool.connect();

  try {
    const dutyDate = req.body.duty_date;
    const roomId = parsePositiveId(req.body.room_id);
    const shiftId = parsePositiveId(req.body.shift_id);
    const employeeIds = uniquePositiveIds(req.body.employee_ids);
    const note = typeof req.body.note === "string" && req.body.note.trim()
      ? req.body.note.trim()
      : null;

    if (!isValidIsoDate(dutyDate) || !roomId || !shiftId || !employeeIds) {
      return res.status(400).json({
        message: "Du lieu phan cong khong hop le",
      });
    }

    await client.query("BEGIN");

    const context = await getAssignmentCellContext(client, roomId, shiftId);
    if (!context) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Ca truc nay khong ap dung cho phong/khoa da chon",
      });
    }

    if (employeeIds.length > context.max_staff) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Chi duoc phan cong toi da ${context.max_staff} nguoi cho ca nay`,
      });
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
        return res.status(400).json({
          message: "Nhan vien duoc chon khong hop le hoac khong thuoc khoa nay",
        });
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
        return res.status(400).json({
          message: `${busyResult.rows[0].full_name} da duoc phan cong ca nay tai phong ${busyResult.rows[0].room_code}`,
        });
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
      description: `Phan cong thu cong ngay ${dutyDate}, phong ${context.room_code}, ca ${context.shift_code}`,
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
        title: "Lich truc moi",
        message: `Ban co lich truc ${context.shift_name} ngay ${dutyDate} tai phong ${context.room_code}.`,
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
        title: "Lich truc da thay doi",
        message: `Ca truc ${context.shift_name} ngay ${dutyDate} tai phong ${context.room_code} da duoc cap nhat.`,
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

    res.json({
      message: "Luu phan cong thanh cong",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = ["23505", "23514"].includes(error.code);
    res.status(isConflict ? 400 : 500).json({
      message: isConflict ? error.message : "Loi khi luu phan cong",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
