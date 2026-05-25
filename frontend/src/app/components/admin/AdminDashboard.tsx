import { Users, Clock, ArrowLeftRight, Calendar, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

const stats = [
  { label: "Tổng số nhân viên", value: "124", icon: <Users size={22} className="text-teal-600" />, bg: "bg-teal-50" },
  { label: "Ca trực hôm nay", value: "18", icon: <Clock size={22} className="text-blue-600" />, bg: "bg-blue-50" },
  { label: "Yêu cầu đổi ca chờ duyệt", value: "7", icon: <ArrowLeftRight size={22} className="text-orange-500" />, bg: "bg-orange-50" },
  { label: "Lịch trực trong tuần", value: "96", icon: <Calendar size={22} className="text-purple-600" />, bg: "bg-purple-50" },
];

const recentSchedules = [
  { id: "LT001", staff: "Trần Thị Mai", shift: "Ca sáng", room: "P.101 - ICU", date: "20/05/2026", status: "assigned" as const },
  { id: "LT002", staff: "Nguyễn Văn Bình", shift: "Ca tối", room: "P.203 - Nội khoa", date: "20/05/2026", status: "assigned" as const },
  { id: "LT003", staff: "Lê Thị Hoa", shift: "Ca cấp cứu", room: "P.001 - Cấp cứu", date: "21/05/2026", status: "assigned" as const },
  { id: "LT004", staff: "Phạm Văn Đức", shift: "Ca sáng", room: "P.305 - Ngoại khoa", date: "21/05/2026", status: "assigned" as const },
  { id: "LT005", staff: "Hoàng Thị Thu", shift: "Ca tối", room: "P.102 - Sản khoa", date: "22/05/2026", status: "assigned" as const },
];

const exchangeRequests = [
  { id: "YC001", sender: "Trần Thị Mai", receiver: "Lê Văn Nam", shift: "Ca sáng 22/05", status: "waiting_process" as const, date: "19/05/2026" },
  { id: "YC002", sender: "Nguyễn Văn Bình", receiver: "Phạm Thị Lan", shift: "Ca tối 23/05", status: "waiting_process" as const, date: "19/05/2026" },
  { id: "YC003", sender: "Lê Thị Hoa", receiver: "Trần Văn Minh", shift: "Ca cấp cứu 24/05", status: "approved" as const, date: "18/05/2026" },
];

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Trang tổng quan</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thứ Tư, ngày 20 tháng 05 năm 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Lịch trực gần nhất</h3>
            <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSchedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">{s.staff}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.shift} · {s.room}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{s.date}</div>
                  <div className="mt-1"><StatusBadge status={s.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Yêu cầu đổi ca mới nhất</h3>
            <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {exchangeRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.sender} → {r.receiver}</div>
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
