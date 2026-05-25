import { pool } from "../../db.js";
import { getRequestedWeekStart } from "../common/schedule-date.js";

export async function resetAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.body.week_start || req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

    const result = await pool.query(
      `
      UPDATE schedules
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
        AND status <> 'CANCELLED'
      `,
      [weekStart],
    );

    res.json({
      message: "Reset phan cong thanh cong",
      updated_count: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi reset phan cong",
      error: error.message,
    });
  }
}
