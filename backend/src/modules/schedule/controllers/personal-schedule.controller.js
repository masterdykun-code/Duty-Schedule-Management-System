import { pool } from "../../../db.js";
import { ScheduleRepository } from "../repositories/schedule.repository.js";
import { addDaysIso, getRequestedWeekStart } from "../../../utils/schedule-date.js";
import { mapProfile, mapSchedule, mapShift } from "../../../utils/schedule.mappers.js";
import { expireOverdueSwapRequests } from "../../swap/services/swap.service.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function getMySchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return sendError(res, "week_start phải có định dạng YYYY-MM-DD", 400);
    }

    const profile = await ScheduleRepository.getEmployeeProfile(pool, req.user.sub);

    if (!profile) {
      return sendError(res, "Tài khoản này chưa liên kết với nhân viên y tế", 404);
    }

    await expireOverdueSwapRequests(pool);

    const [shifts, schedules] = await Promise.all([
      ScheduleRepository.getShifts(pool),
      ScheduleRepository.getPersonalSchedule(pool, profile.employee_id, weekStart),
    ]);

    sendSuccess(res, {
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      profile: mapProfile(profile),
      shifts: shifts.map(mapShift),
      total: schedules.length,
      data: schedules.map(mapSchedule),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy lịch trực cá nhân", 500, { error: error.message });
  }
}
