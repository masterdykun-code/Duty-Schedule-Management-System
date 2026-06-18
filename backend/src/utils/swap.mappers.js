export function mapCoworker(row) {
  return {
    schedule_id: row.schedule_id,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
    note: row.note,
  };
}

export function mapRoomOption(row) {
  return {
    department_id: row.department_id,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
  };
}

export function mapSwapCandidate(row) {
  return {
    target_schedule_id: row.target_schedule_id,
    duty_date: row.duty_date,
    note: row.note,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
  };
}

function mapRequestSchedule(row, prefix) {
  const scheduleId = row[`${prefix}_schedule_id`];
  if (!scheduleId) return null;

  return {
    schedule_id: scheduleId,
    duty_date: row[`${prefix}_duty_date`],
    department_id: row[`${prefix}_department_id`],
    department_code: row[`${prefix}_department_code`],
    department_name: row[`${prefix}_department_name`],
    room_id: row[`${prefix}_room_id`],
    room_code: row[`${prefix}_room_code`],
    room_name: row[`${prefix}_room_name`],
    shift_id: row[`${prefix}_shift_id`],
    shift_code: row[`${prefix}_shift_code`],
    shift_name: row[`${prefix}_shift_name`],
    start_time: row[`${prefix}_start_time`],
    end_time: row[`${prefix}_end_time`],
  };
}

export function mapSwapRequest(row) {
  return {
    request_id: row.request_id,
    reason: row.reason,
    status: row.status,
    response_note: row.response_note,
    approval_note: row.approval_note,
    requested_at: row.requested_at,
    responded_at: row.responded_at,
    approved_at: row.approved_at,
    can_respond: row.can_respond,
    can_approve: row.can_approve,
    requester: {
      employee_id: row.requester_employee_id,
      employee_code: row.requester_employee_code,
      full_name: row.requester_full_name,
      role: row.requester_role,
    },
    target_employee: {
      employee_id: row.target_employee_id,
      employee_code: row.target_employee_code,
      full_name: row.target_full_name,
    },
    approved_by: row.approved_by_employee_id
      ? {
          employee_id: row.approved_by_employee_id,
          full_name: row.approved_by_full_name,
        }
      : null,
    source_schedule: mapRequestSchedule(row, "source"),
    target_schedule: mapRequestSchedule(row, "target"),
  };
}
