import crypto from "crypto";

const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 8);

function getTokenSecret() {
  return process.env.AUTH_TOKEN_SECRET || process.env.JWT_SECRET || "dev-secret-change-me";
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", getTokenSecret()).update(value).digest("base64url");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.user_id,
    username: user.username,
    role: user.role,
    employee_id: user.employee_id,
    department_id: user.department_id,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyToken(token) {
  if (!token || token.split(".").length !== 3) {
    throw new Error("Invalid token");
  }

  const [encodedHeader, encodedPayload, signature] = token.split(".");
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(unsignedToken);

  if (!safeCompare(signature, expectedSignature)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw new Error("Token expired");
  }

  return payload;
}

export function getTokenTtlSeconds() {
  return TOKEN_TTL_SECONDS;
}
