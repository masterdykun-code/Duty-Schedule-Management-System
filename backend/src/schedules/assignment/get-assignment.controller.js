import { getRequestedWeekStart } from "../common/schedule-date.js";
import { getAssignmentPayload } from "./assignment.service.js";

export async function getAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

    res.json(await getAssignmentPayload(weekStart));
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay du lieu phan cong lich truc",
      error: error.message,
    });
  }
}
