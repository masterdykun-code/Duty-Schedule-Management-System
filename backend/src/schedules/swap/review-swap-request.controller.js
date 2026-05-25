import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notifications/notification.service.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { reviewSwapRequest } from "./swap.service.js";

export async function reviewSwapRequestByHead(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "requestId khong hop le" });
    }

    const { approved, note } = req.body;
    if (typeof approved !== "boolean") {
      return res.status(400).json({ message: "Vui long chon duyet hoac tu choi" });
    }

    await client.query("BEGIN");

    const result = await reviewSwapRequest(client, {
      userId: req.user.sub,
      requestId,
      approved,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: result.error });
    }

    await recordActivityLog(client, {
      req,
      action: approved ? "APPROVE_SWAP_REQUEST" : "REJECT_SWAP_REQUEST",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      description: approved
        ? `Duyet yeu cau doi ca YC${String(result.request.request_id).padStart(3, "0")}`
        : `Tu choi yeu cau doi ca YC${String(result.request.request_id).padStart(3, "0")}`,
      metadata: {
        request_id: result.request.request_id,
        approved,
        status: result.request.status,
        note: note || null,
      },
    });

    await createNotificationsForEmployeeIds(client, {
      employeeIds: [result.context.requester_employee_id, result.context.target_employee_id],
      senderUserId: req.user.sub,
      title: approved ? "Yeu cau doi ca da duoc duyet" : "Yeu cau doi ca bi tu choi",
      message: approved
        ? `Yeu cau doi ca YC${String(result.request.request_id).padStart(3, "0")} da duoc duyet.`
        : `Yeu cau doi ca YC${String(result.request.request_id).padStart(3, "0")} da bi tu choi.`,
      notificationType: approved ? "SWAP_REQUEST_APPROVED" : "SWAP_REQUEST_REJECTED",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      linkTarget: "exchange_requests",
      metadata: {
        request_id: result.request.request_id,
        status: result.request.status,
      },
    });

    await client.query("COMMIT");

    res.json({
      message: approved ? "Da duyet yeu cau doi ca" : "Da tu choi yeu cau doi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi xu ly yeu cau doi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
