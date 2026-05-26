import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notifications/notification.service.js";
import { getRequestedWeekStart } from "../common/schedule-date.js";

export async function resetAssignmentSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStart = getRequestedWeekStart(req.body.week_start || req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phải có định dạng YYYY-MM-DD",
      });
    }

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

    res.json({
      message: "Reset phân công thành công",
      updated_count: result.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Lỗi khi reset phân công",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
