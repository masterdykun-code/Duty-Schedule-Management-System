import { Calendar, Clock, ArrowLeftRight, CheckCircle, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface StaffDashboardProps {
  userName: string;
}

const stats = [
  { label: "Ca trực hôm nay", value: "Ca sáng\nP.203", icon: <Clock size={20} className="text-amber-600" />, bg: "bg-amber-50", sub: "06:00 – 14:00" },
  { label: "Ca trực trong tuần", value: "3", icon: <Calendar size={20} className="text-blue-600" />, bg: "bg-blue-50", sub: "ca trực" },
  { label: "Yêu cầu chờ phản hồi", value: "1", icon: <ArrowLeftRight size={20} className="text-orange-500" />, bg: "bg-orange-50", sub: "đang chờ" },
  { label: "Yêu cầu đã duyệt", value: "2", icon: <CheckCircle size={20} className="text-green-600" />, bg: "bg-green-50", sub: "tháng này" },
];

const upcomingShifts = [
  { day: "Thứ 4, 21/05", shift: "Ca sáng", room: "P.203", time: "06:00 – 14:00", status: "assigned" as const },
  { day: "Thứ 6, 23/05", shift: "Ca chiều", room: "P.203", time: "17:00 - 22:00", status: "assigned" as const },
  { day: "Thứ 7, 24/05", shift: "Ca sáng", room: "P.203", time: "06:00 – 14:00", status: "assigned" as const },
];

const exchangeRequests = [
  { id: "YC001", target: "Lê Văn Nam", shift: "Ca sáng 22/05", reason: "Có việc gia đình", status: "waiting_response" as const, date: "19/05" },
  { id: "YC002", target: "Trần Văn Minh", shift: "Ca chiều 18/05", reason: "Mệt mỏi", status: "approved" as const, date: "16/05" },
];

export function StaffDashboard({ userName }: StaffDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Xin chào, {userName.split(" ").slice(-1)[0]}!</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thứ Tư, ngày 20 tháng 05 năm 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <div className="text-lg font-bold text-gray-900 whitespace-pre-line leading-tight">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Lịch trực sắp tới</h3>
            <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
              Xem chi tiết <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingShifts.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Calendar size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.day}</div>
                    <div className="text-xs text-gray-500">{s.shift} · {s.room}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{s.time}</div>
                  <div className="mt-1"><StatusBadge status={s.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Yêu cầu đổi ca gần đây</h3>
            <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {exchangeRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">Đổi với {r.target}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.shift}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{r.date}</div>
                  <div className="mt-1"><StatusBadge status={r.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
