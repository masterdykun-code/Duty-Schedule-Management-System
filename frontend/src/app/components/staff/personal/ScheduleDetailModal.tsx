import { Send, Users, X } from "lucide-react";
import { StatusBadge, type BadgeStatus } from "../../StatusBadge";
import type { MyScheduleItem, ScheduleDetailResponse } from "../../../lib/scheduleApi";

interface ScheduleDetailModalProps {
  schedule: MyScheduleItem;
  detail: ScheduleDetailResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onOpenSwap: () => void;
}

const weekdayLabels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const pendingSwapStatuses = ["PENDING_RESPONSE", "PENDING_APPROVAL"];

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(value: string) {
  const date = dateFromIso(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatLongDate(value: string) {
  const date = dateFromIso(value);
  return `${weekdayLabels[date.getDay()]}, ${formatShortDate(value)}/${date.getFullYear()}`;
}

function canRequestBeforeDutyDate(value: string) {
  const dutyDate = dateFromIso(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dutyDate > today;
}

function formatTimeRange(shift: Pick<MyScheduleItem, "startTime" | "endTime">) {
  return `${shift.startTime} - ${shift.endTime}`;
}

function formatRoom(code: string, name: string) {
  if (!code && !name) return "Chưa cập nhật";
  if (!name) return code;
  return `${code} - ${name}`;
}

function getScheduleBadge(status: string): BadgeStatus {
  return status === "CANCELLED" ? "rejected" : "assigned";
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

export function ScheduleDetailModal({
  schedule,
  detail,
  loading,
  error,
  onClose,
  onOpenSwap,
}: ScheduleDetailModalProps) {
  const hasPendingSwap = pendingSwapStatuses.includes(schedule.swapRequestStatus);
  const isBeforeDutyDate = canRequestBeforeDutyDate(schedule.dutyDate);
  const canRequestSwap = !hasPendingSwap && isBeforeDutyDate;
  const swapButtonText = hasPendingSwap
    ? "Đang chờ xử lý"
    : isBeforeDutyDate
      ? "Gửi yêu cầu đổi ca"
      : "Đã quá hạn gửi yêu cầu";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Chi tiết ca trực</h3>
            <p className="mt-1 text-sm text-gray-500">
              {formatLongDate(schedule.dutyDate)} - {schedule.shiftName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading && <p className="text-sm text-gray-400">Đang tải chi tiết ca trực...</p>}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <InfoRow label="Ngày trực" value={formatLongDate(schedule.dutyDate)} />
                <InfoRow label="Ca trực" value={schedule.shiftName} />
                <InfoRow label="Giờ trực" value={formatTimeRange(schedule)} />
                <InfoRow label="Khoa" value={schedule.departmentName} />
                <InfoRow label="Phòng" value={formatRoom(schedule.roomCode, schedule.roomName)} />
                <InfoRow label="Người phân công" value={schedule.assignedByUsername || "-"} />
                <div className="flex items-start gap-2">
                  <span className="w-28 flex-shrink-0 text-gray-500">Trạng thái:</span>
                  <StatusBadge status={getScheduleBadge(schedule.status)} />
                </div>
                <InfoRow label="Ghi chú" value={schedule.note || "-"} />
              </div>

              <div className="rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <Users size={16} className="text-teal-700" />
                  <h4 className="text-sm font-semibold text-gray-800">Nhân viên cùng trực</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {(detail?.coworkers || []).map((coworker) => (
                    <div key={coworker.scheduleId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getPositionPrefix(coworker.position)} {coworker.fullName}
                        </div>
                        <div className="text-xs text-gray-500">{coworker.employeeCode}</div>
                      </div>
                      {coworker.scheduleId === schedule.scheduleId && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          Bạn
                        </span>
                      )}
                    </div>
                  ))}
                  {detail?.coworkers.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Chưa có nhân viên cùng trực.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onOpenSwap}
            disabled={!canRequestSwap || loading || Boolean(error)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send size={15} />
            {swapButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 flex-shrink-0 text-gray-500">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
