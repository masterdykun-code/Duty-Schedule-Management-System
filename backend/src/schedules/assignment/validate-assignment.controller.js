import { pool } from "../../db.js";
import { getRequestedWeekStart } from "../common/schedule-date.js";
import { findMissingRequiredAssignments } from "./assignment.service.js";

export async function validateAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.body.week_start || req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phải có định dạng YYYY-MM-DD",
      });
    }

    const missing = await findMissingRequiredAssignments(pool, weekStart);

    res.json({
      complete: missing.length === 0,
      missing_count: missing.length,
      missing,
      message:
        missing.length === 0
          ? "Lịch trực đã được phân công đầy đủ"
          : "Vui lòng phân công đầy đủ các ca trực bắt buộc",
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi kiểm tra lịch trực",
      error: error.message,
    });
  }
}
