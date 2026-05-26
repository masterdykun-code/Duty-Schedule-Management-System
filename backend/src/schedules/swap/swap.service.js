import { isValidIsoDate } from "../common/schedule-date.js";

const pendingSwapStatuses = ["PENDING_RESPONSE", "PENDING_APPROVAL"];
const responsePendingStatus = "PENDING_RESPONSE";
const approvalPendingStatus = "PENDING_APPROVAL";

export async function getEmployeeProfileByUser(client, userId) {
  const result = await client.query(
    `
    SELECT
      e.employee_id,
      e.employee_code,
      e.full_name,
      e.department_id,
      d.department_code,
      d.department_name
    FROM employees e
    JOIN departments d ON d.department_id = e.department_id
    WHERE e.user_id = $1
      AND e.status = 'ACTIVE'
    LIMIT 1
    `,
    [userId],
  );

  return result.rows[0];
}

export async function getOwnedSchedule(client, userId, scheduleId) {
  const result = await client.query(
    `
    SELECT
      s.schedule_id,
      to_char(s.duty_date, 'YYYY-MM-DD') AS duty_date,
      s.status,
      s.note,
      d.department_id,
      d.department_code,
      d.department_name,
      r.room_id,
      r.room_code,
      r.room_name,
      sh.shift_id,
      sh.shift_code,
      sh.shift_name,
      to_char(sh.start_time, 'HH24:MI') AS start_time,
      to_char(sh.end_time, 'HH24:MI') AS end_time,
      sh.shift_type,
      s.employee_id,
      e.employee_code,
      e.full_name,
      e.position,
      assigned_by.username AS assigned_by_username,
      active_swap.status AS swap_request_status
    FROM schedules s
    JOIN employees e ON e.employee_id = s.employee_id
    JOIN departments d ON d.department_id = s.department_id
    JOIN rooms r ON r.room_id = s.room_id
    JOIN shifts sh ON sh.shift_id = s.shift_id
    LEFT JOIN users assigned_by ON assigned_by.user_id = s.assigned_by_user_id
    LEFT JOIN LATERAL (
      SELECT sr.status
      FROM swap_requests sr
      WHERE sr.source_schedule_id = s.schedule_id
        AND sr.status = ANY($3::varchar[])
      ORDER BY sr.requested_at DESC
      LIMIT 1
    ) active_swap ON true
    WHERE s.schedule_id = $1
      AND e.user_id = $2
      AND s.status <> 'CANCELLED'
    LIMIT 1
    `,
    [scheduleId, userId, pendingSwapStatuses],
  );

  return result.rows[0];
}

export async function getScheduleCoworkers(client, schedule) {
  const result = await client.query(
    `
    SELECT
      s.schedule_id,
      e.employee_id,
      e.employee_code,
      e.full_name,
      e.position,
      s.note
    FROM schedules s
    JOIN employees e ON e.employee_id = s.employee_id
    WHERE s.department_id = $1
      AND s.room_id = $2
      AND s.shift_id = $3
      AND s.duty_date = $4::date
      AND s.status <> 'CANCELLED'
    ORDER BY e.position ASC, e.full_name ASC
    `,
    [schedule.department_id, schedule.room_id, schedule.shift_id, schedule.duty_date],
  );

  return result.rows;
}

export async function getDepartmentRooms(client, departmentId) {
  const result = await client.query(
    `
    SELECT
      department_id,
      room_id,
      room_code,
      room_name
    FROM rooms
    WHERE department_id = $1
      AND status = 'ACTIVE'
    ORDER BY room_code ASC
    `,
    [departmentId],
  );

  return result.rows;
}

export async function getActiveShifts(client) {
  const result = await client.query(
    `
    SELECT
      shift_id,
      shift_code,
      shift_name,
      to_char(start_time, 'HH24:MI') AS start_time,
      to_char(end_time, 'HH24:MI') AS end_time,
      shift_type
    FROM shifts
    WHERE status = 'ACTIVE'
    ORDER BY start_time ASC, shift_id ASC
    `,
  );

  return result.rows;
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

  await expireOverdueSwapRequests(client);

  const source = await getOwnedSchedule(client, userId, sourceScheduleId);
  if (!source) {
    return { error: "Không tìm thấy ca trực nguon" };
  }

  const deadlineResult = await canRequestBeforeDutyDate(client, source.schedule_id);
  if (!deadlineResult.allowed) {
    return { error: deadlineResult.message };
  }

  const result = await client.query(
    `
    SELECT
      target.schedule_id AS target_schedule_id,
      to_char(target.duty_date, 'YYYY-MM-DD') AS duty_date,
      target.note,
      e.employee_id,
      e.employee_code,
      e.full_name,
      e.position,
      r.room_id,
      r.room_code,
      r.room_name,
      sh.shift_id,
      sh.shift_code,
      sh.shift_name,
      to_char(sh.start_time, 'HH24:MI') AS start_time,
      to_char(sh.end_time, 'HH24:MI') AS end_time,
      sh.shift_type
    FROM schedules target
    JOIN employees e ON e.employee_id = target.employee_id
    JOIN rooms r ON r.room_id = target.room_id
    JOIN shifts sh ON sh.shift_id = target.shift_id
    WHERE target.department_id = $1
      AND target.room_id = $2
      AND target.shift_id = $3
      AND target.duty_date = $4::date
      AND target.status <> 'CANCELLED'
      AND target.schedule_id <> $5
      AND target.employee_id <> $6
      AND e.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1
        FROM swap_requests sr
        WHERE sr.source_schedule_id = target.schedule_id
          AND sr.status = ANY($7::varchar[])
      )
    ORDER BY e.position ASC, e.full_name ASC
    `,
    [
      source.department_id,
      roomId,
      shiftId,
      dutyDate,
      source.schedule_id,
      source.employee_id,
      pendingSwapStatuses,
    ],
  );

  const candidates = [];
  for (const target of result.rows) {
    const validation = await validateSwapPair(client, {
      userId,
      sourceScheduleId,
      targetScheduleId: target.target_schedule_id,
    });

    if (validation.valid) {
      candidates.push(target);
    }
  }

  return { source, candidates };
}

export async function validateSwapPair(client, { userId, sourceScheduleId, targetScheduleId }) {
  const source = await getOwnedSchedule(client, userId, sourceScheduleId);
  if (!source) {
    return { valid: false, message: "Không tìm thấy ca trực nguon" };
  }

  const targetResult = await client.query(
    `
    SELECT
      s.schedule_id,
      to_char(s.duty_date, 'YYYY-MM-DD') AS duty_date,
      s.employee_id,
      s.department_id,
      s.room_id,
      s.shift_id,
      e.full_name,
      e.employee_code
    FROM schedules s
    JOIN employees e ON e.employee_id = s.employee_id
    WHERE s.schedule_id = $1
      AND s.status <> 'CANCELLED'
      AND e.status = 'ACTIVE'
    LIMIT 1
    `,
    [targetScheduleId],
  );
  const target = targetResult.rows[0];

  if (!target) {
    return { valid: false, message: "Không tìm thấy ca trực muon doi" };
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

  const pendingResult = await client.query(
    `
    SELECT request_id
    FROM swap_requests
    WHERE (
        source_schedule_id = ANY($1::bigint[])
        OR target_schedule_id = ANY($1::bigint[])
      )
      AND status = ANY($2::varchar[])
    LIMIT 1
    `,
    [[source.schedule_id, target.schedule_id], pendingSwapStatuses],
  );

  if (pendingResult.rowCount > 0) {
    return { valid: false, message: "Ca trực này đang có yêu cầu đổi ca chờ xử lý" };
  }

  const requesterConflict = await hasScheduleConflict(client, {
    employeeId: source.employee_id,
    dutyDate: target.duty_date,
    shiftId: target.shift_id,
    ignoredScheduleId: source.schedule_id,
  });

  if (requesterConflict) {
    return { valid: false, message: "Bạn đã có lịch trực trùng với ca muốn đổi" };
  }

  const targetConflict = await hasScheduleConflict(client, {
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
  await expireOverdueSwapRequests(client);

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

  const result = await client.query(
    `
    INSERT INTO swap_requests (
      source_schedule_id,
      requester_employee_id,
      target_employee_id,
      target_schedule_id,
      reason,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'PENDING_RESPONSE')
    RETURNING request_id, status
    `,
    [
      validation.source.schedule_id,
      validation.source.employee_id,
      validation.target.employee_id,
      validation.target.schedule_id,
      cleanReason,
    ],
  );

  return {
    request: result.rows[0],
    context: {
      source: validation.source,
      target: validation.target,
    },
  };
}

export async function listSwapRequests(client, user) {
  const profile = await getEmployeeProfileByUser(client, user.sub);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  const expiredCount = await expireOverdueSwapRequests(client);

  const role = user.role;
  const isHead = role === "DEPARTMENT_HEAD";

  const result = await client.query(
    `
    SELECT
      sr.request_id,
      sr.reason,
      sr.status,
      sr.response_note,
      sr.approval_note,
      to_char(sr.requested_at, 'YYYY-MM-DD HH24:MI') AS requested_at,
      to_char(sr.responded_at, 'YYYY-MM-DD HH24:MI') AS responded_at,
      to_char(sr.approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at,
      req.employee_id AS requester_employee_id,
      req.employee_code AS requester_employee_code,
      req.full_name AS requester_full_name,
      req_user.role AS requester_role,
      tgt.employee_id AS target_employee_id,
      tgt.employee_code AS target_employee_code,
      tgt.full_name AS target_full_name,
      approver.employee_id AS approved_by_employee_id,
      approver.full_name AS approved_by_full_name,
      source.schedule_id AS source_schedule_id,
      to_char(source.duty_date, 'YYYY-MM-DD') AS source_duty_date,
      source.department_id AS source_department_id,
      source_department.department_code AS source_department_code,
      source_department.department_name AS source_department_name,
      source_room.room_id AS source_room_id,
      source_room.room_code AS source_room_code,
      source_room.room_name AS source_room_name,
      source_shift.shift_id AS source_shift_id,
      source_shift.shift_code AS source_shift_code,
      source_shift.shift_name AS source_shift_name,
      to_char(source_shift.start_time, 'HH24:MI') AS source_start_time,
      to_char(source_shift.end_time, 'HH24:MI') AS source_end_time,
      target.schedule_id AS target_schedule_id,
      to_char(target.duty_date, 'YYYY-MM-DD') AS target_duty_date,
      target.department_id AS target_department_id,
      target_department.department_code AS target_department_code,
      target_department.department_name AS target_department_name,
      target_room.room_id AS target_room_id,
      target_room.room_code AS target_room_code,
      target_room.room_name AS target_room_name,
      target_shift.shift_id AS target_shift_id,
      target_shift.shift_code AS target_shift_code,
      target_shift.shift_name AS target_shift_name,
      to_char(target_shift.start_time, 'HH24:MI') AS target_start_time,
      to_char(target_shift.end_time, 'HH24:MI') AS target_end_time
    FROM swap_requests sr
    JOIN employees req ON req.employee_id = sr.requester_employee_id
    LEFT JOIN users req_user ON req_user.user_id = req.user_id
    JOIN employees tgt ON tgt.employee_id = sr.target_employee_id
    LEFT JOIN employees approver ON approver.employee_id = sr.approved_by_employee_id
    JOIN schedules source ON source.schedule_id = sr.source_schedule_id
    JOIN departments source_department ON source_department.department_id = source.department_id
    JOIN rooms source_room ON source_room.room_id = source.room_id
    JOIN shifts source_shift ON source_shift.shift_id = source.shift_id
    LEFT JOIN schedules target ON target.schedule_id = sr.target_schedule_id
    LEFT JOIN departments target_department ON target_department.department_id = target.department_id
    LEFT JOIN rooms target_room ON target_room.room_id = target.room_id
    LEFT JOIN shifts target_shift ON target_shift.shift_id = target.shift_id
    WHERE
      sr.requester_employee_id = $1
      OR sr.target_employee_id = $1
      OR ($2::boolean = TRUE AND source.department_id = $3)
    ORDER BY sr.requested_at DESC, sr.request_id DESC
    `,
    [profile.employee_id, isHead, profile.department_id],
  );

  return {
    expiredCount,
    requests: result.rows.map((row) => ({
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
  const profile = await getEmployeeProfileByUser(client, user.sub);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  await expireOverdueSwapRequests(client);

  const request = await getSwapRequestForUpdate(client, requestId);
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
    const result = await client.query(
      `
      UPDATE swap_requests
      SET status = 'REJECTED',
          response_note = $1,
          responded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      RETURNING request_id, status
      `,
      [cleanNote, requestId],
    );

    return { request: result.rows[0], context: request };
  }

  const validation = await validateSwapPairBySchedules(client, {
    sourceScheduleId: request.source_schedule_id,
    targetScheduleId: request.target_schedule_id,
  });

  if (!validation.valid) {
    return { error: validation.message };
  }

  if (request.requester_role === "DEPARTMENT_HEAD") {
    await applyScheduleSwap(client, validation);

    const result = await client.query(
      `
      UPDATE swap_requests
      SET status = 'APPROVED',
          response_note = $1,
          responded_at = CURRENT_TIMESTAMP,
          approved_at = CURRENT_TIMESTAMP,
          approved_by_employee_id = requester_employee_id,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      RETURNING request_id, status
      `,
      [cleanNote, requestId],
    );

    return { request: result.rows[0], context: request };
  }

  const result = await client.query(
    `
    UPDATE swap_requests
    SET status = 'PENDING_APPROVAL',
        response_note = $1,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = $2
    RETURNING request_id, status
    `,
    [cleanNote, requestId],
  );

  return { request: result.rows[0], context: request };
}

export async function reviewSwapRequest(client, {
  userId,
  requestId,
  approved,
  note,
}) {
  const profile = await getEmployeeProfileByUser(client, userId);
  if (!profile) {
    return { error: "Tài khoản này chưa liên kết với nhân viên y tế" };
  }

  await expireOverdueSwapRequests(client);

  const request = await getSwapRequestForUpdate(client, requestId);
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
    const result = await client.query(
      `
      UPDATE swap_requests
      SET status = 'REJECTED',
          approval_note = $1,
          approved_at = CURRENT_TIMESTAMP,
          approved_by_employee_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $3
      RETURNING request_id, status
      `,
      [cleanNote, profile.employee_id, requestId],
    );

    return { request: result.rows[0], context: request };
  }

  const validation = await validateSwapPairBySchedules(client, {
    sourceScheduleId: request.source_schedule_id,
    targetScheduleId: request.target_schedule_id,
  });

  if (!validation.valid) {
    return { error: validation.message };
  }

  await applyScheduleSwap(client, validation);

  const result = await client.query(
    `
    UPDATE swap_requests
    SET status = 'APPROVED',
        approval_note = $1,
        approved_at = CURRENT_TIMESTAMP,
        approved_by_employee_id = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = $3
    RETURNING request_id, status
    `,
    [cleanNote, profile.employee_id, requestId],
  );

  return { request: result.rows[0], context: request };
}

export async function expireOverdueSwapRequests(client) {
  const result = await client.query(
    `
    UPDATE swap_requests sr
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    FROM schedules source
    WHERE source.schedule_id = sr.source_schedule_id
      AND sr.status = ANY($1::varchar[])
      AND source.duty_date <= CURRENT_DATE
    RETURNING sr.request_id
    `,
    [pendingSwapStatuses],
  );

  return result.rowCount;
}

async function hasScheduleConflict(client, {
  employeeId,
  dutyDate,
  shiftId,
  ignoredScheduleId,
}) {
  const result = await client.query(
    `
    SELECT schedule_id
    FROM schedules
    WHERE employee_id = $1
      AND duty_date = $2::date
      AND shift_id = $3
      AND status <> 'CANCELLED'
      AND schedule_id <> $4
    LIMIT 1
    `,
    [employeeId, dutyDate, shiftId, ignoredScheduleId],
  );

  return result.rowCount > 0;
}

async function canRequestBeforeDutyDate(client, sourceScheduleId) {
  const result = await client.query(
    `
    SELECT duty_date > CURRENT_DATE AS allowed
    FROM schedules
    WHERE schedule_id = $1
    LIMIT 1
    `,
    [sourceScheduleId],
  );

  if (!result.rows[0]?.allowed) {
    return {
      allowed: false,
      message: "Yêu cầu đổi ca phải được gửi trước ngày trực ít nhất 1 ngày",
    };
  }

  return { allowed: true };
}

async function getSwapRequestForUpdate(client, requestId) {
  const result = await client.query(
    `
    SELECT
      sr.request_id,
      sr.source_schedule_id,
      sr.target_schedule_id,
      sr.requester_employee_id,
      sr.target_employee_id,
      sr.status,
      source.department_id AS source_department_id,
      req_user.role AS requester_role
    FROM swap_requests sr
    JOIN schedules source ON source.schedule_id = sr.source_schedule_id
    JOIN employees requester ON requester.employee_id = sr.requester_employee_id
    LEFT JOIN users req_user ON req_user.user_id = requester.user_id
    WHERE sr.request_id = $1
    FOR UPDATE OF sr
    LIMIT 1
    `,
    [requestId],
  );

  return result.rows[0];
}

async function validateSwapPairBySchedules(client, { sourceScheduleId, targetScheduleId }) {
  const result = await client.query(
    `
    SELECT
      source.schedule_id AS source_schedule_id,
      to_char(source.duty_date, 'YYYY-MM-DD') AS source_duty_date,
      source.employee_id AS source_employee_id,
      source.department_id AS source_department_id,
      source.room_id AS source_room_id,
      source.shift_id AS source_shift_id,
      target.schedule_id AS target_schedule_id,
      to_char(target.duty_date, 'YYYY-MM-DD') AS target_duty_date,
      target.employee_id AS target_employee_id,
      target.department_id AS target_department_id,
      target.room_id AS target_room_id,
      target.shift_id AS target_shift_id
    FROM schedules source
    JOIN schedules target ON target.schedule_id = $2
    WHERE source.schedule_id = $1
      AND source.status <> 'CANCELLED'
      AND target.status <> 'CANCELLED'
    LIMIT 1
    `,
    [sourceScheduleId, targetScheduleId],
  );

  const pair = result.rows[0];
  if (!pair) {
    return { valid: false, message: "Không tìm thấy ca trực can doi" };
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

  const requesterConflict = await hasScheduleConflict(client, {
    employeeId: pair.source_employee_id,
    dutyDate: pair.target_duty_date,
    shiftId: pair.target_shift_id,
    ignoredScheduleId: pair.source_schedule_id,
  });

  if (!sameSlot && requesterConflict) {
    return { valid: false, message: "Người gửi đã có lịch trực trùng với ca muốn đổi" };
  }

  const targetConflict = await hasScheduleConflict(client, {
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

async function applyScheduleSwap(client, validation) {
  const { pair } = validation;
  const sameSlot =
    pair.source_duty_date === pair.target_duty_date &&
    Number(pair.source_shift_id) === Number(pair.target_shift_id);

  if (sameSlot) {
    await client.query(
      `
      UPDATE schedules
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $1
      `,
      [pair.source_schedule_id],
    );

    await client.query(
      `
      UPDATE schedules
      SET room_id = $1,
          department_id = $2,
          status = 'UPDATED',
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $3
      `,
      [pair.source_room_id, pair.source_department_id, pair.target_schedule_id],
    );

    await client.query(
      `
      UPDATE schedules
      SET room_id = $1,
          department_id = $2,
          status = 'UPDATED',
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $3
      `,
      [pair.target_room_id, pair.target_department_id, pair.source_schedule_id],
    );

    return;
  }

  await client.query(
    `
    UPDATE schedules
    SET employee_id = $1,
        status = 'UPDATED',
        updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = $2
    `,
    [pair.target_employee_id, pair.source_schedule_id],
  );

  await client.query(
    `
    UPDATE schedules
    SET employee_id = $1,
        status = 'UPDATED',
        updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = $2
    `,
    [pair.source_employee_id, pair.target_schedule_id],
  );
}
