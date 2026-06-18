export class ActivityRepository {
  static async insertActivityLog(client, resolvedActor, action, entityType, entityId, description, metadata, ipAddress) {
    await client.query(
      `
      INSERT INTO activity_logs (
        user_id,
        username,
        role,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      `,
      [
        resolvedActor.userId,
        resolvedActor.username,
        resolvedActor.role,
        action,
        entityType,
        entityId,
        description,
        JSON.stringify(metadata || {}),
        ipAddress,
      ],
    );
  }

  static async listActivityLogs(client, { search, action, dateFrom, dateTo, limit, offset }) {
    const filters = [];
    const params = [];

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

    if (action && action !== "all") {
      params.push(action);
      filters.push(`action = $${params.length}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      filters.push(`created_at >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      filters.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await client.query(
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

    return result.rows;
  }
}
