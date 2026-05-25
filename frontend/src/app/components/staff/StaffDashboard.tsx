import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  fetchMySchedule,
  fetchSwapRequests,
  type MyScheduleItem,
  type SwapRequestRecord,
  type SwapRequestSchedule,
} from "../../lib/scheduleApi";
import { StatusBadge } from "../StatusBadge";
import {
  compareDutyTime,
  formatDate,
  formatDateTime,
  formatTimeRange,
  formatTodayLong,
  formatWeekRange,
  getCurrentWeekStart,
  getGreetingName,
  getScheduleBadgeStatus,
  getSwapBadgeStatus,
  isToday,
  isUpcomingOrToday,
} from "../shared/dashboardUtils";

interface StaffDashboardProps {
  userName: string;
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  bg: string;
}

function scheduleLine(schedule: SwapRequestSchedule | null) {
  if (!schedule) return "Chưa chọn ca đổi";
  return `${schedule.shiftName} - ${formatDate(schedule.dutyDate)} - ${schedule.roomCode}`;
}

function requestPartner(request: SwapRequestRecord, userName: string) {
  return request.requester.fullName === userName
    ? request.targetEmployee.fullName
    : request.requester.fullName;
}

export function StaffDashboard({ userName }: StaffDashboardProps) {
  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const [schedules, setSchedules] = useState<MyScheduleItem[]>([]);
  const [requests, setRequests] = useState<SwapRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, [weekStart]);

  async function loadDashboard(silent = false) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [scheduleResult, requestResult] = await Promise.all([
        fetchMySchedule(weekStart),
        fetchSwapRequests(),
      ]);

      setSchedules(scheduleResult.data);
      setRequests(requestResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const todaySchedules = schedules.filter((schedule) => isToday(schedule.dutyDate));
  const upcomingSchedules = schedules
    .filter((schedule) => isUpcomingOrToday(schedule.dutyDate))
    .sort(compareDutyTime)
    .slice(0, 5);
  const recentRequests = [...requests]
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
    .slice(0, 5);
  const pendingRequestCount = requests.filter((request) =>
    ["PENDING_RESPONSE", "PENDING_APPROVAL"].includes(request.status),
  ).length;
  const approvedRequestCount = requests.filter((request) => request.status === "APPROVED").length;

  const firstTodaySchedule = todaySchedules[0];
  const stats: StatCardProps[] = [
    {
      label: "Ca trực hôm nay",
      value: todaySchedules.length
        ? todaySchedules.length === 1
          ? firstTodaySchedule.shiftName
          : `${todaySchedules.length} ca`
        : "Không có",
      sub: firstTodaySchedule
        ? `${firstTodaySchedule.roomCode} - ${formatTimeRange(firstTodaySchedule.startTime, firstTodaySchedule.endTime)}`
        : "Hôm nay chưa được phân công",
      icon: <Clock size={20} className="text-amber-600" />,
      bg: "bg-amber-50",
    },
    {
      label: "Ca trực trong tuần",
      value: String(schedules.length),
      sub: `Tuần ${formatWeekRange(weekStart)}`,
      icon: <Calendar size={20} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Yêu cầu chờ xử lý",
      value: String(pendingRequestCount),
      sub: "Chờ phản hồi hoặc duyệt",
      icon: <ArrowLeftRight size={20} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      label: "Yêu cầu đã duyệt",
      value: String(approvedRequestCount),
      sub: "Tất cả yêu cầu liên quan",
      icon: <CheckCircle size={20} className="text-green-600" />,
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Xin chào, {getGreetingName(userName)}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatTodayLong()}</p>
        </div>
        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Lịch trực sắp tới</h3>
            <span className="text-xs text-gray-400">Tuần hiện tại</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải lịch trực..." />}

            {!loading && upcomingSchedules.map((schedule) => (
              <div key={schedule.scheduleId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {schedule.shiftName} - {formatDate(schedule.dutyDate)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {schedule.departmentName} - {schedule.roomCode}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">
                    {formatTimeRange(schedule.startTime, schedule.endTime)}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={getScheduleBadgeStatus(schedule.status)} />
                  </div>
                </div>
              </div>
            ))}

            {!loading && upcomingSchedules.length === 0 && (
              <PanelMessage text="Tuần này chưa có lịch trực sắp tới." />
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Yêu cầu đổi ca gần đây</h3>
            <span className="text-xs text-gray-400">{requests.length} yêu cầu</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải yêu cầu đổi ca..." />}

            {!loading && recentRequests.map((request) => (
              <div key={request.requestId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    Đổi ca với {requestPartner(request, userName)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {scheduleLine(request.sourceSchedule)}
                    {request.targetSchedule ? ` -> ${scheduleLine(request.targetSchedule)}` : ""}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">{formatDateTime(request.requestedAt)}</div>
                  <div className="mt-1">
                    <StatusBadge status={getSwapBadgeStatus(request.status)} />
                  </div>
                </div>
              </div>
            ))}

            {!loading && recentRequests.length === 0 && (
              <PanelMessage text="Chưa có yêu cầu đổi ca nào." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function PanelMessage({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-gray-400">{text}</div>;
}
