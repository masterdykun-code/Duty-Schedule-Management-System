import { pool } from "../db.js";
import { hashPassword } from "../auth/password.service.js";
import { roles } from "../auth/roles.js";
import {
  emptyToNull,
  generateEmployeeCode,
  generateShiftCode,
  isValidEmail,
  isValidPhone,
  normalizeGender,
  normalizeShiftDepartmentConfigs,
  normalizeShiftType,
  normalizeStatus,
  parsePositiveId,
} from "./admin.helpers.js";
import { employeeManagementSelect, shiftManagementSelect } from "./admin.queries.js";

async function getEmployeeForAdmin(employeeId, client = pool) {
  const result = await client.query(
    `${employeeManagementSelect} WHERE e.employee_id = $1`,
    [employeeId],
  );

  return result.rows[0];
}

async function getShiftForAdmin(shiftId, client = pool) {
  const result = await client.query(
    `${shiftManagementSelect} HAVING sh.shift_id = $1`,
    [shiftId],
  );

  return result.rows[0];
}

async function syncShiftDepartments(client, shiftId, departmentConfigs, status) {
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
    [shiftId, status, JSON.stringify(departmentConfigs.map((config) => ({
      department_id: config.departmentId,
      is_required: config.isRequired,
      min_staff: config.minStaff,
      max_staff: config.maxStaff,
    })))],
  );

  if (result.rowCount !== departmentConfigs.length) {
    const error = new Error("Khoa ap dung khong hop le hoac da ngung hoat dong");
    error.statusCode = 400;
    throw error;
  }
}

export async function listDepartments(req, res) {
  try {
    const result = await pool.query(`
      SELECT department_id, department_code, department_name, status
      FROM departments
      ORDER BY department_name ASC
    `);

    res.json({
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach khoa",
      error: error.message,
    });
  }
}

export async function listRooms(req, res) {
  try {
    const result = await pool.query(`
      SELECT room_id, department_id, room_code, room_name, status
      FROM rooms
      ORDER BY department_id ASC, room_code ASC
    `);

    res.json({
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach phong",
      error: error.message,
    });
  }
}

export async function listEmployees(req, res) {
  try {
    const result = await pool.query(`${employeeManagementSelect} ORDER BY e.employee_id ASC`);

    res.json({
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach nhan vien",
      error: error.message,
    });
  }
}

export async function createEmployee(req, res) {
  const client = await pool.connect();

  try {
    const {
      full_name,
      gender,
      date_of_birth,
      phone,
      email,
      department_id,
      room_id,
      position,
      status,
    } = req.body;

    const departmentId = parsePositiveId(department_id);
    const roomId = parsePositiveId(room_id);
    const normalizedPhone = emptyToNull(phone?.trim());
    const normalizedEmail = emptyToNull(email?.trim());

    if (!full_name || !departmentId || !position) {
      return res.status(400).json({
        message: "full_name, department_id va position la bat buoc",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Email khong dung dinh dang",
      });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        message: "So dien thoai phai gom dung 10 chu so",
      });
    }

    await client.query("BEGIN");

    const employeeCode = await generateEmployeeCode(client);
    const normalizedStatus = normalizeStatus(status);
    if (roomId) {
      const roomResult = await client.query(
        "SELECT room_id FROM rooms WHERE room_id = $1 AND department_id = $2",
        [roomId, departmentId],
      );

      if (roomResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Phong khong thuoc khoa da chon",
        });
      }
    }

    const userResult = await client.query(
      `
      INSERT INTO users (username, password_hash, role, status)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id
      `,
      [employeeCode, hashPassword("1"), roles.MEDICAL_STAFF, normalizedStatus],
    );

    const insertResult = await client.query(
      `
      INSERT INTO employees (
        user_id, department_id, room_id, employee_code, full_name, gender, date_of_birth,
        phone, email, position, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING employee_id
      `,
      [
        userResult.rows[0].user_id,
        departmentId,
        roomId,
        employeeCode,
        full_name.trim(),
        normalizeGender(gender),
        emptyToNull(date_of_birth),
        normalizedPhone,
        normalizedEmail,
        position.trim(),
        normalizedStatus,
      ],
    );

    const employee = await getEmployeeForAdmin(insertResult.rows[0].employee_id, client);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Tao nhan vien thanh cong",
      data: employee,
      login: {
        username: employee.employee_code,
        default_password: "1",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi tao nhan vien",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

export async function updateEmployee(req, res) {
  const client = await pool.connect();

  try {
    const employeeId = parsePositiveId(req.params.id);
    const {
      full_name,
      gender,
      date_of_birth,
      phone,
      email,
      department_id,
      room_id,
      position,
      status,
    } = req.body;

    const departmentId = parsePositiveId(department_id);
    const roomId = parsePositiveId(room_id);
    const normalizedPhone = emptyToNull(phone?.trim());
    const normalizedEmail = emptyToNull(email?.trim());

    if (!employeeId) {
      return res.status(400).json({ message: "employee_id khong hop le" });
    }

    if (!full_name || !departmentId || !position) {
      return res.status(400).json({
        message: "full_name, department_id va position la bat buoc",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Email khong dung dinh dang",
      });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        message: "So dien thoai phai gom dung 10 chu so",
      });
    }

    await client.query("BEGIN");

    if (roomId) {
      const roomResult = await client.query(
        "SELECT room_id FROM rooms WHERE room_id = $1 AND department_id = $2",
        [roomId, departmentId],
      );

      if (roomResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Phong khong thuoc khoa da chon",
        });
      }
    }

    const normalizedStatus = normalizeStatus(status);
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
      [
        departmentId,
        roomId,
        full_name.trim(),
        normalizeGender(gender),
        emptyToNull(date_of_birth),
        normalizedPhone,
        normalizedEmail,
        position.trim(),
        normalizedStatus,
        employeeId,
      ],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Khong tim thay nhan vien" });
    }

    const userId = result.rows[0].user_id;
    if (userId) {
      await client.query(
        "UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [normalizedStatus, userId],
      );
    }

    const employee = await getEmployeeForAdmin(employeeId, client);

    await client.query("COMMIT");

    res.json({
      message: "Cap nhat nhan vien thanh cong",
      data: employee,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi cap nhat nhan vien",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

export async function deactivateEmployee(req, res) {
  const client = await pool.connect();

  try {
    const employeeId = parsePositiveId(req.params.id);

    if (!employeeId) {
      return res.status(400).json({ message: "employee_id khong hop le" });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE employees
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
      RETURNING user_id
      `,
      [employeeId],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Khong tim thay nhan vien" });
    }

    const userId = result.rows[0].user_id;
    if (userId) {
      await client.query(
        "UPDATE users SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId],
      );
    }

    const employee = await getEmployeeForAdmin(employeeId, client);

    await client.query("COMMIT");

    res.json({
      message: "Da ngung hoat dong nhan vien",
      data: employee,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi ngung hoat dong nhan vien",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

export async function listShifts(req, res) {
  try {
    const result = await pool.query(`${shiftManagementSelect} ORDER BY sh.shift_id ASC`);

    res.json({
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach ca truc",
      error: error.message,
    });
  }
}

export async function createShift(req, res) {
  const client = await pool.connect();

  try {
    const { shift_name, start_time, end_time, shift_type, note, status, departments } = req.body;
    const normalizedShiftType = normalizeShiftType(shift_type);
    const normalizedStatus = normalizeStatus(status);
    const departmentConfigs = normalizeShiftDepartmentConfigs(departments);

    if (!shift_name || !start_time || !end_time || !normalizedShiftType) {
      return res.status(400).json({
        message: "shift_name, start_time, end_time va shift_type hop le la bat buoc",
      });
    }

    if (!departmentConfigs || departmentConfigs.length === 0) {
      return res.status(400).json({
        message: "Vui long cau hinh khoa ap dung ca truc hop le",
      });
    }

    await client.query("BEGIN");

    const shiftCode = await generateShiftCode(client);
    const insertResult = await client.query(
      `
      INSERT INTO shifts (shift_code, shift_name, start_time, end_time, shift_type, note, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING shift_id
      `,
      [
        shiftCode,
        shift_name.trim(),
        start_time,
        end_time,
        normalizedShiftType,
        emptyToNull(note),
        normalizedStatus,
      ],
    );

    await syncShiftDepartments(
      client,
      insertResult.rows[0].shift_id,
      departmentConfigs,
      normalizedStatus,
    );

    const shift = await getShiftForAdmin(insertResult.rows[0].shift_id, client);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Tao ca truc thanh cong",
      data: shift,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Loi khi tao ca truc",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

export async function updateShift(req, res) {
  const client = await pool.connect();

  try {
    const shiftId = parsePositiveId(req.params.id);
    const { shift_name, start_time, end_time, shift_type, note, status, departments } = req.body;
    const normalizedShiftType = normalizeShiftType(shift_type);
    const normalizedStatus = normalizeStatus(status);
    const departmentConfigs = normalizeShiftDepartmentConfigs(departments);

    if (!shiftId) {
      return res.status(400).json({ message: "shift_id khong hop le" });
    }

    if (!shift_name || !start_time || !end_time || !normalizedShiftType) {
      return res.status(400).json({
        message: "shift_name, start_time, end_time va shift_type hop le la bat buoc",
      });
    }

    if (!departmentConfigs || departmentConfigs.length === 0) {
      return res.status(400).json({
        message: "Vui long cau hinh khoa ap dung ca truc hop le",
      });
    }

    await client.query("BEGIN");

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
      [
        shift_name.trim(),
        start_time,
        end_time,
        normalizedShiftType,
        emptyToNull(note),
        normalizedStatus,
        shiftId,
      ],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Khong tim thay ca truc" });
    }

    await syncShiftDepartments(client, shiftId, departmentConfigs, normalizedStatus);

    const shift = await getShiftForAdmin(shiftId, client);

    await client.query("COMMIT");

    res.json({
      message: "Cap nhat ca truc thanh cong",
      data: shift,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Loi khi cap nhat ca truc",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

export async function deactivateShift(req, res) {
  const client = await pool.connect();

  try {
    const shiftId = parsePositiveId(req.params.id);

    if (!shiftId) {
      return res.status(400).json({ message: "shift_id khong hop le" });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE shifts
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = $1
      RETURNING shift_id
      `,
      [shiftId],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Khong tim thay ca truc" });
    }

    await client.query(
      `
      UPDATE department_required_shifts
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = $1
      `,
      [shiftId],
    );

    const shift = await getShiftForAdmin(shiftId, client);

    await client.query("COMMIT");

    res.json({
      message: "Da ngung ap dung ca truc",
      data: shift,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi ngung ap dung ca truc",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
