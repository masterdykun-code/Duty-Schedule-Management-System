import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { createToken, getTokenTtlSeconds, verifyToken } from "../../src/auth/token.service.js";

const user = {
  user_id: 12,
  username: "admin",
  role: "ADMIN",
  employee_id: 34,
  department_id: 5,
};

describe("token.service", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("createToken tao token va verifyToken doc dung payload", () => {
    jest.useFakeTimers({ now: new Date("2026-05-26T08:00:00Z") });

    const token = createToken(user);
    const payload = verifyToken(token);

    expect(payload).toMatchObject({
      sub: user.user_id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      department_id: user.department_id,
    });
    expect(payload.exp - payload.iat).toBe(getTokenTtlSeconds());
  });

  test("verifyToken tu choi token bi sua chu ky", () => {
    const token = createToken(user);
    const tamperedToken = `${token.slice(0, -1)}x`;

    expect(() => verifyToken(tamperedToken)).toThrow("Invalid token signature");
  });

  test("verifyToken tu choi token het han", () => {
    jest.useFakeTimers({ now: new Date("2026-05-26T08:00:00Z") });
    const token = createToken(user);

    jest.setSystemTime(new Date("2026-05-27T00:01:00Z"));

    expect(() => verifyToken(token)).toThrow("Token expired");
  });
});
