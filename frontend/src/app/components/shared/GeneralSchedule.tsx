import { useEffect, useMemo, useState } from "react";
import type { Range } from "xlsx";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  fetchGeneralSchedule,
  type GeneralScheduleItem,
  type ScheduleRoom,
  type ScheduleShift,
} from "../../lib/scheduleApi";

interface GeneralScheduleProps {
  readOnly?: boolean;
}

interface WeekDay {
  isoDate: string;
  label: string;
  dateLabel: string;
}

interface DepartmentGroup {
  id: number;
  code: string;
  name: string;
  rooms: ScheduleRoom[];
}

const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysIso(value: string, days: number) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function getCurrentWeekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toIsoDate(date);
}

function formatShortDate(value: string) {
  const date = dateFromIso(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createWeekDays(weekStart: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const isoDate = addDaysIso(weekStart, index);
    const date = dateFromIso(isoDate);

    return {
      isoDate,
      label: weekdayLabels[date.getDay()],
      dateLabel: formatShortDate(isoDate),
    };
  });
}

function shortShiftName(shift: ScheduleShift) {
  const name = shift.shiftName.replace(/^Ca\s+/i, "").trim();
  return name.toLocaleUpperCase("vi-VN");
}

function formatTimeRange(shift: ScheduleShift) {
  return `${shift.startTime} - ${shift.endTime}`;
}

function getPositionPrefix(position: string) {
  const normalized = position.toLowerCase();

  if (normalized.includes("bác") || normalized.includes("bac")) return "Bs.";
  if (normalized.includes("điều") || normalized.includes("dieu")) return "ĐD.";
  if (normalized.includes("y tá") || normalized.includes("y ta"))
    return "Y tá.";
  if (normalized.includes("kỹ") || normalized.includes("ky")) return "KTV.";
  if (normalized.includes("trưởng") || normalized.includes("truong"))
    return "TK.";

  return position || "NV";
}

function formatAssignmentName(
  assignment: Pick<GeneralScheduleItem, "position" | "fullName">,
) {
  return `${getPositionPrefix(assignment.position)} ${assignment.fullName}`.trim();
}

function groupDepartments(rooms: ScheduleRoom[]): DepartmentGroup[] {
  const grouped = new Map<number, DepartmentGroup>();

  rooms.forEach((room) => {
    if (!grouped.has(room.departmentId)) {
      grouped.set(room.departmentId, {
        id: room.departmentId,
        code: room.departmentCode,
        name: room.departmentName,
        rooms: [],
      });
    }

    grouped.get(room.departmentId)?.rooms.push(room);
  });

  return Array.from(grouped.values()).map((department) => ({
    ...department,
    rooms: department.rooms.length
      ? department.rooms
      : [
          {
            departmentId: department.id,
            departmentCode: department.code,
            departmentName: department.name,
            roomId: null,
            roomCode: "-",
            roomName: "Chưa có phòng",
          },
        ],
  }));
}

function cellKey(roomId: number | null, dutyDate: string, shiftId: number) {
  return `${roomId || "none"}-${dutyDate}-${shiftId}`;
}

export function GeneralSchedule(_props: GeneralScheduleProps) {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [rooms, setRooms] = useState<ScheduleRoom[]>([]);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [items, setItems] = useState<GeneralScheduleItem[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchGeneralSchedule(weekStart);

        if (cancelled) return;
        setRooms(response.rooms);
        setShifts(response.shifts);
        setItems(response.data);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải lịch trực tổng quát.",
        );
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const days = useMemo(() => createWeekDays(weekStart), [weekStart]);
  const weekEnd = addDaysIso(weekStart, 6);
  const weekOptions = useMemo(() => {
    const currentWeekStart = getCurrentWeekStart();
    const options = Array.from({ length: 17 }, (_, index) => {
      const start = addDaysIso(currentWeekStart, (index - 8) * 7);
      const end = addDaysIso(start, 6);

      return {
        value: start,
        label: `${formatShortDate(start)} - ${formatShortDate(end)}/${dateFromIso(end).getFullYear()}`,
      };
    });

    if (!options.some((option) => option.value === weekStart)) {
      options.push({
        value: weekStart,
        label: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}/${dateFromIso(weekEnd).getFullYear()}`,
      });
    }

    return options.sort((left, right) => left.value.localeCompare(right.value));
  }, [weekEnd, weekStart]);

  const departmentGroups = useMemo(() => groupDepartments(rooms), [rooms]);
  const visibleGroups = departmentGroups.filter(
    (department) =>
      departmentFilter === "all" || department.id === Number(departmentFilter),
  );
  const visibleShifts = shifts.filter(
    (shift) => shiftFilter === "all" || shift.shiftId === Number(shiftFilter),
  );

  const assignmentsByCell = useMemo(() => {
    const mapped = new Map<string, GeneralScheduleItem[]>();

    items.forEach((item) => {
      const key = cellKey(item.roomId, item.dutyDate, item.shiftId);
      const current = mapped.get(key) || [];
      current.push(item);
      mapped.set(key, current);
    });

    return mapped;
  }, [items]);

  function moveWeek(daysToMove: number) {
    setWeekStart((current) => addDaysIso(current, daysToMove));
  }

  function handleReset() {
    setDepartmentFilter("all");
    setShiftFilter("all");
    setWeekStart(getCurrentWeekStart());
  }

  async function handleExportExcel() {
    const XLSX = await import("xlsx");
    const exportShifts = visibleShifts;
    const shiftSpan = Math.max(exportShifts.length, 1);
    const columnCount = 2 + days.length * shiftSpan;
    const title = `Lịch trực tổng quát tuần ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}/${dateFromIso(weekEnd).getFullYear()}`;
    const rows: string[][] = [
      [title, ...Array(columnCount - 1).fill("")],
      ["Khoa", "Phòng", ...Array(columnCount - 2).fill("")],
      ["", "", ...Array(columnCount - 2).fill("")],
    ];
    const merges: Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    ];

    days.forEach((day, dayIndex) => {
      const startColumn = 2 + dayIndex * shiftSpan;
      rows[1][startColumn] = `${day.label}\n${day.dateLabel}`;

      if (shiftSpan > 1) {
        merges.push({
          s: { r: 1, c: startColumn },
          e: { r: 1, c: startColumn + shiftSpan - 1 },
        });
      }

      if (exportShifts.length) {
        exportShifts.forEach((shift, shiftIndex) => {
          rows[2][startColumn + shiftIndex] = shortShiftName(shift);
        });
      } else {
        rows[2][startColumn] = "-";
      }
    });

    visibleGroups.forEach((department) => {
      const departmentStartRow = rows.length;

      department.rooms.forEach((room, roomIndex) => {
        const row = Array(columnCount).fill("");
        row[0] = roomIndex === 0 ? department.name : "";
        row[1] = room.roomCode || "-";

        days.forEach((day, dayIndex) => {
          const startColumn = 2 + dayIndex * shiftSpan;

          if (!exportShifts.length) {
            row[startColumn] = "";
            return;
          }

          exportShifts.forEach((shift, shiftIndex) => {
            const assignments =
              assignmentsByCell.get(
                cellKey(room.roomId, day.isoDate, shift.shiftId),
              ) || [];
            row[startColumn + shiftIndex] = assignments
              .map(formatAssignmentName)
              .join("\n");
          });
        });

        rows.push(row);
      });

      if (department.rooms.length > 1) {
        merges.push({
          s: { r: departmentStartRow, c: 0 },
          e: { r: rows.length - 1, c: 0 },
        });
      }
    });

    if (visibleGroups.length === 0) {
      const emptyRow = Array(columnCount).fill("");
      emptyRow[0] = "Không có dữ liệu";
      rows.push(emptyRow);
      merges.push({
        s: { r: rows.length - 1, c: 0 },
        e: { r: rows.length - 1, c: columnCount - 1 },
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      ...Array(days.length * shiftSpan)
        .fill(null)
        .map(() => ({ wch: 24 })),
    ];
    worksheet["!rows"] = rows.map((_, index) => ({
      hpt: index === 0 ? 26 : index < 3 ? 22 : 48,
    }));

    Object.keys(worksheet).forEach((cellAddress) => {
      if (cellAddress.startsWith("!")) return;
      const cell = worksheet[cellAddress];
      cell.s = {
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } },
        },
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch trực");
    XLSX.writeFile(
      workbook,
      `lich-truc-tong-quat-${weekStart}-${weekEnd}.xlsx`,
    );
  }

  return (
    <div className="h-full min-h-0 max-w-full overflow-hidden flex flex-col gap-5">
      <div className="shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Lịch trực tổng quát
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tuần {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}/
            {dateFromIso(weekEnd).getFullYear()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-center flex-wrap shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={15} />
          <span className="font-medium">Lọc:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveWeek(-7)}
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Tuần trước"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <select
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
            className="w-56 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => moveWeek(7)}
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Tuần sau"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
        <select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">Tất cả khoa</option>
          {departmentGroups.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          value={shiftFilter}
          onChange={(event) => setShiftFilter(event.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">Tất cả ca</option>
          {shifts.map((shift) => (
            <option key={shift.shiftId} value={shift.shiftId}>
              {shift.shiftName} ({formatTimeRange(shift)})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-600"
        >
          <RotateCcw size={13} /> Đặt lại
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-teal-700 rounded-lg text-sm hover:bg-teal-50 text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={13} /> Xuất Excel
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg shrink-0">
          <AlertCircle
            size={16}
            className="text-red-500 flex-shrink-0 mt-0.5"
          />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-full flex-1 min-h-0">
        <div className="h-full max-w-full overflow-auto">
          <table className="text-xs border-separate border-spacing-0 min-w-max w-full">
            <thead className="sticky top-0 z-20 bg-gray-50">
              <tr className="bg-gray-50">
                <th
                  rowSpan={2}
                  className="border border-gray-200 px-2 py-2 font-semibold text-gray-700 text-center align-middle w-14 min-w-14 sticky left-0 bg-gray-50 z-30 shadow-[inset_-1px_0_0_#e5e7eb,inset_0_-1px_0_#e5e7eb]"
                >
                  Khoa
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-200 px-3 py-2 font-semibold text-gray-700 text-center align-middle w-20 min-w-20 sticky left-14 bg-gray-50 z-30 shadow-[inset_-1px_0_0_#e5e7eb,inset_0_-1px_0_#e5e7eb]"
                >
                  Phòng
                </th>
                {days.map((day) => (
                  <th
                    key={day.isoDate}
                    colSpan={visibleShifts.length || 1}
                    className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-800 shadow-[inset_0_-1px_0_#e5e7eb,inset_-1px_0_0_#e5e7eb]"
                  >
                    <div>{day.label}</div>
                    <div className="text-[11px] font-normal text-gray-400">
                      {day.dateLabel}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {days.map((day) =>
                  visibleShifts.length ? (
                    visibleShifts.map((shift) => (
                      <th
                        key={`${day.isoDate}-${shift.shiftId}`}
                        className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 min-w-36 whitespace-nowrap shadow-[inset_0_-1px_0_#e5e7eb,inset_-1px_0_0_#e5e7eb]"
                        title={`${shift.shiftName} ${formatTimeRange(shift)}`}
                      >
                        {shortShiftName(shift)}
                      </th>
                    ))
                  ) : (
                    <th
                      key={`${day.isoDate}-none`}
                      className="border border-gray-200 px-2 py-1.5 min-w-36 shadow-[inset_0_-1px_0_#e5e7eb,inset_-1px_0_0_#e5e7eb]"
                    >
                      -
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={
                      2 + days.length * Math.max(visibleShifts.length, 1)
                    }
                    className="text-center py-10 text-gray-400"
                  >
                    Đang tải lịch trực tổng quát...
                  </td>
                </tr>
              )}

              {!loading &&
                visibleGroups.map((department) =>
                  department.rooms.map((room, roomIndex) => (
                    <tr
                      key={`${department.id}-${room.roomId || room.roomCode}`}
                      className="hover:bg-gray-50"
                    >
                      {roomIndex === 0 && (
                        <td
                          rowSpan={department.rooms.length}
                          className="border border-gray-200 bg-white sticky left-0 z-10 align-middle text-center w-14 min-w-14 p-0 shadow-[inset_-1px_0_0_#e5e7eb]"
                        >
                          <div
                            className="mx-auto inline-flex items-center justify-center text-center text-[13px] font-semibold text-gray-800 leading-tight"
                            style={{
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                            }}
                          >
                            {department.name}
                          </div>
                        </td>
                      )}
                      <td className="border border-gray-200 px-2 py-3 font-semibold text-gray-800 text-center align-middle sticky left-14 bg-white z-10 w-20 min-w-20 shadow-[inset_-1px_0_0_#e5e7eb]">
                        <div>{room.roomCode || "-"}</div>
                      </td>
                      {days.map((day) =>
                        visibleShifts.length ? (
                          visibleShifts.map((shift) => {
                            const assignments =
                              assignmentsByCell.get(
                                cellKey(
                                  room.roomId,
                                  day.isoDate,
                                  shift.shiftId,
                                ),
                              ) || [];

                            return (
                              <td
                                key={`${day.isoDate}-${shift.shiftId}`}
                                className="border border-gray-200 px-2 py-2 align-middle text-center min-w-36 h-24 bg-white"
                              >
                                <div className="min-h-20 flex flex-col items-center justify-center gap-1">
                                  {assignments.map((assignment) => (
                                    <div
                                      key={assignment.scheduleId}
                                      className="inline-flex max-w-36 items-center justify-center gap-1 rounded-md bg-teal-50 border border-teal-100 px-2 py-1 text-[12px] leading-snug text-gray-900 font-medium text-center break-words"
                                      title={`${formatAssignmentName(assignment)} - ${assignment.employeeCode}`}
                                    >
                                      <span className="font-semibold text-teal-700">
                                        {getPositionPrefix(assignment.position)}
                                      </span>
                                      <span>{assignment.fullName}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })
                        ) : (
                          <td
                            key={`${day.isoDate}-none`}
                            className="border border-gray-200 px-2 py-2 min-w-36 h-24"
                          />
                        ),
                      )}
                    </tr>
                  )),
                )}

              {!loading && visibleGroups.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      2 + days.length * Math.max(visibleShifts.length, 1)
                    }
                    className="text-center py-10 text-gray-400"
                  >
                    Không có khoa/phòng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
