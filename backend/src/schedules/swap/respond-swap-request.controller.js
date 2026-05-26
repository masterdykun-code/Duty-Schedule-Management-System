import { pool } from "../../db.js";
import { recordActivityLog } from "../../activity/activity.service.js";
import {
  createNotificationsForDepartmentHeads,
  createNotificationsForEmployeeIds,
} from "../../notifications/notification.service.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { respondToSwapRequest } from "./swap.service.js";

export async function respondSwapRequest(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "Mã yêu cầu không hợp lệ" });
    }

    const { accepted, note } = req.body;
    if (typeof accepted !== "boolean") {
      return res.status(400).json({ message: "Vui lòng chọn đồng ý hoặc từ chối" });
    }

    await client.query("BEGIN");

    const result = await respondToSwapRequest(client, {
      user: req.user,
      requestId,
      accepted,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: result.error });
    }

    await recordActivityLog(client, {
      req,
      action: accepted ? "RESPOND_SWAP_REQUEST" : "REJECT_SWAP_REQUEST",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      description: accepted
        ? `Đồng ý yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")}`
        : `Từ chối yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")}`,
      metadata: {
        request_id: result.request.request_id,
        accepted,
        status: result.request.status,
        note: note || null,
      },
    });

    await createNotificationsForEmployeeIds(client, {
      employeeIds: [result.context.requester_employee_id],
      senderUserId: req.user.sub,
      title: accepted ? "Yêu cầu đổi ca đã được phản hồi" : "Yêu cầu đổi ca bị từ chối",
      message: accepted
        ? `Yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")} đã được đồng ý.`
        : `Yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")} đã bị từ chối.`,
      notificationType: accepted
        ? (result.request.status === "APPROVED" ? "SWAP_REQUEST_APPROVED" : "SWAP_REQUEST_RESPONDED")
        : "SWAP_REQUEST_REJECTED",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      linkTarget: "exchange_requests",
      metadata: {
        request_id: result.request.request_id,
        status: result.request.status,
      },
    });

    if (accepted && result.request.status === "PENDING_APPROVAL") {
      await createNotificationsForDepartmentHeads(client, {
        departmentId: result.context.source_department_id,
        senderUserId: req.user.sub,
        title: "Yêu cầu đổi ca chờ duyệt",
        message: `Có yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")} cần trưởng khoa xử lý.`,
        notificationType: "SWAP_REQUEST_RESPONDED",
        entityType: "swap_requests",
        entityId: result.request.request_id,
        linkTarget: "exchange_requests",
        metadata: {
          request_id: result.request.request_id,
          status: result.request.status,
        },
      });
    }

    await client.query("COMMIT");

    res.json({
      message: accepted ? "Đã phản hồi đồng ý yêu cầu đổi ca" : "Đã từ chối yêu cầu đổi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Lỗi khi phản hồi yêu cầu đổi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
