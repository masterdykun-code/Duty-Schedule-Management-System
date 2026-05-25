import { pool } from "../../db.js";
import { getRequestedWeekStart } from "../common/schedule-date.js";
import { findMissingRequiredAssignments } from "./assignment.service.js";

export async function validateAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.body.week_start || req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

    const missing = await findMissingRequiredAssignments(pool, weekStart);

    res.json({
      complete: missing.length === 0,
      missing_count: missing.length,
      missing,
      message:
        missing.length === 0
          ? "Lich truc da duoc phan cong day du"
          : "Vui long phan cong day du cac ca truc bat buoc",
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi kiem tra lich truc",
      error: error.message,
    });
  }
}
