import { pool } from "../db.js";

function actorFromRequest(req) {
  return {
    userId: req?.user?.sub || null,
    username: req?.user?.username || null,
    role: req?.user?.role || null,
  };
}

function getRequestIp(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || null;
}

export async function recordActivityLog(
  client = pool,
  {
    req = null,
    actor = null,
    action,
    entityType = null,
    entityId = null,
    description,
    metadata = {},
  },
) {
  const resolvedActor = actor || actorFromRequest(req);

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
      getRequestIp(req),
    ],
  );
}

export async function recordActivityLogSafely(client = pool, payload) {
  try {
    await recordActivityLog(client, payload);
  } catch (error) {
    console.error("Khong the ghi nhat ky hoat dong:", error.message);
  }
}
