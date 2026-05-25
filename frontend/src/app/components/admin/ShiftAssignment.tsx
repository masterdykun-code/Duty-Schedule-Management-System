import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  autoAssignSchedule,
  fetchAssignmentSchedule,
  resetAssignmentSchedule,
  saveAssignmentCell,
  validateAssignmentSchedule,
  type AssignableEmployee,
  type GeneralScheduleItem,
  type MissingAssignment,
  type RequiredShiftConfig,
  type ScheduleRoom,
  type ScheduleShift,
} from "../../lib/scheduleApi";

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

interface SelectedCell {
  departmentId: number;
  departmentName: string;
  roomId: number;
  roomCode: string;
  dutyDate: string;
  dayLabel: string;
  shiftId: number;
  shiftName: string;
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

function formatWeekLabel(weekStart: string) {
  const weekEnd = addDaysIso(weekStart, 6);
  return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}/${dateFromIso(weekEnd).getFullYear()}`;
}

function shortShiftName(shift: ScheduleShift) {
  return shift.shiftName.replace(/^Ca\s+/i, "").trim().toLocaleUpperCase("vi-VN");
}

function formatTimeRange(shift: Pick<ScheduleShift, "startTime" | "endTime">) {
  return `${shift.startTime} - ${shift.endTime}`;
}

function getPositionPrefix(position: string) {
  const normalized = position.toLowerCase();

  if (normalized.includes("bác") || normalized.includes("bac")) return "Bs.";
  if (normalized.includes("điều") || normalized.includes("dieu")) return "ĐD.";
  if (normalized.includes("y tá") || normalized.includes("y ta")) return "Y tá.";
  if (normalized.includes("kỹ") || normalized.includes("ky")) return "KTV.";
  if (normalized.includes("trưởng") || normalized.includes("truong")) return "TK.";

  return position || "NV";
}

function formatAssignmentName(assignment: Pick<GeneralScheduleItem, "position" | "fullName">) {
  return `${getPositionPrefix(assignment.position)} ${assignment.fullName}`.trim();
}

function groupDepartments(rooms: ScheduleRoom[]): DepartmentGroup[] {
  const grouped = new Map<number, DepartmentGroup>();

  rooms.forEach((room) => {
    if (!room.roomId) return;

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

  return Array.from(grouped.values());
}

function cellKey(roomId: number, dutyDate: string, shiftId: number) {
  return `${roomId}-${dutyDate}-${shiftId}`;
}

function configKey(departmentId: number, shiftId: number) {
  return `${departmentId}-${shiftId}`;
}

export function ShiftAssignment() {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [rooms, setRooms] = useState<ScheduleRoom[]>([]);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [items, setItems] = useState<GeneralScheduleItem[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [requiredShifts, setRequiredShifts] = useState<RequiredShiftConfig[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedNote, setSelectedNote] = useState("");
  const [missingAssignments, setMissingAssignments] = useState<MissingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const days = useMemo(() => createWeekDays(weekStart), [weekStart]);
  const weekEnd = addDaysIso(weekStart, 6);
  const weekOptions = useMemo(() => {
    const currentWeekStart = getCurrentWeekStart();
    const options = Array.from({ length: 17 }, (_, index) => {
      const start = addDaysIso(currentWeekStart, (index - 8) * 7);
      return { value: start, label: formatWeekLabel(start) };
    });

    if (!options.some((option) => option.value === weekStart)) {
      options.push({ value: weekStart, label: formatWeekLabel(weekStart) });
    }

    return options.sort((left, right) => left.value.localeCompare(right.value));
  }, [weekStart]);

  const departmentGroups = useMemo(() => groupDepartments(rooms), [rooms]);
  const visibleGroups = departmentGroups.filter(
    (department) => departmentFilter === "all" || department.id === Number(departmentFilter),
  );
  const visibleShifts = shifts.filter(
    (shift) => shiftFilter === "all" || shift.shiftId === Number(shiftFilter),
  );

  const configByDepartmentShift = useMemo(() => {
    const mapped = new Map<string, RequiredShiftConfig>();
    requiredShifts.forEach((config) => {
      mapped.set(configKey(config.departmentId, config.shiftId), config);
    });
    return mapped;
  }, [requiredShifts]);

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

  const selectedConfig = selectedCell
    ? configByDepartmentShift.get(configKey(selectedCell.departmentId, selectedCell.shiftId)) || null
    : null;

  const selectedAssignments = selectedCell
    ? assignmentsByCell.get(cellKey(selectedCell.roomId, selectedCell.dutyDate, selectedCell.shiftId)) || []
    : [];

  const candidateEmployees = selectedCell
    ? employees.filter((employee) => employee.departmentId === selectedCell.departmentId)
    : [];

  useEffect(() => {
    loadSchedule();
  }, [weekStart]);

  useEffect(() => {
    if (!selectedCell) {
      setSelectedEmployeeIds([]);
      setSelectedNote("");
      return;
    }

    setSelectedEmployeeIds(selectedAssignments.map((assignment) => assignment.employeeId));
    setSelectedNote(selectedAssignments[0]?.note || "");
  }, [selectedCell, items]);

  async function loadSchedule() {
    try {
      setLoading(true);
      setError("");
      const response = await fetchAssignmentSchedule(weekStart);
      setRooms(response.rooms);
      setShifts(response.shifts);
      setItems(response.data);
      setEmployees(response.employees);
      setRequiredShifts(response.requiredShifts);
      setMissingAssignments([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu phân công.");
    } finally {
      setLoading(false);
    }
  }

  function moveWeek(daysToMove: number) {
    setWeekStart((current) => addDaysIso(current, daysToMove));
    setSelectedCell(null);
  }

  function handleReset() {
    setDepartmentFilter("all");
    setShiftFilter("all");
    setWeekStart(getCurrentWeekStart());
    setSelectedCell(null);
    setNotice("");
    setError("");
  }

  function handleCellClick(room: ScheduleRoom, day: WeekDay, shift: ScheduleShift) {
    if (!room.roomId) return;

    const config = configByDepartmentShift.get(configKey(room.departmentId, shift.shiftId));
    if (!config) return;

    setSelectedCell({
      departmentId: room.departmentId,
      departmentName: room.departmentName,
      roomId: room.roomId,
      roomCode: room.roomCode || "-",
      dutyDate: day.isoDate,
      dayLabel: `${day.label} ${day.dateLabel}`,
      shiftId: shift.shiftId,
      shiftName: shift.shiftName,
    });
    setError("");
    setNotice("");
  }

  function setEmployeeAt(index: number, value: string) {
    const employeeId = value ? Number(value) : null;
    setSelectedEmployeeIds((current) => {
      const next = [...current];

      if (!employeeId) {
        next.splice(index, 1);
        return next;
      }

      next[index] = employeeId;
      return next.filter((id, itemIndex, arr) => id && arr.indexOf(id) === itemIndex);
    });
  }

  async function handleSaveCell(employeeIds = selectedEmployeeIds) {
    if (!selectedCell) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");
      await saveAssignmentCell({
        duty_date: selectedCell.dutyDate,
        room_id: selectedCell.roomId,
        shift_id: selectedCell.shiftId,
        employee_ids: employeeIds,
        note: employeeIds.length ? selectedNote.trim() || null : null,
      });
      await loadSchedule();
      setNotice("Đã lưu phân công.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu phân công.");
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const result = await validateAssignmentSchedule(weekStart);
      setMissingAssignments(result.missing);

      if (result.complete) {
        setNotice("Lịch trực đã được phân công đầy đủ.");
      } else {
        setError("Vui lòng phân công đầy đủ các ca trực bắt buộc.");
      }
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : "Không thể kiểm tra lịch trực.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoAssign() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const result = await autoAssignSchedule(weekStart);
      await loadSchedule();
      setMissingAssignments(result.remainingMissing);

      if (result.remainingMissingCount > 0) {
        setError(`${result.message}. Còn ${result.remainingMissingCount} ô chưa đủ người.`);
      } else {
        setNotice(`${result.message}. Đã thêm ${result.createdCount} phân công.`);
      }
    } catch (autoError) {
      setError(autoError instanceof Error ? autoError.message : "Không thể phân công tự động.");
    } finally {
      setSaving(false);
    }
  }

  function handleResetAssignments() {
    setShowResetConfirm(true);
  }

  async function confirmResetAssignments() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const result = await resetAssignmentSchedule(weekStart);
      setShowResetConfirm(false);
      setSelectedCell(null);
      await loadSchedule();
      setNotice(`${result.message}. Đã xóa ${result.updatedCount} phân công.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Không thể reset phân công.");
    } finally {
      setSaving(false);
    }
  }

  function getMissingCell(roomId: number, dutyDate: string, shiftId: number) {
    return missingAssignments.find(
      (item) => item.roomId === roomId && item.dutyDate === dutyDate && item.shiftId === shiftId,
    );
  }

  return (
    <div className="h-full min-h-0 max-w-full overflow-hidden flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Phân công lịch trực</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tuần {formatWeekLabel(weekStart)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoAssign}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles size={15} /> Phân công tự động
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle size={15} /> Kiểm tra đầy đủ
          </button>
          <button
            type="button"
            onClick={handleResetAssignments}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={15} /> Reset phân công
          </button>
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
            onChange={(event) => {
              setWeekStart(event.target.value);
              setSelectedCell(null);
            }}
            className="w-56 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>{week.label}</option>
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
            <option key={department.id} value={department.id}>{department.name}</option>
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
      </div>

      {(error || notice) && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border shrink-0 ${
          error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
        }`}>
          <AlertCircle size={16} className={`flex-shrink-0 mt-0.5 ${error ? "text-red-500" : "text-emerald-600"}`} />
          <p className={`text-sm ${error ? "text-red-600" : "text-emerald-700"}`}>{error || notice}</p>
        </div>
      )}

      {missingAssignments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 shrink-0">
          <div className="font-medium mb-1">Các ca còn thiếu:</div>
          <div className="flex flex-wrap gap-2">
            {missingAssignments.slice(0, 8).map((item) => (
              <span key={`${item.roomId}-${item.dutyDate}-${item.shiftId}`} className="rounded-md bg-white/70 px-2 py-1">
                {formatShortDate(item.dutyDate)} - {item.roomCode} - {item.shiftName}: {item.assignedCount}/{item.minStaff}
              </span>
            ))}
            {missingAssignments.length > 8 && <span className="px-2 py-1">+{missingAssignments.length - 8} ca</span>}
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-full flex-1 min-h-0">
          <div className="h-full max-w-full overflow-auto">
            <table className="text-xs border-separate border-spacing-0 min-w-max w-full">
              <thead className="sticky top-0 z-20 bg-gray-50">
                <tr className="bg-gray-50">
                  <th rowSpan={2} className="border border-gray-200 px-2 py-2 font-semibold text-gray-700 text-center align-middle w-14 min-w-14 sticky left-0 bg-gray-50 z-30 shadow-[inset_-1px_0_0_#e5e7eb,inset_0_-1px_0_#e5e7eb]">
                    Khoa
                  </th>
                  <th rowSpan={2} className="border border-gray-200 px-3 py-2 font-semibold text-gray-700 text-center align-middle w-20 min-w-20 sticky left-14 bg-gray-50 z-30 shadow-[inset_-1px_0_0_#e5e7eb,inset_0_-1px_0_#e5e7eb]">
                    Phòng
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.isoDate}
                      colSpan={visibleShifts.length || 1}
                      className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-800 shadow-[inset_0_-1px_0_#e5e7eb,inset_-1px_0_0_#e5e7eb]"
                    >
                      <div>{day.label}</div>
                      <div className="text-[11px] font-normal text-gray-400">{day.dateLabel}</div>
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
                        >
                          {shortShiftName(shift)}
                        </th>
                      ))
                    ) : (
                      <th key={`${day.isoDate}-none`} className="border border-gray-200 px-2 py-1.5 min-w-36">-</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={2 + days.length * Math.max(visibleShifts.length, 1)} className="text-center py-10 text-gray-400">
                      Đang tải dữ liệu phân công...
                    </td>
                  </tr>
                )}

                {!loading && visibleGroups.map((department) =>
                  department.rooms.map((room, roomIndex) => (
                    <tr key={`${department.id}-${room.roomId || room.roomCode}`} className="hover:bg-gray-50">
                      {roomIndex === 0 && (
                        <td rowSpan={department.rooms.length} className="border border-gray-200 bg-white sticky left-0 z-10 align-middle text-center w-14 min-w-14 p-0 shadow-[inset_-1px_0_0_#e5e7eb]">
                          <div className="mx-auto inline-flex items-center justify-center text-center text-[13px] font-semibold text-gray-800 leading-tight" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
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
                            const config = configByDepartmentShift.get(configKey(department.id, shift.shiftId));
                            const assignments = room.roomId
                              ? assignmentsByCell.get(cellKey(room.roomId, day.isoDate, shift.shiftId)) || []
                              : [];
                            const missing = room.roomId ? getMissingCell(room.roomId, day.isoDate, shift.shiftId) : null;
                            const isSelected =
                              selectedCell?.roomId === room.roomId &&
                              selectedCell?.dutyDate === day.isoDate &&
                              selectedCell?.shiftId === shift.shiftId;

                            return (
                              <td
                                key={`${day.isoDate}-${shift.shiftId}`}
                                onClick={() => config && room.roomId && handleCellClick(room, day, shift)}
                                className={`border border-gray-200 px-2 py-2 align-middle text-center min-w-36 h-24 transition-colors ${
                                  !config
                                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-teal-100 ring-2 ring-inset ring-teal-500 cursor-pointer"
                                      : missing
                                        ? "bg-amber-50 hover:bg-amber-100 cursor-pointer"
                                        : assignments.length
                                          ? "bg-teal-50 hover:bg-teal-100 cursor-pointer"
                                          : "bg-white hover:bg-gray-50 cursor-pointer"
                                }`}
                              >
                                {!config ? (
                                  <span className="text-gray-300">-</span>
                                ) : (
                                  <div className="min-h-20 flex flex-col items-center justify-center gap-1">
                                    {assignments.length ? assignments.map((assignment) => (
                                      <div
                                        key={assignment.scheduleId}
                                        className="inline-flex max-w-36 items-center justify-center gap-1 rounded-md bg-white border border-teal-100 px-2 py-1 text-[12px] leading-snug text-gray-900 font-medium text-center break-words"
                                        title={`${formatAssignmentName(assignment)} - ${assignment.employeeCode}`}
                                      >
                                        <span className="font-semibold text-teal-700">{getPositionPrefix(assignment.position)}</span>
                                        <span>{assignment.fullName}</span>
                                      </div>
                                    )) : (
                                      <span className="text-gray-300">Trống</span>
                                    )}
                                    {config.isRequired && (
                                      <span className={`text-[11px] ${missing ? "text-amber-700" : "text-gray-400"}`}>
                                        {assignments.length}/{config.minStaff}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })
                        ) : (
                          <td key={`${day.isoDate}-none`} className="border border-gray-200 px-2 py-2 min-w-36 h-24" />
                        )
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCell && selectedConfig && (
          <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col flex-shrink-0 min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Phân công ca trực</h3>
              <button type="button" onClick={() => setSelectedCell(null)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <InfoRow label="Khoa" value={selectedCell.departmentName} />
              <InfoRow label="Phòng" value={selectedCell.roomCode} />
              <InfoRow label="Ngày" value={selectedCell.dayLabel} />
              <InfoRow label="Ca" value={selectedCell.shiftName} />
              <InfoRow label="Yêu cầu" value={`${selectedConfig.isRequired ? "Bắt buộc" : "Không bắt buộc"} - tối thiểu ${selectedConfig.minStaff}, tối đa ${selectedConfig.maxStaff}`} />

              <div className="pt-1 space-y-2">
                {Array.from({ length: selectedConfig.maxStaff }, (_, index) => {
                  const value = selectedEmployeeIds[index] || "";
                  const usedIds = new Set(selectedEmployeeIds.filter((_, itemIndex) => itemIndex !== index));
                  const options = candidateEmployees.filter((employee) => !usedIds.has(employee.employeeId));

                  return (
                    <div key={index}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Nhân viên {index + 1}
                      </label>
                      <select
                        value={value}
                        onChange={(event) => setEmployeeAt(index, event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      >
                        <option value="">Chưa chọn</option>
                        {options.map((employee) => (
                          <option key={employee.employeeId} value={employee.employeeId}>
                            {getPositionPrefix(employee.position)} {employee.fullName} ({employee.employeeCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {candidateEmployees.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Khoa này chưa có nhân viên đang hoạt động để phân công.
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={selectedNote}
                  onChange={(event) => setSelectedNote(event.target.value)}
                  rows={3}
                  placeholder="Nhập ghi chú cho ca trực..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {selectedConfig.isRequired && selectedEmployeeIds.length < selectedConfig.minStaff && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Ca này cần tối thiểu {selectedConfig.minStaff} người. Bạn có thể lưu tạm, hệ thống sẽ báo thiếu khi kiểm tra đầy đủ.
                </p>
              )}
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveCell([])}
                disabled={saving}
                className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-60"
              >
                Xóa ô
              </button>
              <button
                type="button"
                onClick={() => handleSaveCell()}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-sm hover:bg-teal-800 disabled:opacity-60"
              >
                <Save size={14} /> Lưu phân công
              </button>
            </div>
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  Reset phân công?
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tuần {formatWeekLabel(weekStart)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={saving}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 px-5 py-4 text-sm text-gray-600">
              <p>
                Bạn có chắc chắn muốn xóa toàn bộ lịch đã phân công trong tuần này không?
              </p>
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">
                Thao tác này sẽ chuyển các phân công hiện tại sang trạng thái hủy.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmResetAssignments}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 size={15} />
                {saving ? "Đang reset..." : "Reset phân công"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
