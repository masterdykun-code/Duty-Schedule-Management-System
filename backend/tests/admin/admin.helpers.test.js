import { describe, expect, jest, test } from "@jest/globals";
import {
  emptyToNull,
  isValidEmail,
  isValidPhone,
  normalizeGender,
  normalizeShiftDepartmentConfigs,
  normalizeShiftType,
  normalizeStatus,
  parsePositiveId,
} from "../../src/modules/admin/controllers/admin.helpers.js";
import { AdminRepository } from "../../src/modules/admin/repositories/admin.repository.js";

describe("admin.helpers", () => {
  test("normalize cac gia tri co ban", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("abc")).toBe("abc");
    expect(parsePositiveId("7")).toBe(7);
    expect(normalizeStatus("ACTIVE")).toBe("ACTIVE");
    expect(normalizeStatus("UNKNOWN", "INACTIVE")).toBe("INACTIVE");
    expect(normalizeGender("MALE")).toBe("MALE");
    expect(normalizeGender("BAD")).toBeNull();
    expect(normalizeShiftType("SANG")).toBe("SANG");
    expect(normalizeShiftType("DEM")).toBeNull();
  });

  test("kiem tra email va so dien thoai", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
    expect(isValidEmail(null)).toBe(true);

    expect(isValidPhone("0912345678")).toBe(true);
    expect(isValidPhone("09123")).toBe(false);
    expect(isValidPhone("")).toBe(true);
  });

  test("normalizeShiftDepartmentConfigs tra config hop le", () => {
    const result = normalizeShiftDepartmentConfigs([
      { department_id: "1", is_required: true, min_staff: "1", max_staff: "2" },
      { department_id: 2, is_required: false, min_staff: 0, max_staff: 1 },
    ]);

    expect(result).toEqual([
      { departmentId: 1, isRequired: true, minStaff: 1, maxStaff: 2 },
      { departmentId: 2, isRequired: false, minStaff: 0, maxStaff: 1 },
    ]);
  });

  test("normalizeShiftDepartmentConfigs tra null khi config sai", () => {
    expect(normalizeShiftDepartmentConfigs(null)).toBeNull();
    expect(normalizeShiftDepartmentConfigs([{ department_id: 1 }, { department_id: 1 }])).toBeNull();
    expect(normalizeShiftDepartmentConfigs([{ department_id: 1, min_staff: 3, max_staff: 2 }])).toBeNull();
  });

  test("generateEmployeeCode va generateShiftCode dung ket qua query", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ next_number: 12 }] })
        .mockResolvedValueOnce({ rows: [{ next_number: 4 }] }),
    };

    await expect(AdminRepository.generateEmployeeCode(client)).resolves.toBe("NV012");
    await expect(AdminRepository.generateShiftCode(client)).resolves.toBe("CA004");
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});

