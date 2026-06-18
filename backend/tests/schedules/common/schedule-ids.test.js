import { describe, expect, test } from "@jest/globals";
import { parsePositiveId, uniquePositiveIds } from "../../../src/utils/schedule-ids.js";

describe("schedule-ids", () => {
  test("parsePositiveId chi nhan so nguyen duong", () => {
    expect(parsePositiveId("10")).toBe(10);
    expect(parsePositiveId(1)).toBe(1);
    expect(parsePositiveId("0")).toBeNull();
    expect(parsePositiveId("-2")).toBeNull();
    expect(parsePositiveId("1.5")).toBeNull();
  });

  test("uniquePositiveIds loai du lieu khong hop le va trung lap", () => {
    expect(uniquePositiveIds(["1", 2, "3"])).toEqual([1, 2, 3]);
    expect(uniquePositiveIds(["1", "1"])).toBeNull();
    expect(uniquePositiveIds(["1", "abc"])).toBeNull();
    expect(uniquePositiveIds("1,2")).toEqual([]);
  });
});
