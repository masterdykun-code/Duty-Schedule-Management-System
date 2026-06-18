import { isValidIsoDate } from "../../../utils/schedule-date.js";
import { SwapRepository } from "../repositories/swap.repository.js";

const pendingSwapStatuses = ["PENDING_RESPONSE", "PENDING_APPROVAL"];
const responsePendingStatus = "PENDING_RESPONSE";
const approvalPendingStatus = "PENDING_APPROVAL";

export async function getEmployeeProfileByUser(client, userId) {
  return SwapRepository.getEmployeeProfileByUser(client, userId);
}

export async function getOwnedSchedule(client, userId, scheduleId) {
  return SwapRepository.getOwnedSchedule(client, userId, scheduleId);
}

export async function getScheduleCoworkers(client, schedule) {
  return SwapRepository.getScheduleCoworkers(client, schedule);
}

export async function getDepartmentRooms(client, departmentId) {
  return SwapRepository.getDepartmentRooms(client, departmentId);
}

export async function getActiveShifts(client) {
  return SwapRepository.getActiveShifts(client);
}

export async function getSwapCandidates(client, {
  userId,
  sourceScheduleId,
  dutyDate,
  roomId,
  shiftId,
}) {
  if (!isValidIsoDate(dutyDate) || !roomId || !shiftId) {
    return { error: "Vui lòng chọn ngày, phòng và ca muốn đổi" };
  }

  await SwapRepository.expireOverdueSwapRequests(client);

  const source = await SwapRepository.getOwnedSchedule(client, userId, sourceScheduleId);
  if (!source) {
    return { error: "Không tìm thấy ca trực nguồn" };
  }

  const deadlineResult = await canRequestBeforeDutyDate(client, source.schedule_id);
  if (!deadlineResult.allowed) {
    return { error: deadlineResult.message };
  }

  const candidates = await SwapRepository.getSwapCandidates(client, {
    departmentId: source.department_id,
    roomId,
    shiftId,
    dutyDate,
    sourceScheduleId: source.schedule_id,
    sourceEmployeeId: source.employee_id,
  });

  const validCandidates = [];
  for (const target of candidates) {
    const validation = await validateSwapPair(client, {
      userId,
      sourceScheduleId,
      targetScheduleId: target.target_schedule_id,
    });

    if (validation.valid) {
      validCandidates.push(target);
    }
  }

  return { source, candidates: validCandidates };
}

export async function validateSwapPair(client, { userId, sourceScheduleId, targetScheduleId }) {
  const source = await SwapRepository.getOwnedSchedule(client, userId, sourceScheduleId);
  if (!source) {
    return { valid: false, message: "Không tìm thấy ca trực nguồn" };
  }

  const target = await SwapRepository.getScheduleForValidation(client, targetScheduleId);
  if (!target) {
    return { valid: false, message: "Không tìm thấy ca trực muốn đổi" };
  }

  if (Number(source.schedule_id) === Number(target.schedule_id)) {
    return { valid: false, message: "Không thể đổi với chính ca trực này" };
  }

  if (Number(source.employee_id) === Number(target.employee_id)) {
    return { valid: false, message: "Không thể gửi yêu cầu đổi ca cho chính mình" };
  }

  if (Number(source.department_id) !== Number(target.department_id)) {
    return { valid: false, message: "Chỉ có thể đổi ca với nhân viên cùng khoa" };
  }

  const hasPending = await SwapRepository.checkPendingRequestsExist(client, [source.schedule_id, target.schedule_id]);
  if (hasPending) {
    return { valid: false, message: "Ca trực này đang có yêu cầu đổi ca chờ xử lý" };
  }

  const requesterConflict = await SwapRepository.hasScheduleConflict(client, {
    employeeId: source.employee_id,
    dutyDate: target.duty_date,
    shiftId: target.shift_id,
    ignoredScheduleId: source.schedule_id,
  });

  if (requesterConflict) {
    return { valid: false, message: "Bạn đã có lịch trực trùng với ca muốn đổi" };
  }

  const targetConflict = await SwapRepository.hasScheduleConflict(client, {
    employeeId: target.employee_id,
    dutyDate: source.duty_date,
    shiftId: source.shift_id,
    ignoredScheduleId: target.schedule_id,
  });

  if (targetConflict) {
    return { valid: false, message: "Nhân viên được chọn sẽ bị trùng ca nếu đổi" };
  }

  return { valid: true, source, target };
}

export async function createSwapRequest(client, {
  userId,
  sourceScheduleId,
  targetScheduleId,
  reason,
}) {
  await SwapRepository.expireOverdueSwapRequests(client);

  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (!cleanReason) {
    return { error: "Vui lòng nhập lý do đổi ca" };
  }

  const validation = await validateSwapPair(client, {
    userId,
    sourceScheduleId,
    targetScheduleId,
  });

  if (!validation.valid) {
    return { error: validation.message };
  }

  const deadlineResult = await canRequestBeforeDutyDate(client, validation.source.schedule_id);
  if (!deadlineResult.allowed) {
    return { error: deadlineResult.message };
  }

  const request = await SwapRepository.insertSwapRequest(client, {
    sourceScheduleId: validation.source.schedule_id,
    requesterEmployeeId: validation.source.employee_id,
    targetEmployeeId: validation.target.employee_id,
    targetScheduleId: validation.target.schedule_id,
    reason: cleanReason,
  });

  return {
    request,
    context: {
      source: validation.source,
      target: validation.target,
    },
  };
}

export async function listSwapRequests(client, user) {
  const profile = await SwapRepository.getEmployeeProfileByUser(client, user.sub);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  const expiredCount = await SwapRepository.expireOverdueSwapRequests(client);

  const role = user.role;
  const isHead = role === "DEPARTMENT_HEAD";

  const requests = await SwapRepository.listSwapRequests(client, {
    employeeId: profile.employee_id,
    isHead,
    departmentId: profile.department_id,
  });

  return {
    expiredCount,
    requests: requests.map((row) => ({
      ...row,
      can_respond:
        Number(row.target_employee_id) === Number(profile.employee_id) &&
        row.status === responsePendingStatus,
      can_approve:
        isHead &&
        Number(row.source_department_id) === Number(profile.department_id) &&
        row.status === approvalPendingStatus,
    })),
  };
}

export async function respondToSwapRequest(client, {
  user,
  requestId,
  accepted,
  note,
}) {
  const profile = await SwapRepository.getEmployeeProfileByUser(client, user.sub);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  await SwapRepository.expireOverdueSwapRequests(client);

  const request = await SwapRepository.getSwapRequestForUpdate(client, requestId);
  if (!request) {
    return { error: "Không tìm thấy yêu cầu đổi ca" };
  }

  if (request.status === "EXPIRED") {
    return { error: "Yêu cầu đổi ca đã hết hạn" };
  }

  if (request.status !== responsePendingStatus) {
    return { error: "Yêu cầu này không còn chờ phản hồi" };
  }

  if (Number(request.target_employee_id) !== Number(profile.employee_id)) {
    return { error: "Bạn không phải người được yêu cầu đổi ca" };
  }

  const cleanNote = typeof note === "string" && note.trim() ? note.trim() : null;

  if (!accepted) {
    const requestResult = await SwapRepository.rejectSwapRequest(client, requestId, cleanNote, false);
    return { request: requestResult, context: request };
  }

  const validation = await validateSwapPairBySchedules(client, {
    sourceScheduleId: request.source_schedule_id,
    targetScheduleId: request.target_schedule_id,
  });

  if (!validation.valid) {
    return { error: validation.message };
  }

  if (request.requester_role === "DEPARTMENT_HEAD") {
    await SwapRepository.applyScheduleSwap(client, validation.pair);

    const requestResult = await SwapRepository.updateSwapRequestStatus(client, requestId, "APPROVED", {
      responseNote: cleanNote,
      approvedByEmployeeId: request.requester_employee_id,
      respondedAt: new Date(),
      approvedAt: new Date(),
    });

    return { request: requestResult, context: request };
  }

  const requestResult = await SwapRepository.updateSwapRequestStatus(client, requestId, "PENDING_APPROVAL", {
    responseNote: cleanNote,
    respondedAt: new Date(),
  });

  return { request: requestResult, context: request };
}

export async function reviewSwapRequest(client, {
  userId,
  requestId,
  approved,
  note,
}) {
  const profile = await SwapRepository.getEmployeeProfileByUser(client, userId);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  await SwapRepository.expireOverdueSwapRequests(client);

  const request = await SwapRepository.getSwapRequestForUpdate(client, requestId);
  if (!request) {
    return { error: "Không tìm thấy yêu cầu đổi ca" };
  }

  if (request.status === "EXPIRED") {
    return { error: "Yêu cầu đổi ca đã hết hạn" };
  }

  if (request.status !== approvalPendingStatus) {
    return { error: "Yêu cầu này không còn chờ trưởng khoa xử lý" };
  }

  if (Number(request.source_department_id) !== Number(profile.department_id)) {
    return { error: "Bạn chỉ được xử lý yêu cầu trong khoa của mình" };
  }

  const cleanNote = typeof note === "string" && note.trim() ? note.trim() : null;

  if (!approved) {
    const requestResult = await SwapRepository.rejectSwapRequest(client, requestId, cleanNote, true, profile.employee_id);
    return { request: requestResult, context: request };
  }

  const validation = await validateSwapPairBySchedules(client, {
    sourceScheduleId: request.source_schedule_id,
    targetScheduleId: request.target_schedule_id,
  });

  if (!validation.valid) {
    return { error: validation.message };
  }

  await SwapRepository.applyScheduleSwap(client, validation.pair);

  const requestResult = await SwapRepository.updateSwapRequestStatus(client, requestId, "APPROVED", {
    approvalNote: cleanNote,
    approvedByEmployeeId: profile.employee_id,
    approvedAt: new Date(),
  });

  return { request: requestResult, context: request };
}

export async function expireOverdueSwapRequests(client) {
  return SwapRepository.expireOverdueSwapRequests(client);
}

async function canRequestBeforeDutyDate(client, sourceScheduleId) {
  const allowed = await SwapRepository.canRequestBeforeDutyDate(client, sourceScheduleId);
  if (!allowed) {
    return {
      allowed: false,
      message: "Yêu cầu đổi ca phải được gửi trước ngày trực ít nhất 1 ngày",
    };
  }
  return { allowed: true };
}

async function validateSwapPairBySchedules(client, { sourceScheduleId, targetScheduleId }) {
  const pair = await SwapRepository.getSwapPairBySchedules(client, sourceScheduleId, targetScheduleId);
  if (!pair) {
    return { valid: false, message: "Không tìm thấy ca trực cần đổi" };
  }

  if (Number(pair.source_employee_id) === Number(pair.target_employee_id)) {
    return { valid: false, message: "Không thể đổi ca với chính mình" };
  }

  if (Number(pair.source_department_id) !== Number(pair.target_department_id)) {
    return { valid: false, message: "Chỉ có thể đổi ca với nhân viên cùng khoa" };
  }

  const sameSlot =
    pair.source_duty_date === pair.target_duty_date &&
    Number(pair.source_shift_id) === Number(pair.target_shift_id);

  if (sameSlot && Number(pair.source_room_id) === Number(pair.target_room_id)) {
    return { valid: false, message: "Hai nhân viên đã trực cùng phòng và cùng ca" };
  }

  const requesterConflict = await SwapRepository.hasScheduleConflict(client, {
    employeeId: pair.source_employee_id,
    dutyDate: pair.target_duty_date,
    shiftId: pair.target_shift_id,
    ignoredScheduleId: pair.source_schedule_id,
  });

  if (!sameSlot && requesterConflict) {
    return { valid: false, message: "Người gửi đã có lịch trực trùng với ca muốn đổi" };
  }

  const targetConflict = await SwapRepository.hasScheduleConflict(client, {
    employeeId: pair.target_employee_id,
    dutyDate: pair.source_duty_date,
    shiftId: pair.source_shift_id,
    ignoredScheduleId: pair.target_schedule_id,
  });

  if (!sameSlot && targetConflict) {
    return { valid: false, message: "Người được yêu cầu sẽ bị trùng ca nếu đổi" };
  }

  return { valid: true, pair };
}
