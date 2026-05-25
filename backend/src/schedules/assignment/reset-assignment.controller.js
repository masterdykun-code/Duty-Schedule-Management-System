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
        message: "week_start phai co dinh dang YYYY-MM-DD",
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
      description: `Reset phan cong tuan bat dau ${weekStart}`,
      metadata: {
        week_start: weekStart,
        updated_count: result.rowCount,
      },
    });

    if (affectedResult.rowCount > 0) {
      await createNotificationsForEmployeeIds(client, {
        employeeIds: affectedResult.rows.map((row) => Number(row.employee_id)),
        senderUserId: req.user.sub,
        title: "Lich truc da duoc reset",
        message: `Lich truc tuan bat dau ${weekStart} da duoc reset. Vui long kiem tra lai lich ca nhan.`,
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
      message: "Reset phan cong thanh cong",
      updated_count: result.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi reset phan cong",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
