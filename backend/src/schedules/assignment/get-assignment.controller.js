import { getRequestedWeekStart } from "../common/schedule-date.js";
import { getAssignmentPayload } from "./assignment.service.js";

export async function getAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phải có định dạng YYYY-MM-DD",
      });
    }

    res.json(await getAssignmentPayload(weekStart));
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy dữ liệu phan cong lich truc",
      error: error.message,
    });
  }
}
