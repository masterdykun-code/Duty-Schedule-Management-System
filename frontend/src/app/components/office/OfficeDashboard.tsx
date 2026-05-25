import { Users, Calendar, Building2, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

const stats = [
  { label: "Tổng số nhân viên", value: "124", icon: <Users size={20} className="text-teal-600" />, bg: "bg-teal-50" },
  { label: "Tổng ca trực trong tuần", value: "96", icon: <Calendar size={20} className="text-blue-600" />, bg: "bg-blue-50" },
  { label: "Số phòng có lịch trực", value: "18", icon: <Building2 size={20} className="text-purple-600" />, bg: "bg-purple-50" },
];

const weekSchedule = [
  { room: "P.203 – Nội khoa", mon: "Trần Thị Mai", tue: "Lê Văn Nam", wed: "Trần Thị Mai", thu: "—", fri: "Nguyễn Bích", status: "assigned" as const },
  { room: "P.305 – Ngoại khoa", mon: "—", tue: "Nguyễn V.Bình", wed: "—", thu: "Nguyễn V.Bình", fri: "—", status: "assigned" as const },
  { room: "P.001 – Cấp cứu", mon: "Lê Thị Hoa", tue: "Lê Thị Hoa", wed: "Trần V. Minh", thu: "Lê Thị Hoa", fri: "Lê Thị Hoa", status: "assigned" as const },
  { room: "P.101 – ICU", mon: "Hoàng Thị Thu", tue: "—", wed: "Hoàng Thị Thu", thu: "—", fri: "Bùi V. Hải", status: "assigned" as const },
  { room: "P.102 – Sản khoa", mon: "Phạm Văn Đức", tue: "Phạm Văn Đức", wed: "—", thu: "Phạm Văn Đức", fri: "—", status: "assigned" as const },
];

export function OfficeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Trang tổng quan</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thứ Tư, ngày 20 tháng 05 năm 2026 — Phòng hành chính</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Lịch trực tổng quát trong tuần (19/05 – 25/05)</h3>
          <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
            Xem đầy đủ <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-40">Phòng / Khoa</th>
                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"].map((d) => (
                  <th key={d} className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{d}</th>
                ))}
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {weekSchedule.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800 text-xs">{row.room}</td>
                  {[row.mon, row.tue, row.wed, row.thu, row.fri].map((v, j) => (
                    <td key={j} className={`px-4 py-3 text-center text-xs ${v === "—" ? "text-gray-300" : "text-gray-700"}`}>{v}</td>
                  ))}
                  <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
