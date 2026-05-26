import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { StatusBadge, type BadgeStatus } from "../StatusBadge";
import type { AuthUser } from "../../lib/auth";
import {
  fetchMySchedule,
  fetchScheduleDetail,
  type MyScheduleItem,
  type MyScheduleProfile,
  type ScheduleDetailResponse,
  type ScheduleShift,
} from "../../lib/scheduleApi";
import { ScheduleDetailModal } from "./personal/ScheduleDetailModal";
import { SwapRequestModal } from "./personal/SwapRequestModal";

interface PersonalScheduleProps {
  user: AuthUser;
}

interface WeekDay {
  label: string;
  dateLabel: string;
  isoDate: string;
}

interface ShiftColumn {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
}

interface SelectedCell {
  date: string;
  shiftCode: string;
}

const weekdayLabels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

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

function formatTimeRange(shift: Pick<ShiftColumn, "startTime" | "endTime">) {
  return `${shift.startTime} - ${shift.endTime}`;
}

function getShiftClass(shift: ShiftColumn) {
  const key = `${shift.code} ${shift.name} ${shift.type}`.toUpperCase();

  if (key.includes("SANG") || key.includes("SÁNG")) return "text-amber-600";
  if (key.includes("CHIEU") || key.includes("CHIỀU")) return "text-blue-600";
  if (key.includes("CAP_CUU") || key.includes("CẤP CỨU")) return "text-red-600";
  if (key.includes("HANH") || key.includes("HÀNH")) return "text-teal-700";

  return "text-gray-700";
}

function getSwapBadge(status: string): BadgeStatus | null {
  if (status === "PENDING_RESPONSE") return "waiting_response";
  if (status === "PENDING_APPROVAL") return "waiting_process";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "EXPIRED") return "expired";

  return null;
}

function formatRoom(code: string, name: string) {
  if (!code && !name) return "Chưa cập nhật";
  if (!name) return code;
  return `${code} - ${name}`;
}

export function PersonalSchedule({ user }: PersonalScheduleProps) {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [profile, setProfile] = useState<MyScheduleProfile | null>(null);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [items, setItems] = useState<MyScheduleItem[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ScheduleDetailResponse | null>(null);
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadSchedule();
  }, [weekStart]);

  const days = useMemo(() => createWeekDays(weekStart), [weekStart]);

  const shiftColumns = useMemo(() => {
    return shifts
      .map((shift) => ({
        code: shift.shiftCode,
        name: shift.shiftName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.shiftType,
      }))
      .sort((left, right) =>
        left.startTime.localeCompare(right.startTime) || left.name.localeCompare(right.name),
      );
  }, [shifts]);

  const scheduleByCell = useMemo(() => {
    const mapped = new Map<string, MyScheduleItem>();
    items.forEach((item) => {
      mapped.set(`${item.dutyDate}-${item.shiftCode}`, item);
    });
    return mapped;
  }, [items]);

  const selectedData = selectedCell
    ? scheduleByCell.get(`${selectedCell.date}-${selectedCell.shiftCode}`) || null
    : null;

  const weekEnd = addDaysIso(weekStart, 6);
  const displayProfile = profile || {
    fullName: user.name,
    employeeCode: user.employeeCode || "",
    position: user.position || "",
    departmentName: user.departmentName || "Chưa cập nhật",
    roomCode: "",
    roomName: user.roomName || "",
  };

  async function loadSchedule() {
    try {
      setLoading(true);
      setError("");
      const response = await fetchMySchedule(weekStart);

      setProfile(response.profile);
      setShifts(response.shifts);
      setItems(response.data);
      setSelectedCell(null);
      setSelectedDetail(null);
      setShowSwapForm(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch trực cá nhân.");
      setShifts([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function moveWeek(daysToMove: number) {
    setWeekStart((current) => addDaysIso(current, daysToMove));
  }

  async function handleCellClick(date: string, shiftCode: string) {
    const schedule = scheduleByCell.get(`${date}-${shiftCode}`);
    if (!schedule) return;

    setSelectedCell({ date, shiftCode });
    setSelectedDetail(null);
    setShowSwapForm(false);
    setDetailError("");

    try {
      setDetailLoading(true);
      const detail = await fetchScheduleDetail(schedule.scheduleId);
      setSelectedDetail(detail);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết ca trực.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedCell(null);
    setSelectedDetail(null);
    setShowSwapForm(false);
    setDetailError("");
  }

  async function handleSwapSubmitted(message: string) {
    setNotice(message);
    setShowSwapForm(false);
    closeDetail();
    await loadSchedule();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Lịch trực cá nhân</h2>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
            <InfoText label="Nhân viên" value={displayProfile.fullName} />
            <InfoText label="Mã NV" value={displayProfile.employeeCode || "-"} />
            <InfoText label="Khoa" value={displayProfile.departmentName} />
            <InfoText label="Phòng" value={formatRoom(displayProfile.roomCode, displayProfile.roomName)} />
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
            <span className="text-sm font-medium text-gray-700 px-3">
              Tuần {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}/{dateFromIso(weekEnd).getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => moveWeek(7)}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Tuần sau"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getCurrentWeekStart())}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Về tuần hiện tại"
            >
              <RefreshCw size={15} className="text-gray-600" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2.5 text-left font-semibold text-gray-700 w-36">
                  Ca trực
                </th>
                {days.map((day) => (
                  <th
                    key={day.isoDate}
                    className="border border-gray-200 px-3 py-2.5 text-center font-semibold text-gray-700"
                  >
                    <div>{day.label}</div>
                    <div className="text-[11px] font-normal text-gray-400 mt-0.5">
                      {day.dateLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shiftColumns.map((shift) => (
                <tr key={shift.code} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 align-top">
                    <div className={`font-medium ${getShiftClass(shift)}`}>{shift.name}</div>
                    <div className="text-xs text-gray-500">{formatTimeRange(shift)}</div>
                  </td>
                  {days.map((day) => {
                    const data = scheduleByCell.get(`${day.isoDate}-${shift.code}`);
                    const isSelected =
                      selectedCell?.date === day.isoDate && selectedCell?.shiftCode === shift.code;
                    const swapBadge = data ? getSwapBadge(data.swapRequestStatus) : null;

                    return (
                      <td
                        key={day.isoDate}
                        onClick={() => handleCellClick(day.isoDate, shift.code)}
                        className={`border border-gray-200 px-3 py-3 text-center transition-colors h-24 ${
                          data ? "cursor-pointer bg-teal-50 hover:bg-teal-100" : ""
                        } ${isSelected ? "bg-teal-100 ring-2 ring-inset ring-teal-500" : ""}`}
                      >
                        {loading ? (
                          <span className="text-gray-300 text-xs">Đang tải...</span>
                        ) : data ? (
                          <div>
                            <div className="font-medium text-teal-700">{data.roomCode}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatTimeRange({ startTime: data.startTime, endTime: data.endTime })}
                            </div>
                            {swapBadge && (
                              <div className="mt-1">
                                <StatusBadge status={swapBadge} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">Trống</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-400 mt-4">Tuần này chưa có ca trực được phân công.</p>
        )}
      </div>

      {selectedData && (
        <ScheduleDetailModal
          schedule={selectedData}
          detail={selectedDetail}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
          onOpenSwap={() => setShowSwapForm(true)}
        />
      )}

      {selectedData && selectedDetail && showSwapForm && (
        <SwapRequestModal
          sourceSchedule={selectedData}
          detail={selectedDetail}
          onClose={() => setShowSwapForm(false)}
          onSubmitted={handleSwapSubmitted}
        />
      )}
    </div>
  );
}

function InfoText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-gray-900 ml-1">{value}</span>
    </div>
  );
}
