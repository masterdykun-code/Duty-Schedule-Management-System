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
    e.gender,
    to_char(e.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
    e.phone,
    e.email,
    e.department_id,
    e.room_id,
    e.employee_code,
    e.position,
    d.department_code,
    d.department_name,
    r.room_code,
    r.room_name
  FROM users u
  LEFT JOIN employees e ON e.user_id = u.user_id
  LEFT JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN rooms r ON r.room_id = e.room_id
`;

export function toPublicUser(row) {
  if (!row) return null;
  return {
    user_id: row.user_id,
    username: row.username,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name || row.username,
    gender: row.gender,
    date_of_birth: row.date_of_birth,
    phone: row.phone,
    email: row.email,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    position: row.position,
  };
}

export class AuthRepository {
  static async findUserByUsername(client, username) {
    const result = await client.query(
      `${userProfileSelect} WHERE u.username = $1 LIMIT 1`,
      [username],
    );
    return result.rows[0];
  }

  static async findUserById(client, userId) {
    const result = await client.query(
      `${userProfileSelect} WHERE u.user_id = $1 LIMIT 1`,
      [userId],
    );
    return result.rows[0];
  }

  static async getUserCredentials(client, userId) {
    const result = await client.query(
      "SELECT user_id, password_hash, status FROM users WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    return result.rows[0];
  }

  static async updatePassword(client, userId, hashedNewPassword) {
    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
      [hashedNewPassword, userId],
    );
  }

  static async findActiveEmployeeByUserId(client, userId) {
    const result = await client.query(
      "SELECT employee_id FROM employees WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [userId],
    );
    return result.rows[0];
  }

  static async updateEmployeeProfile(client, employeeId, { fullName, gender, dateOfBirth, phone, email }) {
    await client.query(
      `
      UPDATE employees
      SET full_name = $1,
          gender = NULLIF($2, ''),
          date_of_birth = $3::date,
          phone = NULLIF($4, ''),
          email = NULLIF($5, ''),
          updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $6
      `,
      [fullName, gender, dateOfBirth, phone, email, employeeId],
    );
  }
}
