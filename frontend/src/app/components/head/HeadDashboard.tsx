import { Calendar, ArrowLeftRight, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface HeadDashboardProps {
  userName: string;
}

const stats = [
  { label: "Lịch trực trong tuần", value: "32", icon: <Calendar size={20} className="text-blue-600" />, bg: "bg-blue-50" },
  { label: "Yêu cầu chờ xử lý", value: "5", icon: <ArrowLeftRight size={20} className="text-orange-500" />, bg: "bg-orange-50" },
  { label: "Yêu cầu đã duyệt", value: "12", icon: <CheckCircle size={20} className="text-green-600" />, bg: "bg-green-50" },
  { label: "Yêu cầu đã từ chối", value: "3", icon: <XCircle size={20} className="text-red-500" />, bg: "bg-red-50" },
];

const pendingRequests = [
  { id: "YC002", sender: "Nguyễn Văn Bình", receiver: "Phạm Thị Lan", shift: "Ca chiều 23/05", dept: "Nội khoa", status: "waiting_process" as const },
  { id: "YC006", sender: "Hoàng Thị Thu", receiver: "Đặng Thị Lan", shift: "Ca sáng 26/05", dept: "Nội khoa", status: "waiting_process" as const },
  { id: "YC007", sender: "Lê Văn Nam", receiver: "Trần Thị Mai", shift: "Ca cấp cứu 27/05", dept: "Nội khoa", status: "waiting_process" as const },
];

export function HeadDashboard({ userName }: HeadDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Xin chào, {userName.split(" ").slice(-1)[0]}!</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thứ Tư, ngày 20 tháng 05 năm 2026 — Trưởng khoa Nội khoa</p>
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

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Yêu cầu đổi ca chờ xử lý</h3>
          <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5">
            Xem tất cả <ChevronRight size={14} />
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Mã YC", "Người gửi", "Người nhận", "Ca trực", "Khoa", "Trạng thái"].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingRequests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-gray-500 text-xs">{r.id}</td>
                <td className="px-5 py-3 font-medium text-gray-800">{r.sender}</td>
                <td className="px-5 py-3 text-gray-600">{r.receiver}</td>
                <td className="px-5 py-3 text-gray-600 text-xs">{r.shift}</td>
                <td className="px-5 py-3 text-gray-600">{r.dept}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
