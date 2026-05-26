import { pool } from "../../db.js";

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

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function listActivityLogs(req, res) {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = clampLimit(req.query.limit);
    const offset = (page - 1) * limit;
    const filters = [];
    const params = [];

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      filters.push(`
        (
          LOWER(COALESCE(username, '')) LIKE $${params.length}
          OR LOWER(action) LIKE $${params.length}
          OR LOWER(COALESCE(entity_type, '')) LIKE $${params.length}
          OR LOWER(description) LIKE $${params.length}
        )
      `);
    }

    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    if (action && action !== "all") {
      params.push(action);
      filters.push(`action = $${params.length}`);
    }

    if (isIsoDate(req.query.date_from)) {
      params.push(req.query.date_from);
      filters.push(`created_at >= $${params.length}::date`);
    }

    if (isIsoDate(req.query.date_to)) {
      params.push(req.query.date_to);
      filters.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await pool.query(
      `
      SELECT
        log_id,
        user_id,
        username,
        role,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address,
        to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        COUNT(*) OVER() AS total_count
      FROM activity_logs
      ${whereClause}
      ORDER BY created_at DESC, log_id DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
      `,
      params,
    );

    const total = result.rows.length ? Number(result.rows[0].total_count) : 0;

    res.json({
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      data: result.rows.map(({ total_count, ...row }) => row),
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy nhật ký hoạt động",
      error: error.message,
    });
  }
}
