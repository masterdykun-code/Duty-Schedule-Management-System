import { describe, expect, test } from "@jest/globals";
import {
  addDaysIso,
  dateFromIso,
  formatIsoDate,
  getRequestedWeekStart,
  isValidIsoDate,
} from "../../../src/utils/schedule-date.js";

describe("schedule-date", () => {
  test("formatIsoDate va dateFromIso chuyen doi ngay ISO", () => {
    const date = dateFromIso("2026-05-26");

    expect(formatIsoDate(date)).toBe("2026-05-26");
  });

  test("addDaysIso cong tru ngay qua ranh gioi thang", () => {
    expect(addDaysIso("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDaysIso("2026-06-01", -1)).toBe("2026-05-31");
  });

  test("isValidIsoDate chi chap nhan ngay co that", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("26-02-28")).toBe(false);
  });

  test("getRequestedWeekStart tra null khi dinh dang sai", () => {
    expect(getRequestedWeekStart("2026-05-25")).toBe("2026-05-25");
    expect(getRequestedWeekStart("2026-13-01")).toBeNull();
  });
});
