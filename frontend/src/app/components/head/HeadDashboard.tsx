import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  fetchMySchedule,
  fetchSwapRequests,
  type MyScheduleItem,
  type MyScheduleProfile,
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
  isUpcomingOrToday,
} from "../shared/dashboardUtils";

interface HeadDashboardProps {
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
  if (!schedule) return "-";
  return `${schedule.shiftName} - ${formatDate(schedule.dutyDate)} - ${schedule.roomCode}`;
}

export function HeadDashboard({ userName }: HeadDashboardProps) {
  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const [profile, setProfile] = useState<MyScheduleProfile | null>(null);
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

      setProfile(scheduleResult.profile);
      setSchedules(scheduleResult.data);
      setRequests(requestResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const pendingApproval = requests.filter((request) =>
    request.canApprove || request.status === "PENDING_APPROVAL",
  );
  const waitingResponse = requests.filter((request) => request.canRespond);
  const approvedRequests = requests.filter((request) => request.status === "APPROVED");
  const rejectedRequests = requests.filter((request) => request.status === "REJECTED");
  const upcomingSchedules = schedules
    .filter((schedule) => isUpcomingOrToday(schedule.dutyDate))
    .sort(compareDutyTime)
    .slice(0, 5);
  const pendingRows = pendingApproval
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
    .slice(0, 6);

  const stats: StatCardProps[] = [
    {
      label: "Ca trực cá nhân",
      value: String(schedules.length),
      sub: `Tuần ${formatWeekRange(weekStart)}`,
      icon: <Calendar size={20} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Yêu cầu chờ duyệt",
      value: String(pendingApproval.length),
      sub: "Cần trưởng khoa xử lý",
      icon: <ArrowLeftRight size={20} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      label: "Chờ phản hồi",
      value: String(waitingResponse.length),
      sub: "Yêu cầu gửi đến bạn",
      icon: <UserCheck size={20} className="text-teal-600" />,
      bg: "bg-teal-50",
    },
    {
      label: "Đã duyệt / từ chối",
      value: `${approvedRequests.length}/${rejectedRequests.length}`,
      sub: "Theo yêu cầu liên quan",
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
          <p className="text-sm text-gray-500 mt-0.5">
            {formatTodayLong()}
            {profile?.departmentName ? ` - ${profile.departmentName}` : ""}
          </p>
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

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-4">
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Yêu cầu đổi ca chờ xử lý</h3>
            <span className="text-xs text-gray-400">{pendingApproval.length} yêu cầu</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Mã YC", "Người gửi", "Người được yêu cầu", "Ca hiện tại", "Ca muốn đổi", "Trạng thái"].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Đang tải yêu cầu đổi ca...
                    </td>
                  </tr>
                )}

                {!loading && pendingRows.map((request) => (
                  <tr key={request.requestId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      YC{String(request.requestId).padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {request.requester.fullName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{request.targetEmployee.fullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{scheduleLine(request.sourceSchedule)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{scheduleLine(request.targetSchedule)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={getSwapBadgeStatus(request.status)} />
                    </td>
                  </tr>
                ))}

                {!loading && pendingRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Không có yêu cầu nào cần xử lý.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Lịch trực cá nhân</h3>
            <span className="text-xs text-gray-400">Tuần hiện tại</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải lịch trực..." />}

            {!loading && upcomingSchedules.map((schedule) => (
              <div key={schedule.scheduleId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {schedule.shiftName} - {formatDate(schedule.dutyDate)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {schedule.roomCode} - {formatTimeRange(schedule.startTime, schedule.endTime)}
                  </div>
                </div>
                <StatusBadge status={getScheduleBadgeStatus(schedule.status)} />
              </div>
            ))}

            {!loading && upcomingSchedules.length === 0 && (
              <PanelMessage text="Tuần này chưa có ca trực sắp tới." />
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
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function PanelMessage({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-gray-400">{text}</div>;
}
