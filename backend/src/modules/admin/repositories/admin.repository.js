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

export class AdminRepository {
  static async listDepartments(client) {
    const result = await client.query(`
      SELECT department_id, department_code, department_name, status
      FROM departments
      ORDER BY department_name ASC
    `);
    return result.rows;
  }

  static async listRooms(client) {
    const result = await client.query(`
      SELECT room_id, department_id, room_code, room_name, status
      FROM rooms
      ORDER BY department_id ASC, room_code ASC
    `);
    return result.rows;
  }

  static async listEmployees(client) {
    const result = await client.query(`${employeeManagementSelect} ORDER BY e.employee_id ASC`);
    return result.rows;
  }

  static async getEmployeeById(client, employeeId) {
    const result = await client.query(
      `${employeeManagementSelect} WHERE e.employee_id = $1`,
      [employeeId],
    );
    return result.rows[0];
  }

  static async getShiftById(client, shiftId) {
    const result = await client.query(
      `${shiftManagementSelect} HAVING sh.shift_id = $1`,
      [shiftId],
    );
    return result.rows[0];
  }

  static async checkRoomBelongsToDepartment(client, roomId, departmentId) {
    const result = await client.query(
      "SELECT room_id FROM rooms WHERE room_id = $1 AND department_id = $2",
      [roomId, departmentId],
    );
    return result.rowCount > 0;
  }

  static async insertUser(client, { username, passwordHash, role, status }) {
    const result = await client.query(
      `
      INSERT INTO users (username, password_hash, role, status)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id
      `,
      [username, passwordHash, role, status],
    );
    return result.rows[0].user_id;
  }

  static async insertEmployee(client, { userId, departmentId, roomId, employeeCode, fullName, gender, dateOfBirth, phone, email, position, status }) {
    const result = await client.query(
      `
      INSERT INTO employees (
        user_id, department_id, room_id, employee_code, full_name, gender, date_of_birth,
        phone, email, position, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING employee_id
      `,
      [userId, departmentId, roomId, employeeCode, fullName, gender, dateOfBirth, phone, email, position, status],
    );
    return result.rows[0].employee_id;
  }

  static async updateEmployee(client, employeeId, { departmentId, roomId, fullName, gender, dateOfBirth, phone, email, position, status }) {
    const result = await client.query(
      `
      UPDATE employees
      SET
        department_id = $1,
        room_id = $2,
        full_name = $3,
        gender = $4,
        date_of_birth = $5,
        phone = $6,
        email = $7,
        position = $8,
        status = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $10
      RETURNING employee_id, user_id
      `,
      [departmentId, roomId, fullName, gender, dateOfBirth, phone, email, position, status, employeeId],
    );
    return result.rows[0];
  }

  static async updateUserStatus(client, userId, status) {
    await client.query(
      "UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
      [status, userId],
    );
  }

  static async deactivateEmployee(client, employeeId) {
    const result = await client.query(
      `
      UPDATE employees
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
      RETURNING user_id
      `,
      [employeeId],
    );
    return result.rows[0];
  }

  static async listShifts(client) {
    const result = await client.query(`${shiftManagementSelect} ORDER BY sh.shift_id ASC`);
    return result.rows;
  }

  static async insertShift(client, { shiftCode, shiftName, startTime, endTime, shiftType, note, status }) {
    const result = await client.query(
      `
      INSERT INTO shifts (shift_code, shift_name, start_time, end_time, shift_type, note, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING shift_id
      `,
      [shiftCode, shiftName, startTime, endTime, shiftType, note, status],
    );
    return result.rows[0].shift_id;
  }

  static async updateShift(client, shiftId, { shiftName, startTime, endTime, shiftType, note, status }) {
    const result = await client.query(
      `
      UPDATE shifts
      SET
        shift_name = $1,
        start_time = $2,
        end_time = $3,
        shift_type = $4,
        note = $5,
        status = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = $7
      RETURNING shift_id
      `,
      [shiftName, startTime, endTime, shiftType, note, status, shiftId],
    );
    return result.rowCount > 0;
  }

  static async deactivateShift(client, shiftId) {
    const result = await client.query(
      `
      UPDATE shifts
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = $1
      RETURNING shift_id
      `,
      [shiftId],
    );
    return result.rowCount > 0;
  }

  static async deactivateDepartmentRequiredShifts(client, shiftId) {
    await client.query(
      `
      UPDATE department_required_shifts
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = $1
      `,
      [shiftId],
    );
  }

  static async syncShiftDepartments(client, shiftId, departmentConfigs, status) {
    await client.query("DELETE FROM department_required_shifts WHERE shift_id = $1", [shiftId]);

    if (departmentConfigs.length === 0) {
      return;
    }

    const result = await client.query(
      `
      INSERT INTO department_required_shifts (
        department_id, shift_id, is_required, min_staff, max_staff, status
      )
      SELECT
        config.department_id,
        $1,
        config.is_required,
        config.min_staff,
        config.max_staff,
        $2
      FROM json_to_recordset($3::json) AS config(
        department_id BIGINT,
        is_required BOOLEAN,
        min_staff INTEGER,
        max_staff INTEGER
      )
      JOIN departments d ON d.department_id = config.department_id
      WHERE d.status = 'ACTIVE'
      `,
      [
        shiftId,
        status,
        JSON.stringify(
          departmentConfigs.map((config) => ({
            department_id: config.departmentId,
            is_required: config.isRequired,
            min_staff: config.minStaff,
            max_staff: config.maxStaff,
          })),
        ),
      ],
    );

    if (result.rowCount !== departmentConfigs.length) {
      const error = new Error("Khoa áp dụng không hợp lệ hoặc đã ngừng hoạt động");
      error.statusCode = 400;
      throw error;
    }
  }

  static async generateEmployeeCode(client) {
    const result = await client.query(`
      SELECT COALESCE(MAX(SUBSTRING(employee_code FROM 3)::INTEGER), 0) + 1 AS next_number
      FROM employees
      WHERE employee_code ~ '^NV[0-9]+$'
    `);

    return `NV${String(result.rows[0].next_number).padStart(3, "0")}`;
  }

  static async generateShiftCode(client) {
    const result = await client.query(`
      SELECT COALESCE(MAX(SUBSTRING(shift_code FROM 3)::INTEGER), 0) + 1 AS next_number
      FROM shifts
      WHERE shift_code ~ '^CA[0-9]+$'
    `);

    return `CA${String(result.rows[0].next_number).padStart(3, "0")}`;
  }
}
