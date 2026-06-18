import { pool } from "../../../db.js";
import { recordActivityLog } from "../../activity/services/activity.service.js";
import {
  createNotificationsForDepartmentHeads,
  createNotificationsForEmployeeIds,
} from "../../notification/services/notification.service.js";
import { parsePositiveId } from "../../../utils/schedule-ids.js";
import { mapSchedule, mapShift } from "../../../utils/schedule.mappers.js";
import { mapCoworker, mapRoomOption, mapSwapCandidate, mapSwapRequest } from "../../../utils/swap.mappers.js";
import {
  expireOverdueSwapRequests,
  getActiveShifts,
  getDepartmentRooms,
  getOwnedSchedule,
  getScheduleCoworkers,
  getSwapCandidates,
  createSwapRequest,
  listSwapRequests,
  respondToSwapRequest,
  reviewSwapRequest,
} from "../services/swap.service.js";
import {
  validateCreateSwapDTO,
  validateRespondSwapDTO,
  validateReviewSwapDTO,
} from "../../schedule/dtos/schedule.dto.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function getScheduleDetail(req, res) {
  try {
    const scheduleId = parsePositiveId(req.params.scheduleId);
    if (!scheduleId) {
      return sendError(res, "Mã ca trực không hợp lệ", 400);
    }

    await expireOverdueSwapRequests(pool);

    const schedule = await getOwnedSchedule(pool, req.user.sub, scheduleId);
    if (!schedule) {
      return sendError(res, "Không tìm thấy ca trực", 404);
    }

    const [coworkers, rooms, shifts] = await Promise.all([
      getScheduleCoworkers(pool, schedule),
      getDepartmentRooms(pool, schedule.department_id),
      getActiveShifts(pool),
    ]);

    sendSuccess(res, {
      schedule: mapSchedule(schedule),
      coworkers: coworkers.map(mapCoworker),
      rooms: rooms.map(mapRoomOption),
      shifts: shifts.map(mapShift),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy chi tiết ca trực", 500, { error: error.message });
  }
}

export async function getSwapOptions(req, res) {
  try {
    const sourceScheduleId = parsePositiveId(req.query.source_schedule_id);
    const roomId = parsePositiveId(req.query.room_id);
    const shiftId = parsePositiveId(req.query.shift_id);

    if (!sourceScheduleId) {
      return sendError(res, "Mã ca trực nguồn không hợp lệ", 400);
    }

    const result = await getSwapCandidates(pool, {
      userId: req.user.sub,
      sourceScheduleId,
      dutyDate: req.query.duty_date,
      roomId,
      shiftId,
    });

    if (result.error) {
      return sendError(res, result.error, 400);
    }

    sendSuccess(res, {
      data: result.candidates.map(mapSwapCandidate),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách nhân viên có thể đổi ca", 500, { error: error.message });
  }
}

export async function getSwapRequests(req, res) {
  try {
    const result = await listSwapRequests(pool, req.user);

    if (result.error) {
      return sendError(res, result.error, 400);
    }

    sendSuccess(res, {
      expired_count: result.expiredCount,
      data: result.requests.map(mapSwapRequest),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách yêu cầu đổi ca", 500, { error: error.message });
  }
}

export async function sendSwapRequest(req, res) {
  const client = await pool.connect();

  try {
    const dto = validateCreateSwapDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { sourceScheduleId, targetScheduleId, reason } = dto.data;

    await client.query("BEGIN");

    const result = await createSwapRequest(client, {
      userId: req.user.sub,
      sourceScheduleId,
      targetScheduleId,
      reason,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return sendError(res, result.error, 400);
    }

    await recordActivityLog(client, {
      req,
      action: "CREATE_SWAP_REQUEST",
      entityType: "swap_requests",
      entityId: result.request.request_id,
      description: `Gửi yêu cầu đổi ca YC${String(result.request.request_id).padStart(3, "0")}`,
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
      title: "Yêu cầu đổi ca mới",
      message: `${result.context.source.full_name} gửi yêu cầu đổi ca với bạn.`,
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

    sendSuccess(res, {
      message: "Gửi yêu cầu đổi ca thành công",
      request_id: result.request.request_id,
      status: result.request.status,
    }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = error.code === "23505";
    sendError(
      res,
      isConflict ? "Ca trực này đang có yêu cầu đổi ca chờ xử lý" : "Lỗi khi gửi yêu cầu đổi ca",
      isConflict ? 400 : 500,
      { error: error.message }
    );
  } finally {
    client.release();
  }
}

export async function respondSwapRequest(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return sendError(res, "Mã yêu cầu không hợp lệ", 400);
    }

    const dto = validateRespondSwapDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { accepted, note } = dto.data;

    await client.query("BEGIN");

    const result = await respondToSwapRequest(client, {
      user: req.user,
      requestId,
      accepted,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return sendError(res, result.error, 400);
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

    sendSuccess(res, {
      message: accepted ? "Đã phản hồi đồng ý yêu cầu đổi ca" : "Đã từ chối yêu cầu đổi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi phản hồi yêu cầu đổi ca", 500, { error: error.message });
  } finally {
    client.release();
  }
}

export async function reviewSwapRequestByHead(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return sendError(res, "Mã yêu cầu không hợp lệ", 400);
    }

    const dto = validateReviewSwapDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { approved, note } = dto.data;

    await client.query("BEGIN");

    const result = await reviewSwapRequest(client, {
      userId: req.user.sub,
      requestId,
      approved,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return sendError(res, result.error, 400);
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

    sendSuccess(res, {
      message: approved ? "Đã duyệt yêu cầu đổi ca" : "Đã từ chối yêu cầu đổi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi xử lý yêu cầu đổi ca", 500, { error: error.message });
  } finally {
    client.release();
  }
}
