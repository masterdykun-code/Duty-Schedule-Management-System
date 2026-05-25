import { useEffect, useState } from "react";
import { AlertCircle, Send, X } from "lucide-react";
import {
  createSwapRequest,
  fetchSwapOptions,
  type MyScheduleItem,
  type ScheduleDetailResponse,
  type SwapCandidate,
} from "../../../lib/scheduleApi";

interface SwapRequestModalProps {
  sourceSchedule: MyScheduleItem;
  detail: ScheduleDetailResponse;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

function formatTimeRange(shift: { startTime: string; endTime: string }) {
  return `${shift.startTime} - ${shift.endTime}`;
}

function formatCandidate(candidate: SwapCandidate) {
  return `${candidate.fullName} (${candidate.employeeCode}) - ${candidate.roomCode} - ${candidate.shiftName} ${formatTimeRange(candidate)}`;
}

export function SwapRequestModal({
  sourceSchedule,
  detail,
  onClose,
  onSubmitted,
}: SwapRequestModalProps) {
  const [targetDutyDate, setTargetDutyDate] = useState(sourceSchedule.dutyDate);
  const [targetRoomId, setTargetRoomId] = useState(String(sourceSchedule.roomId));
  const [targetShiftId, setTargetShiftId] = useState(String(sourceSchedule.shiftId));
  const [targetScheduleId, setTargetScheduleId] = useState("");
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<SwapCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      if (!targetDutyDate || !targetRoomId || !targetShiftId) {
        setCandidates([]);
        setTargetScheduleId("");
        return;
      }

      try {
        setLoadingCandidates(true);
        setError("");
        const data = await fetchSwapOptions({
          sourceScheduleId: sourceSchedule.scheduleId,
          dutyDate: targetDutyDate,
          roomId: Number(targetRoomId),
          shiftId: Number(targetShiftId),
        });

        if (cancelled) return;
        setCandidates(data);
        setTargetScheduleId((current) =>
          data.some((candidate) => String(candidate.targetScheduleId) === current)
            ? current
            : "",
        );
      } catch (loadError) {
        if (cancelled) return;
        setCandidates([]);
        setTargetScheduleId("");
        setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách người có thể đổi ca.");
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    }

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [sourceSchedule.scheduleId, targetDutyDate, targetRoomId, targetShiftId]);

  async function handleSubmit() {
    if (!targetScheduleId) {
      setError("Vui lòng chọn nhân viên muốn đổi ca.");
      return;
    }

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do đổi ca.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const result = await createSwapRequest({
        source_schedule_id: sourceSchedule.scheduleId,
        target_schedule_id: Number(targetScheduleId),
        reason: reason.trim(),
      });
      onSubmitted(result.message || "Đã gửi yêu cầu đổi ca.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể gửi yêu cầu đổi ca.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Gửi yêu cầu đổi ca</h3>
            <p className="mt-1 text-sm text-gray-500">
              {sourceSchedule.shiftName} - {sourceSchedule.roomCode} - {sourceSchedule.dutyDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Khoa</span>
              <input
                value={sourceSchedule.departmentName}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Ngày muốn đổi</span>
              <input
                type="date"
                value={targetDutyDate}
                onChange={(event) => setTargetDutyDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Phòng</span>
              <select
                value={targetRoomId}
                onChange={(event) => setTargetRoomId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {detail.rooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>
                    {room.roomCode} - {room.roomName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Ca trực</span>
              <select
                value={targetShiftId}
                onChange={(event) => setTargetShiftId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {detail.shifts.map((shift) => (
                  <option key={shift.shiftId} value={shift.shiftId}>
                    {shift.shiftName} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Người có thể đổi</span>
            <select
              value={targetScheduleId}
              onChange={(event) => setTargetScheduleId(event.target.value)}
              disabled={loadingCandidates || candidates.length === 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {loadingCandidates
                  ? "Đang tải danh sách..."
                  : candidates.length
                    ? "Chọn nhân viên"
                    : "Không có nhân viên phù hợp"}
              </option>
              {candidates.map((candidate) => (
                <option key={candidate.targetScheduleId} value={candidate.targetScheduleId}>
                  {formatCandidate(candidate)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lý do đổi ca</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="Nhập lý do đổi ca..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <Send size={15} />
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
}
