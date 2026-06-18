import { Router } from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeTableRead } from "../middlewares/auth.middleware.js";
import { sendSuccess, sendError } from "../utils/response.js";

const router = Router();

const allowedTables = [
  "users",
  "departments",
  "rooms",
  "employees",
  "shifts",
  "schedules",
  "swap_requests",
];

router.get("/:table", authenticateToken, authorizeTableRead, async (req, res) => {
  try {
    const { table } = req.params;

    if (!allowedTables.includes(table)) {
      return sendError(res, "Tên bảng không hợp lệ", 400);
    }

    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1 ASC`);

    sendSuccess(res, {
      table,
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy dữ liệu", 500, { error: error.message });
  }
});

export default router;
