export function mapProfile(row) {
  return {
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
    status: row.status,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
  };
}

export function mapSchedule(row) {
  return {
    schedule_id: row.schedule_id,
    duty_date: row.duty_date,
    status: row.status,
    note: row.note,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
    assigned_by_username: row.assigned_by_username,
    swap_request_status: row.swap_request_status,
  };
}

export function mapScheduleRoom(row) {
  return {
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
  };
}

export function mapShift(row) {
  return {
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
  };
}

export function mapAssignmentEmployee(row) {
  return {
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
    department_id: row.department_id,
    room_id: row.room_id,
    room_code: row.room_code,
  };
}

export function mapRequiredShiftConfig(row) {
  return {
    department_id: row.department_id,
    shift_id: row.shift_id,
    is_required: row.is_required,
    min_staff: row.min_staff,
    max_staff: row.max_staff,
  };
}

export function mapGeneralSchedule(row) {
  return {
    schedule_id: row.schedule_id,
    duty_date: row.duty_date,
    status: row.status,
    note: row.note,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
  };
}
