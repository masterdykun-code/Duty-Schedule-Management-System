import { pool } from "../../db.js";
import {
  generalScheduleSelect,
  scheduleRoomsSelect,
  scheduleShiftsSelect,
} from "../schedule.queries.js";
import { addDaysIso, getRequestedWeekStart } from "../common/schedule-date.js";
import { mapGeneralSchedule, mapScheduleRoom, mapShift } from "../common/schedule.mappers.js";

export async function getGeneralSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phải có định dạng YYYY-MM-DD",
      });
    }

    const [roomsResult, shiftsResult, schedulesResult] = await Promise.all([
      pool.query(scheduleRoomsSelect),
      pool.query(scheduleShiftsSelect),
      pool.query(generalScheduleSelect, [weekStart]),
    ]);

    res.json({
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      rooms: roomsResult.rows.map(mapScheduleRoom),
      shifts: shiftsResult.rows.map(mapShift),
      total: schedulesResult.rowCount,
      data: schedulesResult.rows.map(mapGeneralSchedule),
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy lịch trực tổng quát",
      error: error.message,
    });
  }
}
