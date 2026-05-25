import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Building2, Calendar, RefreshCw, Stethoscope, Users } from "lucide-react";
import {
  fetchGeneralSchedule,
  type GeneralScheduleItem,
  type ScheduleRoom,
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
} from "../shared/dashboardUtils";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  bg: string;
}

interface DepartmentSummary {
  departmentName: string;
  roomCount: number;
  scheduleCount: number;
  employeeCount: number;
}

function buildDepartmentSummaries(rooms: ScheduleRoom[], schedules: GeneralScheduleItem[]) {
  const mapped = new Map<string, DepartmentSummary & { employees: Set<number> }>();

  rooms.forEach((room) => {
    if (!room.departmentName) return;
    const current = mapped.get(room.departmentName) || {
      departmentName: room.departmentName,
      roomCount: 0,
      scheduleCount: 0,
      employeeCount: 0,
      employees: new Set<number>(),
    };

    if (room.roomId) current.roomCount += 1;
    mapped.set(room.departmentName, current);
  });

  schedules.forEach((schedule) => {
    const current = mapped.get(schedule.departmentName) || {
      departmentName: schedule.departmentName,
      roomCount: 0,
      scheduleCount: 0,
      employeeCount: 0,
      employees: new Set<number>(),
    };

    current.scheduleCount += 1;
    current.employees.add(schedule.employeeId);
    mapped.set(schedule.departmentName, current);
  });

  return [...mapped.values()]
    .map(({ employees, ...summary }) => ({
      ...summary,
      employeeCount: employees.size,
    }))
    .sort((left, right) => right.scheduleCount - left.scheduleCount || left.departmentName.localeCompare(right.departmentName));
}

export function OfficeDashboard() {
  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const [rooms, setRooms] = useState<ScheduleRoom[]>([]);
  const [schedules, setSchedules] = useState<GeneralScheduleItem[]>([]);
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

      const response = await fetchGeneralSchedule(weekStart);
      setRooms(response.rooms);
      setSchedules(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const todaySchedules = schedules.filter((schedule) => isToday(schedule.dutyDate)).sort(compareDutyTime);
  const departmentSummaries = buildDepartmentSummaries(rooms, schedules).slice(0, 6);
  const uniqueDepartments = new Set(rooms.map((room) => room.departmentName).filter(Boolean));
  const uniqueRooms = new Set(rooms.map((room) => room.roomId).filter(Boolean));
  const uniqueEmployees = new Set(schedules.map((schedule) => schedule.employeeId));

  const stats: StatCardProps[] = [
    {
      label: "Khoa đang theo dõi",
      value: String(uniqueDepartments.size),
      sub: "Theo danh sách phòng",
      icon: <Building2 size={20} className="text-teal-600" />,
      bg: "bg-teal-50",
    },
    {
      label: "Phòng có lịch trực",
      value: String(uniqueRooms.size),
      sub: "Phòng trong tuần",
      icon: <Stethoscope size={20} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Nhân viên được phân công",
      value: String(uniqueEmployees.size),
      sub: `Tuần ${formatWeekRange(weekStart)}`,
      icon: <Users size={20} className="text-violet-600" />,
      bg: "bg-violet-50",
    },
    {
      label: "Tổng ca trong tuần",
      value: String(schedules.length),
      sub: `${todaySchedules.length} ca hôm nay`,
      icon: <Calendar size={20} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trang tổng quan</h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatTodayLong()} - Phòng hành chính</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Lịch trực hôm nay</h3>
            <span className="text-xs text-gray-400">{todaySchedules.length} ca</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải lịch trực..." />}

            {!loading && todaySchedules.slice(0, 8).map((schedule) => (
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
                    {formatTimeRange(schedule.startTime, schedule.endTime)}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={getScheduleBadgeStatus(schedule.status)} />
                  </div>
                </div>
              </div>
            ))}

            {!loading && todaySchedules.length === 0 && (
              <PanelMessage text="Hôm nay chưa có lịch trực được phân công." />
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Tổng hợp theo khoa</h3>
            <span className="text-xs text-gray-400">Tuần {formatWeekRange(weekStart)}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && <PanelMessage text="Đang tải tổng hợp..." />}

            {!loading && departmentSummaries.map((summary) => (
              <div key={summary.departmentName} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900 truncate">{summary.departmentName}</div>
                  <div className="text-sm font-semibold text-teal-700">{summary.scheduleCount} ca</div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {summary.roomCount} phòng - {summary.employeeCount} nhân viên được phân công
                </div>
              </div>
            ))}

            {!loading && departmentSummaries.length === 0 && (
              <PanelMessage text="Chưa có dữ liệu tổng hợp." />
            )}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Lịch trực trong tuần</h3>
          <span className="text-xs text-gray-400">Hiển thị 10 ca gần nhất</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Ngày", "Khoa", "Phòng", "Ca trực", "Nhân viên", "Thời gian", "Trạng thái"].map((header) => (
                  <th key={header} className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    Đang tải lịch trực...
                  </td>
                </tr>
              )}

              {!loading && [...schedules].sort(compareDutyTime).slice(0, 10).map((schedule) => (
                <tr key={schedule.scheduleId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600">{formatDate(schedule.dutyDate)}</td>
                  <td className="px-5 py-3 text-gray-700">{schedule.departmentName}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{schedule.roomCode}</td>
                  <td className="px-5 py-3 text-gray-700">{schedule.shiftName}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {schedule.position} {schedule.fullName}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {formatTimeRange(schedule.startTime, schedule.endTime)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={getScheduleBadgeStatus(schedule.status)} />
                  </td>
                </tr>
              ))}

              {!loading && schedules.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    Tuần này chưa có lịch trực.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
