import { pool } from "../../db.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { createSwapRequest } from "./swap.service.js";

export async function sendSwapRequest(req, res) {
  const client = await pool.connect();

  try {
    const sourceScheduleId = parsePositiveId(req.body.source_schedule_id);
    const targetScheduleId = parsePositiveId(req.body.target_schedule_id);

    if (!sourceScheduleId || !targetScheduleId) {
      return res.status(400).json({
        message: "Vui long chon ca truc nguon va ca truc muon doi",
      });
    }

    await client.query("BEGIN");

    const result = await createSwapRequest(client, {
      userId: req.user.sub,
      sourceScheduleId,
      targetScheduleId,
      reason: req.body.reason,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: result.error });
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Gui yeu cau doi ca thanh cong",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = error.code === "23505";
    res.status(isConflict ? 400 : 500).json({
      message: isConflict ? "Ca truc nay dang co yeu cau doi ca cho xu ly" : "Loi khi gui yeu cau doi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
