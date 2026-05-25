import { pool } from "../db.js";
import { userProfileSelect, toPublicUser } from "./auth.queries.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { createToken, getTokenTtlSeconds } from "./token.service.js";

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
