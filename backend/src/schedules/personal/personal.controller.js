import { pool } from "../../db.js";
import {
  employeeProfileForScheduleSelect,
  personalScheduleSelect,
  scheduleShiftsSelect,
} from "../schedule.queries.js";
import { addDaysIso, getRequestedWeekStart } from "../common/schedule-date.js";
import { mapProfile, mapSchedule, mapShift } from "../common/schedule.mappers.js";
import { expireOverdueSwapRequests } from "../swap/swap.service.js";

export async function getMySchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phải có định dạng YYYY-MM-DD",
      });
    }

    const profileResult = await pool.query(employeeProfileForScheduleSelect, [req.user.sub]);
    const profile = profileResult.rows[0];

    if (!profile) {
      return res.status(404).json({
        message: "Tài khoản này chưa liên kết với nhân viên y tế",
      });
    }

    await expireOverdueSwapRequests(pool);

    const [shiftResult, scheduleResult] = await Promise.all([
      pool.query(scheduleShiftsSelect),
      pool.query(personalScheduleSelect, [profile.employee_id, weekStart]),
    ]);

    res.json({
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      profile: mapProfile(profile),
      shifts: shiftResult.rows.map(mapShift),
      total: scheduleResult.rowCount,
      data: scheduleResult.rows.map(mapSchedule),
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy lịch trực cá nhân",
      error: error.message,
    });
  }
}
