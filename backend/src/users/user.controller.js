import { pool } from "../db.js";
import { hashPassword } from "../auth/password.service.js";
import { roles } from "../auth/roles.js";

export async function createUser(req, res) {
  try {
    const { username, password, password_hash, role, status } = req.body;

    if (!username || (!password && !password_hash) || !role) {
      return res.status(400).json({
        message: "Vui lòng nhập tên đăng nhập, mật khẩu và vai trò",
      });
    }

    if (!Object.values(roles).includes(role)) {
      return res.status(400).json({
        message: "Vai trò không hợp lệ",
      });
    }

    const passwordHash = password ? hashPassword(password) : password_hash;

    const result = await pool.query(
      `
      INSERT INTO users (username, password_hash, role, status)
      VALUES ($1, $2, $3, COALESCE($4, 'ACTIVE'))
      RETURNING user_id, username, role, status, created_at
      `,
      [username, passwordHash, role, status],
    );

    res.status(201).json({
      message: "Tao user thanh cong",
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi tạo user",
      error: error.message,
    });
  }
}
