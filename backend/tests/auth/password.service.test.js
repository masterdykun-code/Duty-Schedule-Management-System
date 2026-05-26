import { describe, expect, test } from "@jest/globals";
import { hashPassword, verifyPassword } from "../../src/auth/password.service.js";

describe("password.service", () => {
  test("hashPassword tao hash PBKDF2 va verify dung mat khau", () => {
    const hash = hashPassword("123456");

    expect(hash).toMatch(/^pbkdf2\$120000\$/);
    expect(verifyPassword("123456", hash)).toBe(true);
  });

  test("verifyPassword tra false khi sai mat khau hoac hash khong hop le", () => {
    const hash = hashPassword("123456");

    expect(verifyPassword("wrong-password", hash)).toBe(false);
    expect(verifyPassword("123456", "bad-hash")).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
  });

  test("verifyPassword ho tro hash demo trong du lieu seed", () => {
    expect(verifyPassword("123456", "DEMO_HASH_123456")).toBe(true);
    expect(verifyPassword("000000", "DEMO_HASH_123456")).toBe(false);
  });
});
