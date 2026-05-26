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
      return res.status(400).json({ message: "Mã yêu cầu không hợp lệ" });
    }

    const { approved, note } = req.body;
    if (typeof approved !== "boolean") {
      return res.status(400).json({ message: "Vui lòng chọn duyệt hoặc từ chối" });
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
        ? `Duyệt yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")}`
        : `Từ chối yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")}`,
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
      title: approved ? "Yêu cầu đổi ca đã được duyệt" : "Yêu cầu đổi ca bị từ chối",
      message: approved
        ? `Yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")} đã được duyệt.`
        : `Yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")} đã bị từ chối.`,
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
      message: approved ? "Đã duyệt yêu cầu đổi ca" : "Đã từ chối yêu cầu đổi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Lỗi khi xử lý yêu cầu đổi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
