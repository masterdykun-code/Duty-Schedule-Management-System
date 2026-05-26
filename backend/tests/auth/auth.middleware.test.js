import { describe, expect, jest, test } from "@jest/globals";
import {
  authenticateToken,
  authorizeRoles,
  authorizeTableRead,
} from "../../src/auth/auth.middleware.js";
import { createToken } from "../../src/auth/token.service.js";

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

function createTokenForRole(role) {
  return createToken({
    user_id: 1,
    username: "tester",
    role,
    employee_id: 10,
    department_id: 20,
  });
}

describe("auth.middleware", () => {
  test("authenticateToken gan req.user va goi next khi token hop le", () => {
    const token = createTokenForRole("ADMIN");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(req.user).toMatchObject({
      sub: 1,
      username: "tester",
      role: "ADMIN",
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("authenticateToken tra 401 khi thieu token", () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Chưa đăng nhập" });
    expect(next).not.toHaveBeenCalled();
  });

  test("authorizeRoles cho phep role nam trong danh sach", () => {
    const req = { user: { role: "ADMIN" } };
    const res = createResponse();
    const next = jest.fn();

    authorizeRoles("ADMIN", "OFFICE")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("authorizeRoles chan role khong du quyen", () => {
    const req = { user: { role: "MEDICAL_STAFF" } };
    const res = createResponse();
    const next = jest.fn();

    authorizeRoles("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Không có quyền truy cập" });
    expect(next).not.toHaveBeenCalled();
  });

  test("authorizeTableRead kiem tra quyen doc theo ten bang", () => {
    const req = {
      params: { table: "employees" },
      user: { role: "DEPARTMENT_HEAD" },
    };
    const res = createResponse();
    const next = jest.fn();

    authorizeTableRead(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
