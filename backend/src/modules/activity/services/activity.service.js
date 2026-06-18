import { pool } from "../../../db.js";
import { ActivityRepository } from "../repositories/activity.repository.js";

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
  const ipAddress = getRequestIp(req);

  await ActivityRepository.insertActivityLog(
    client,
    resolvedActor,
    action,
    entityType,
    entityId,
    description,
    metadata,
    ipAddress,
  );
}

export async function recordActivityLogSafely(client = pool, payload) {
  try {
    await recordActivityLog(client, payload);
  } catch (error) {
    console.error("Không thể ghi nhật ký hoạt động:", error.message);
  }
}
