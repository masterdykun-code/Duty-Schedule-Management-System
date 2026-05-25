export const userProfileSelect = `
  SELECT
    u.user_id,
    u.username,
    u.password_hash,
    u.role,
    u.status,
    u.created_at,
    e.employee_id,
    e.full_name,
    e.department_id,
    e.room_id,
    e.employee_code,
    e.position,
    d.department_name,
    r.room_name
  FROM users u
  LEFT JOIN employees e ON e.user_id = u.user_id
  LEFT JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN rooms r ON r.room_id = e.room_id
`;

export function toPublicUser(row) {
  return {
    user_id: row.user_id,
    username: row.username,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name || row.username,
    department_id: row.department_id,
    department_name: row.department_name,
    room_id: row.room_id,
    room_name: row.room_name,
    position: row.position,
  };
}
