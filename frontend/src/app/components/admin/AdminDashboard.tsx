import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Calendar,
  ChevronRight,
  Clock,
  History,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  fetchActivityLogs,
  fetchShifts,
  fetchStaff,
  type ActivityLogRecord,
} from "../../lib/adminApi";
import {
  fetchGeneralSchedule,
  type GeneralScheduleItem,
} from "../../lib/scheduleApi";
import { StatusBadge } from "../StatusBadge";
import {
  compareDutyTime,
  formatDate,
  formatTimeRange,
  formatTodayLong,
  formatWeekRange,
  getCurrentWeekStart,
  getScheduleBadgeStatus,
  isToday,
  isUpcomingOrToday,
} from "../shared/dashboardUtils";
import {
  formatActivityTime,
  getActivityActionLabel,
  getActivityActor,
  getActivityRoleLabel,
} from "./activityLogUtils";

interface AdminDashboardProps {
  onOpenActivityLogs: () => void;
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  bg: string;
}

function getPromiseError(result: PromiseSettledResult<unknown>) {
  if (result.status !== "rejected") return "";
  return result.reason instanceof Error ? result.reason.message : "Không thể tải dữ liệu.";
}

export function AdminDashboard({ onOpenActivityLogs }: AdminDashboardProps) {
  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const [staffCount, setStaffCount] = useState(0);
  const [activeShiftCount, setActiveShiftCount] = useState(0);
  const [scheduleItems, setScheduleItems] = useState<GeneralScheduleItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
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

      const [staffResult, shiftsResult, scheduleResult, activityResult] = await Promise.allSettled([
        fetchStaff(),
        fetchShifts(),
        fetchGeneralSchedule(weekStart),
        fetchActivityLogs({ limit: 5 }),
      ]);

      const errors = [staffResult, shiftsResult, scheduleResult, activityResult]
        .map(getPromiseError)
        .filter(Boolean);

      if (staffResult.status === "fulfilled") {
        setStaffCount(staffResult.value.length);
      }

      if (shiftsResult.status === "fulfilled") {
        setActiveShiftCount(shiftsResult.value.filter((shift) => shift.status === "active").length);
      }

      if (scheduleResult.status === "fulfilled") {
        setScheduleItems(scheduleResult.value.data);
      }

      if (activityResult.status === "fulfilled") {
        setActivityLogs(activityResult.value.data);
        setActivityTotal(activityResult.value.total);
      }

      if (errors.length) {
        setError(errors[0]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const todaySchedules = scheduleItems.filter((schedule) => isToday(schedule.dutyDate));
  const recentSchedules = scheduleItems
    .filter((schedule) => isUpcomingOrToday(schedule.dutyDate))
    .sort(compareDutyTime)
    .slice(0, 5);

  const stats: StatCardProps[] = [
    {
      label: "Tổng số nhân viên",
      value: String(staffCount),
      sub: "Đang quản lý",
      icon: <Users size={22} className="text-teal-600" />,
      bg: "bg-teal-50",
    },
    {
      label: "Ca trực hôm nay",
      value: String(todaySchedules.length),
      sub: formatTodayLong(),
      icon: <Clock size={22} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Hoạt động hệ thống",
      value: String(activityTotal),
      sub: "Tổng nhật ký đã ghi",
      icon: <Activity size={22} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      label: "Lịch trực trong tuần",
      value: String(scheduleItems.length),
      sub: `${activeShiftCount} ca trực đang dùng`,
      icon: <Calendar size={22} className="text-violet-600" />,
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trang tổng quan</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng quan vận hành hệ thống quản lý lịch trực - Tuần {formatWeekRange(weekStart)}
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Một phần dữ liệu chưa tải được: {error}
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
            <h3 className="font-medium text-gray-800">Lịch trực gần nhất</h3>
            <span className="text-xs text-gray-400">Tuần hiện tại</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải lịch trực..." />}

            {!loading && recentSchedules.map((schedule) => (
              <div key={schedule.scheduleId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {schedule.position} {schedule.fullName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {schedule.departmentName} - {schedule.roomCode} - {schedule.shiftName}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">
                    {formatDate(schedule.dutyDate)} - {formatTimeRange(schedule.startTime, schedule.endTime)}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={getScheduleBadgeStatus(schedule.status)} />
                  </div>
                </div>
              </div>
            ))}

            {!loading && recentSchedules.length === 0 && (
              <PanelMessage text="Tuần này chưa có lịch trực sắp tới." />
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <History size={17} className="text-teal-700" />
              <h3 className="font-medium text-gray-800">Danh sách hoạt động gần đây</h3>
            </div>
            <button
              type="button"
              onClick={onOpenActivityLogs}
              className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5"
            >
              Xem thêm <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải hoạt động..." />}

            {!loading && activityLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={onOpenActivityLogs}
                className="w-full flex items-start justify-between gap-4 px-5 py-3 text-left hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{log.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {getActivityActor(log)} - {getActivityRoleLabel(log.role)} - {getActivityActionLabel(log.action)}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatActivityTime(log.createdAt)}
                </span>
              </button>
            ))}

            {!loading && activityLogs.length === 0 && (
              <PanelMessage text="Chưa có hoạt động nào." />
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
