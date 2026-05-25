import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notifications/notification.service.js";
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

    await recordActivityLog(client, {
      req,
      action: "CREATE_SWAP_REQUEST",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      description: `Gui yeu cau doi ca YC${String(result.request.request_id).padStart(3, "0")}`,
      metadata: {
        request_id: result.request.request_id,
        source_schedule_id: sourceScheduleId,
        target_schedule_id: targetScheduleId,
        status: result.request.status,
      },
    });

    await createNotificationsForEmployeeIds(client, {
      employeeIds: [result.context.target.employee_id],
      senderUserId: req.user.sub,
      title: "Yeu cau doi ca moi",
      message: `${result.context.source.full_name} gui yeu cau doi ca voi ban.`,
      notificationType: "SWAP_REQUEST_CREATED",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      linkTarget: "exchange_requests",
      metadata: {
        request_id: result.request.request_id,
        source_schedule_id: sourceScheduleId,
        target_schedule_id: targetScheduleId,
        status: result.request.status,
      },
    });

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
