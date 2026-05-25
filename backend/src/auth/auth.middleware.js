import { tableReadPermissions } from "./roles.js";
import { verifyToken } from "./token.service.js";

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Chua dang nhap" });
    }

    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Phien dang nhap khong hop le hoac da het han" });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Khong co quyen truy cap" });
    }

    next();
  };
}

export function authorizeTableRead(req, res, next) {
  const allowedRoles = tableReadPermissions[req.params.table] || [];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Khong co quyen doc bang nay" });
  }

  next();
}
