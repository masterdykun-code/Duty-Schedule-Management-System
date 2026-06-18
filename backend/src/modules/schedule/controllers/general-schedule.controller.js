import { pool } from "../../../db.js";
import { ScheduleRepository } from "../repositories/schedule.repository.js";
import { addDaysIso, getRequestedWeekStart } from "../../../utils/schedule-date.js";
import { mapGeneralSchedule, mapScheduleRoom, mapShift } from "../../../utils/schedule.mappers.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function getGeneralSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return sendError(res, "week_start phải có định dạng YYYY-MM-DD", 400);
    }

    const [rooms, shifts, schedules] = await Promise.all([
      ScheduleRepository.getRooms(pool),
      ScheduleRepository.getShifts(pool),
      ScheduleRepository.getGeneralSchedule(pool, weekStart),
    ]);

    sendSuccess(res, {
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      rooms: rooms.map(mapScheduleRoom),
      shifts: shifts.map(mapShift),
      total: schedules.length,
      data: schedules.map(mapGeneralSchedule),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy lịch trực tổng quát", 500, { error: error.message });
  }
}
