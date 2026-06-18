import { tableReadPermissions } from "../config/roles.js";
import { verifyToken } from "../modules/auth/services/token.service.js";
import { sendError } from "../utils/response.js";

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return sendError(res, "Chưa đăng nhập", 401);
    }

    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn", 401);
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, "Không có quyền truy cập", 403);
    }

    next();
  };
}

export function authorizeTableRead(req, res, next) {
  const allowedRoles = tableReadPermissions[req.params.table] || [];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return sendError(res, "Không có quyền đọc bảng này", 403);
  }

  next();
}
