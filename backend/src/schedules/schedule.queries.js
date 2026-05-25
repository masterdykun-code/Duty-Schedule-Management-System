export const employeeProfileForScheduleSelect = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position,
    e.status,
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name
  FROM employees e
  JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN rooms r ON r.room_id = e.room_id
  WHERE e.user_id = $1
  LIMIT 1
`;

export const personalScheduleSelect = `
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
    assigned_by.username AS assigned_by_username,
    active_swap.status AS swap_request_status
  FROM schedules s
  JOIN departments d ON d.department_id = s.department_id
  JOIN rooms r ON r.room_id = s.room_id
  JOIN shifts sh ON sh.shift_id = s.shift_id
  LEFT JOIN users assigned_by ON assigned_by.user_id = s.assigned_by_user_id
  LEFT JOIN LATERAL (
    SELECT sr.status
    FROM swap_requests sr
    WHERE sr.source_schedule_id = s.schedule_id
      AND sr.status IN ('PENDING_RESPONSE', 'PENDING_APPROVAL')
    ORDER BY sr.requested_at DESC
    LIMIT 1
  ) active_swap ON true
  WHERE s.employee_id = $1
    AND s.duty_date BETWEEN $2::date AND ($2::date + INTERVAL '6 days')
    AND s.status <> 'CANCELLED'
    AND sh.status = 'ACTIVE'
  ORDER BY s.duty_date ASC, sh.start_time ASC, sh.shift_id ASC
`;

export const scheduleRoomsSelect = `
  SELECT
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name
  FROM departments d
  LEFT JOIN rooms r
    ON r.department_id = d.department_id
   AND r.status = 'ACTIVE'
  WHERE d.status = 'ACTIVE'
  ORDER BY d.department_name ASC, r.room_code ASC
`;

export const scheduleShiftsSelect = `
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
`;

export const assignmentEmployeesSelect = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position,
    e.department_id,
    e.room_id,
    r.room_code
  FROM employees e
  LEFT JOIN rooms r ON r.room_id = e.room_id
  WHERE e.status = 'ACTIVE'
  ORDER BY e.department_id ASC, e.position ASC, e.full_name ASC
`;

export const requiredShiftConfigsSelect = `
  SELECT
    drs.department_id,
    drs.shift_id,
    drs.is_required,
    drs.min_staff,
    drs.max_staff
  FROM department_required_shifts drs
  JOIN departments d ON d.department_id = drs.department_id
  JOIN shifts sh ON sh.shift_id = drs.shift_id
  WHERE drs.status = 'ACTIVE'
    AND d.status = 'ACTIVE'
    AND sh.status = 'ACTIVE'
  ORDER BY drs.department_id ASC, sh.start_time ASC, sh.shift_id ASC
`;

export const generalScheduleSelect = `
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
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position
  FROM schedules s
  JOIN departments d ON d.department_id = s.department_id
  JOIN rooms r ON r.room_id = s.room_id
  JOIN shifts sh ON sh.shift_id = s.shift_id
  JOIN employees e ON e.employee_id = s.employee_id
  WHERE s.status <> 'CANCELLED'
    AND s.duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
    AND sh.status = 'ACTIVE'
  ORDER BY
    d.department_name ASC,
    r.room_code ASC,
    s.duty_date ASC,
    sh.start_time ASC,
    e.position ASC,
    e.full_name ASC
`;
