import { Router } from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeTableRead } from "../auth/auth.middleware.js";

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
      return res.status(400).json({
        message: "Ten bang khong hop le",
      });
    }

    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1 ASC`);

    res.json({
      table,
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay du lieu",
      error: error.message,
    });
  }
});

export default router;
