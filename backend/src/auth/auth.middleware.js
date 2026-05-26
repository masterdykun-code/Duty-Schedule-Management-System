import { tableReadPermissions } from "./roles.js";
import { verifyToken } from "./token.service.js";

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    next();
  };
}

export function authorizeTableRead(req, res, next) {
  const allowedRoles = tableReadPermissions[req.params.table] || [];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Không có quyền đọc bảng này" });
  }

  next();
}
