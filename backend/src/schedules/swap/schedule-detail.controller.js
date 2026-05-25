import { pool } from "../../db.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { mapSchedule, mapShift } from "../common/schedule.mappers.js";
import {
  expireOverdueSwapRequests,
  getActiveShifts,
  getDepartmentRooms,
  getOwnedSchedule,
  getScheduleCoworkers,
} from "./swap.service.js";
import { mapCoworker, mapRoomOption } from "./swap.mappers.js";

export async function getScheduleDetail(req, res) {
  try {
    const scheduleId = parsePositiveId(req.params.scheduleId);
    if (!scheduleId) {
      return res.status(400).json({ message: "scheduleId khong hop le" });
    }

    await expireOverdueSwapRequests(pool);

    const schedule = await getOwnedSchedule(pool, req.user.sub, scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Khong tim thay ca truc" });
    }

    const [coworkers, rooms, shifts] = await Promise.all([
      getScheduleCoworkers(pool, schedule),
      getDepartmentRooms(pool, schedule.department_id),
      getActiveShifts(pool),
    ]);

    res.json({
      schedule: mapSchedule(schedule),
      coworkers: coworkers.map(mapCoworker),
      rooms: rooms.map(mapRoomOption),
      shifts: shifts.map(mapShift),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay chi tiet ca truc",
      error: error.message,
    });
  }
}
