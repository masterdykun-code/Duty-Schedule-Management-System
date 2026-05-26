import { pool } from "../../db.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { getSwapCandidates } from "./swap.service.js";
import { mapSwapCandidate } from "./swap.mappers.js";

export async function getSwapOptions(req, res) {
  try {
    const sourceScheduleId = parsePositiveId(req.query.source_schedule_id);
    const roomId = parsePositiveId(req.query.room_id);
    const shiftId = parsePositiveId(req.query.shift_id);

    if (!sourceScheduleId) {
      return res.status(400).json({ message: "Mã ca trực nguồn không hợp lệ" });
    }

    const result = await getSwapCandidates(pool, {
      userId: req.user.sub,
      sourceScheduleId,
      dutyDate: req.query.duty_date,
      roomId,
      shiftId,
    });

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      data: result.candidates.map(mapSwapCandidate),
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách nhân viên co the doi ca",
      error: error.message,
    });
  }
}
