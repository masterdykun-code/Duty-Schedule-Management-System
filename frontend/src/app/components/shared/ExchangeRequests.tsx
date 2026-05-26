import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import {
  fetchSwapRequests,
  respondSwapRequestAction,
  reviewSwapRequestAction,
} from "../../lib/scheduleApi";
import type { SwapRequestRecord, SwapRequestSchedule } from "../../lib/scheduleApi";
import { StatusBadge, type BadgeStatus } from "../StatusBadge";

type RequestFilter =
  | "all"
  | "PENDING_RESPONSE"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

interface ExchangeRequestsProps {
  mode: "staff" | "head";
}

const filterOptions: { value: RequestFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING_RESPONSE", label: "Chờ phản hồi" },
  { value: "PENDING_APPROVAL", label: "Chờ xử lý" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "EXPIRED", label: "Hết hạn" },
];

const REQUESTS_PER_PAGE = 9;

function toBadgeStatus(status: string): BadgeStatus {
  if (status === "PENDING_RESPONSE") return "waiting_response";
  if (status === "PENDING_APPROVAL") return "waiting_process";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "EXPIRED") return "expired";
  return "empty";
}

function formatDate(date: string) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}/${year}` : date;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const [date, time] = value.split(" ");
  return `${formatDate(date)}${time ? ` ${time}` : ""}`;
}

function scheduleLine(schedule: SwapRequestSchedule | null) {
  if (!schedule) return "-";
  return `${schedule.shiftName} - ${formatDate(schedule.dutyDate)} - ${schedule.roomCode}`;
}

function scheduleDetail(schedule: SwapRequestSchedule | null) {
  if (!schedule) return "-";
  return `${schedule.departmentName}, ${schedule.roomCode}, ${schedule.startTime} - ${schedule.endTime}`;
}

function canAct(request: SwapRequestRecord) {
  return request.canRespond || request.canApprove;
}

function getActionText(request: SwapRequestRecord) {
  return {
    positive: request.canApprove ? "Duyệt" : "Đồng ý",
    note: request.canApprove ? "Ghi chú xử lý" : "Ghi chú phản hồi",
  };
}

function getVisiblePageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages] as const;
}

export function ExchangeRequests({ mode }: ExchangeRequestsProps) {
  const [requests, setRequests] = useState<SwapRequestRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<RequestFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const title = mode === "head" ? "Xử lý yêu cầu đổi ca" : "Yêu cầu đổi ca";

  const loadRequests = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const data = await fetchSwapRequests();
      setRequests(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải yêu cầu đổi ca.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const timer = window.setInterval(() => loadRequests(true), 15000);
    return () => window.clearInterval(timer);
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") return requests;
    return requests.filter((request) => request.status === filterStatus);
  }, [filterStatus, requests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * REQUESTS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + REQUESTS_PER_PAGE, filteredRequests.length);
  const paginatedRequests = filteredRequests.slice(pageStartIndex, pageEndIndex);
  const visiblePageItems = getVisiblePageItems(currentPage, totalPages);
  const selected = requests.find((request) => request.requestId === selectedId) || null;
  const selectedActionText = selected ? getActionText(selected) : null;

  useEffect(() => {
    setActionNote("");
  }, [selectedId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleFilterChange(status: RequestFilter) {
    setFilterStatus(status);
    setCurrentPage(1);
  }

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  async function handleAction(positive: boolean) {
    if (!selected || !canAct(selected)) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const result = selected.canApprove
        ? await reviewSwapRequestAction(selected.requestId, positive, actionNote)
        : await respondSwapRequestAction(selected.requestId, positive, actionNote);

      setSuccess(result.message || "Đã cập nhật yêu cầu đổi ca.");
      setActionNote("");
      await loadRequests(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể xử lý yêu cầu đổi ca.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-2 flex-wrap">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleFilterChange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === option.value
                ? "bg-teal-700 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="flex gap-4 items-start">
        <div className={`flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden ${selected ? "min-w-0" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Mã YC", "Ngày gửi", "Người gửi", "Người nhận", "Ca hiện tại", "Ca muốn đổi", "Trạng thái", "Thao tác"].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      Đang tải yêu cầu đổi ca...
                    </td>
                  </tr>
                )}

                {!loading && paginatedRequests.map((request) => (
                  <tr
                    key={request.requestId}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedId === request.requestId ? "bg-teal-50" : ""}`}
                    onClick={() => setSelectedId(request.requestId === selectedId ? null : request.requestId)}
                  >
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">YC{String(request.requestId).padStart(3, "0")}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{formatDateTime(request.requestedAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{request.requester.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{request.targetEmployee.fullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{scheduleLine(request.sourceSchedule)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{scheduleLine(request.targetSchedule)}</td>
                    <td className="px-4 py-3"><StatusBadge status={toBadgeStatus(request.status)} /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(request.requestId);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                          canAct(request)
                            ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <ArrowLeftRight size={13} />
                        {canAct(request) ? "Xử lý" : "Chi tiết"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      Không có yêu cầu nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredRequests.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <div className="text-xs text-gray-500">
                Hiển thị {pageStartIndex + 1}-{pageEndIndex} / {filteredRequests.length} yêu cầu
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {visiblePageItems.map((item) => (
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition-colors ${
                        currentPage === item
                          ? "bg-teal-700 text-white"
                          : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="px-1 text-xs font-semibold text-gray-400">
                      ...
                    </span>
                  )
                ))}

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-[360px] bg-white rounded-xl border border-gray-200 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Chi tiết yêu cầu</h3>
              <button type="button" onClick={() => setSelectedId(null)} className="p-1 rounded-md hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1">
              <InfoRow label="Mã yêu cầu" value={`YC${String(selected.requestId).padStart(3, "0")}`} />
              <InfoRow label="Người gửi" value={`${selected.requester.employeeCode} - ${selected.requester.fullName}`} />
              <InfoRow label="Người nhận" value={`${selected.targetEmployee.employeeCode} - ${selected.targetEmployee.fullName}`} />
              <InfoRow label="Ngày gửi" value={formatDateTime(selected.requestedAt)} />
              <InfoRow label="Ca hiện tại" value={scheduleLine(selected.sourceSchedule)} />
              <InfoRow label="Chi tiết hiện tại" value={scheduleDetail(selected.sourceSchedule)} />
              <InfoRow label="Ca muốn đổi" value={scheduleLine(selected.targetSchedule)} />
              <InfoRow label="Chi tiết muốn đổi" value={scheduleDetail(selected.targetSchedule)} />
              <InfoRow label="Lý do" value={selected.reason} />
              {selected.responseNote && <InfoRow label="Phản hồi" value={selected.responseNote} />}
              {selected.approvalNote && <InfoRow label="Xử lý" value={selected.approvalNote} />}
              {selected.approvedBy && <InfoRow label="Người xử lý" value={selected.approvedBy.fullName} />}
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 mt-0.5">Trạng thái:</span>
                <StatusBadge status={toBadgeStatus(selected.status)} />
              </div>

              {canAct(selected) && selectedActionText && (
                <label className="block pt-2">
                  <span className="mb-1.5 block text-xs font-medium text-gray-600">{selectedActionText.note}</span>
                  <textarea
                    value={actionNote}
                    onChange={(event) => setActionNote(event.target.value)}
                    rows={3}
                    placeholder="Nhập ghi chú nếu có..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>
              )}
            </div>

            {canAct(selected) && selectedActionText && (
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(true)}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60"
                >
                  <Check size={14} />
                  {selectedActionText.positive}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(false)}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle size={14} />
                  Từ chối
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0 mt-0.5">{label}:</span>
      <span className="text-xs font-medium text-gray-800 break-words">{value || "-"}</span>
    </div>
  );
}
