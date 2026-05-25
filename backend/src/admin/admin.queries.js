export const employeeManagementSelect = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.gender,
    to_char(e.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
    e.phone,
    e.email,
    e.position,
    e.status,
    e.user_id,
    u.username,
    e.department_id,
    d.department_name,
    e.room_id,
    r.room_code,
    r.room_name,
    e.created_at,
    e.updated_at
  FROM employees e
  JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN rooms r ON r.room_id = e.room_id
  LEFT JOIN users u ON u.user_id = e.user_id
`;

export const shiftManagementSelect = `
  SELECT
    sh.shift_id,
    sh.shift_code,
    sh.shift_name,
    to_char(sh.start_time, 'HH24:MI') AS start_time,
    to_char(sh.end_time, 'HH24:MI') AS end_time,
    sh.shift_type,
    sh.note,
    sh.status,
    sh.created_at,
    sh.updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'department_id', d.department_id,
          'department_code', d.department_code,
          'department_name', d.department_name,
          'is_required', drs.is_required,
          'min_staff', drs.min_staff,
          'max_staff', drs.max_staff,
          'status', drs.status
        )
        ORDER BY d.department_name ASC
      ) FILTER (WHERE drs.department_required_shift_id IS NOT NULL),
      '[]'::json
    ) AS departments
  FROM shifts sh
  LEFT JOIN department_required_shifts drs ON drs.shift_id = sh.shift_id
  LEFT JOIN departments d ON d.department_id = drs.department_id
  GROUP BY sh.shift_id
`;
