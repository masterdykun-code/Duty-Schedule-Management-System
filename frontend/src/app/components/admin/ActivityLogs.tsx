import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  fetchActivityLogs,
  type ActivityLogRecord,
} from "../../lib/adminApi";
import {
  activityActionOptions,
  formatActivityTime,
  getActivityActionLabel,
  getActivityActor,
  getActivityRoleLabel,
} from "./activityLogUtils";

const PAGE_SIZE = 9;

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min((page - 1) * PAGE_SIZE + logs.length, total);

  const selectedActionLabel = useMemo(
    () => activityActionOptions.find((option) => option.value === action)?.label || "Tất cả hoạt động",
    [action],
  );

  useEffect(() => {
    loadLogs();
  }, [page, search, action, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, action, dateFrom, dateTo]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");
      const result = await fetchActivityLogs({
        page,
        limit: PAGE_SIZE,
        search,
        action,
        dateFrom,
        dateTo,
      });

      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải nhật ký hoạt động.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    loadLogs();
  }

  function handleReset() {
    setSearch("");
    setAction("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Danh sách hoạt động</h2>
        <p className="text-sm text-gray-500 mt-0.5">Theo dõi các thao tác quan trọng trong hệ thống</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tài khoản, hành động hoặc mô tả..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="relative min-w-[210px]">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full appearance-none pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              title={selectedActionLabel}
            >
              {activityActionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            type="submit"
            className="px-4 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw size={15} />
            Đặt lại
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Thời gian", "Người thao tác", "Vai trò", "Hoạt động", "Mô tả"].map((header) => (
                <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  Đang tải nhật ký hoạt động...
                </td>
              </tr>
            )}

            {!loading && logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatActivityTime(log.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{getActivityActor(log)}</td>
                <td className="px-4 py-3 text-gray-600">{getActivityRoleLabel(log.role)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                    {getActivityActionLabel(log.action)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-[360px]">{log.description}</td>
              </tr>
            ))}

            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  Không có hoạt động nào
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <span className="text-sm text-gray-500">
            Hiển thị {visibleStart}-{visibleEnd} / {total} hoạt động
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={15} />
              Trước
            </button>
            <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
