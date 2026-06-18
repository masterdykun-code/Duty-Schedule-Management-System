import { pool } from "../../../db.js";
import { ActivityRepository } from "../repositories/activity.repository.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function clampLimit(value) {
  return Math.min(parsePositiveInteger(value, DEFAULT_LIMIT), MAX_LIMIT);
}

export async function listActivityLogs(req, res) {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = clampLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const dateFrom = typeof req.query.date_from === "string" ? req.query.date_from.trim() : "";
    const dateTo = typeof req.query.date_to === "string" ? req.query.date_to.trim() : "";

    const rows = await ActivityRepository.listActivityLogs(pool, {
      search,
      action,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    const total = rows.length ? Number(rows[0].total_count) : 0;

    sendSuccess(res, {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      data: rows.map(({ total_count, ...row }) => row),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy nhật ký hoạt động", 500, { error: error.message });
  }
}
