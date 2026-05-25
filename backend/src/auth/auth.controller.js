import { pool } from "../db.js";
import { recordActivityLog, recordActivityLogSafely } from "../activity/activity.service.js";
import { userProfileSelect, toPublicUser } from "./auth.queries.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { createToken, getTokenTtlSeconds } from "./token.service.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;
const allowedGenders = ["MALE", "FEMALE", "OTHER", ""];

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "username va password la bat buoc",
      });
    }

    const result = await pool.query(
      `${userProfileSelect} WHERE u.username = $1 LIMIT 1`,
      [username],
    );

    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({
        message: "Sai ten dang nhap hoac mat khau",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Tai khoan da bi khoa",
      });
    }

    await recordActivityLogSafely(pool, {
      req,
      actor: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
      action: "LOGIN",
      entityType: "users",
      entityId: user.user_id,
      description: `Dang nhap tai khoan ${user.username}`,
      metadata: {
        user_id: user.user_id,
      },
    });

    res.json({
      message: "Dang nhap thanh cong",
      token: createToken(user),
      expires_in: getTokenTtlSeconds(),
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi dang nhap",
      error: error.message,
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      `${userProfileSelect} WHERE u.user_id = $1 LIMIT 1`,
      [req.user.sub],
    );

    const user = result.rows[0];

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        message: "Tai khoan khong con hoat dong",
      });
    }

    res.json({
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay thong tin dang nhap",
      error: error.message,
    });
  }
}

export async function changePassword(req, res) {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        message: "Vui long nhap day du mat khau cu, mat khau moi va xac nhan mat khau",
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        message: "Mat khau moi va xac nhan mat khau khong khop",
      });
    }

    const result = await pool.query(
      "SELECT user_id, password_hash, status FROM users WHERE user_id = $1 LIMIT 1",
      [req.user.sub],
    );

    const user = result.rows[0];

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        message: "Tai khoan khong con hoat dong",
      });
    }

    if (!verifyPassword(current_password, user.password_hash)) {
      return res.status(400).json({
        message: "Mat khau cu khong dung",
      });
    }

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
      [hashPassword(new_password), user.user_id],
    );

    await recordActivityLog(pool, {
      req,
      action: "CHANGE_PASSWORD",
      entityType: "users",
      entityId: user.user_id,
      description: `Doi mat khau tai khoan ${req.user.username}`,
      metadata: {
        user_id: user.user_id,
      },
    });

    res.json({
      message: "Doi mat khau thanh cong",
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi doi mat khau",
      error: error.message,
    });
  }
}

export async function updateCurrentUserProfile(req, res) {
  try {
    const employeeResult = await pool.query(
      "SELECT employee_id FROM employees WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [req.user.sub],
    );
    const employee = employeeResult.rows[0];

    if (!employee) {
      return res.status(400).json({
        message: "Tai khoan nay chua lien ket voi nhan vien y te",
      });
    }

    const fullName = typeof req.body.full_name === "string" ? req.body.full_name.trim() : "";
    const gender = typeof req.body.gender === "string" ? req.body.gender : "";
    const dateOfBirth = req.body.date_of_birth || null;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";

    if (!fullName) {
      return res.status(400).json({ message: "Vui long nhap ho ten" });
    }

    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({ message: "Gioi tinh khong hop le" });
    }

    if (phone && !phonePattern.test(phone)) {
      return res.status(400).json({
        message: "So dien thoai phai gom dung 10 chu so",
      });
    }

    if (email && !emailPattern.test(email)) {
      return res.status(400).json({ message: "Email khong dung dinh dang" });
    }

    await pool.query(
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
      [fullName, gender, dateOfBirth, phone, email, employee.employee_id],
    );

    await recordActivityLog(pool, {
      req,
      action: "UPDATE_PROFILE",
      entityType: "employees",
      entityId: employee.employee_id,
      description: `Cap nhat thong tin ca nhan ${req.user.username}`,
      metadata: {
        employee_id: employee.employee_id,
      },
    });

    const userResult = await pool.query(
      `${userProfileSelect} WHERE u.user_id = $1 LIMIT 1`,
      [req.user.sub],
    );

    res.json({
      message: "Cap nhat thong tin ca nhan thanh cong",
      user: toPublicUser(userResult.rows[0]),
    });
  } catch (error) {
    const isUniqueEmail = error.code === "23505";
    res.status(isUniqueEmail ? 400 : 500).json({
      message: isUniqueEmail ? "Email da duoc su dung" : "Loi khi cap nhat thong tin ca nhan",
      error: error.message,
    });
  }
}
