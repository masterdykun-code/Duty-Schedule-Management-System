import { pool } from "../../../db.js";
import { hashPassword } from "../../auth/services/password.service.js";

import { roles } from "../../../config/roles.js";
import { sendSuccess, sendError } from "../../../utils/response.js";


export async function createUser(req, res) {
  try {
    const { username, password, password_hash, role, status } = req.body;

    if (!username || (!password && !password_hash) || !role) {
      return sendError(res, "Vui lòng nhập tên đăng nhập, mật khẩu và vai trò", 400);
    }

    if (!Object.values(roles).includes(role)) {
      return sendError(res, "Vai trò không hợp lệ", 400);
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

    sendSuccess(res, {
      message: "Tao user thanh cong",
      data: result.rows[0],
    }, 201);
  } catch (error) {
    sendError(res, "Lỗi khi tạo user", 500, { error: error.message });
  }
}
