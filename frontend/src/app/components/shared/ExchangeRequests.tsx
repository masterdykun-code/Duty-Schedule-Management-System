import { useState } from "react";
import { X, Check, XCircle } from "lucide-react";
import { StatusBadge, BadgeStatus } from "../StatusBadge";

type RequestStatus = "waiting_response" | "waiting_process" | "approved" | "rejected" | "expired";

interface ExchangeRequest {
  id: string;
  date: string;
  sender: string;
  receiver: string;
  shift: string;
  shiftWanted: string;
  workDate: string;
  dept: string;
  room: string;
  reason: string;
  status: RequestStatus;
}

const mockRequests: ExchangeRequest[] = [
  { id: "YC001", date: "19/05/2026", sender: "Trần Thị Mai", receiver: "Lê Văn Nam", shift: "Ca sáng 22/05", shiftWanted: "Ca tối 22/05", workDate: "22/05/2026", dept: "Nội khoa", room: "P.203", reason: "Có việc gia đình", status: "waiting_response" },
  { id: "YC002", date: "19/05/2026", sender: "Nguyễn Văn Bình", receiver: "Phạm Thị Lan", shift: "Ca tối 23/05", shiftWanted: "Ca sáng 23/05", workDate: "23/05/2026", dept: "Ngoại khoa", room: "P.305", reason: "Khám sức khỏe định kỳ", status: "waiting_process" },
  { id: "YC003", date: "18/05/2026", sender: "Lê Thị Hoa", receiver: "Trần Văn Minh", shift: "Ca cấp cứu 24/05", shiftWanted: "Ca sáng 24/05", workDate: "24/05/2026", dept: "Cấp cứu", room: "P.001", reason: "Cần tham dự đào tạo", status: "approved" },
  { id: "YC004", date: "17/05/2026", sender: "Hoàng Thị Thu", receiver: "Đặng Thị Lan", shift: "Ca sáng 20/05", shiftWanted: "Ca tối 20/05", workDate: "20/05/2026", dept: "ICU", room: "P.101", reason: "Đưa con đi khám bệnh", status: "rejected" },
  { id: "YC005", date: "15/05/2026", sender: "Võ Văn Minh", receiver: "Bùi Văn Hải", shift: "Ca tối 18/05", shiftWanted: "Ca sáng 18/05", workDate: "18/05/2026", dept: "Nhi khoa", room: "P.401", reason: "Hết hạn yêu cầu", status: "expired" },
];

const statusFilters = ["Tất cả", "Chờ phản hồi", "Chờ xử lý", "Đã duyệt", "Bị từ chối", "Hết hạn"];
const statusMap: Record<string, RequestStatus | undefined> = {
  "Chờ phản hồi": "waiting_response",
  "Chờ xử lý": "waiting_process",
  "Đã duyệt": "approved",
  "Bị từ chối": "rejected",
  "Hết hạn": "expired",
};

interface ExchangeRequestsProps {
  mode: "staff" | "head";
}

export function ExchangeRequests({ mode }: ExchangeRequestsProps) {
  const [requests, setRequests] = useState<ExchangeRequest[]>(mockRequests);
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const staffFilters = mode === "staff"
    ? ["Tất cả", "Chờ phản hồi", "Đã duyệt", "Bị từ chối", "Hết hạn"]
    : ["Tất cả", "Chờ xử lý", "Đã duyệt", "Đã từ chối", "Hết hạn"];

  const filtered = requests.filter((r) => {
    if (filterStatus === "Tất cả") return true;
    return r.status === statusMap[filterStatus];
  });

  const selected = requests.find((r) => r.id === selectedId);

  function handleApprove(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" } : r));
  }

  function handleReject(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
  }

  const title = mode === "head" ? "Xử lý yêu cầu đổi ca" : "Yêu cầu đổi ca";
  const pendingStatus = mode === "head" ? "waiting_process" : "waiting_response";
  const filters = mode === "staff" ? statusFilters : staffFilters;

  function canAct(req: ExchangeRequest) {
    return req.status === pendingStatus;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === f ? "bg-teal-700 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className={`flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden ${selectedId ? "max-w-[calc(100%-320px)]" : ""}`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Mã YC", "Ngày gửi", "Người gửi", "Người nhận", "Ca trực", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedId === r.id ? "bg-teal-50" : ""}`}
                  onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                >
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{r.id}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.sender}</td>
                  <td className="px-4 py-3 text-gray-600">{r.receiver}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.shift}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status as BadgeStatus} /></td>
                  <td className="px-4 py-3">
                    {canAct(r) && (
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs hover:bg-green-100 transition-colors">
                          <Check size={12} /> {mode === "head" ? "Duyệt" : "Đồng ý"}
                        </button>
                        <button onClick={() => handleReject(r.id)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs hover:bg-red-100 transition-colors">
                          <XCircle size={12} /> Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có yêu cầu nào</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-72 bg-white rounded-xl border border-gray-200 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Chi tiết yêu cầu</h3>
              <button onClick={() => setSelectedId(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {[
                ["Mã yêu cầu", selected.id],
                ["Người gửi", selected.sender],
                ["Người nhận", selected.receiver],
                ["Ngày trực", selected.workDate],
                ["Ca trực hiện tại", selected.shift],
                ["Ca trực muốn đổi", selected.shiftWanted],
                ["Khoa", selected.dept],
                ["Phòng", selected.room],
                ["Lý do", selected.reason],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0 mt-0.5">{label}:</span>
                  <span className="text-xs font-medium text-gray-800">{value}</span>
                </div>
              ))}
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 mt-0.5">Trạng thái:</span>
                <StatusBadge status={selected.status as BadgeStatus} />
              </div>
            </div>
            {canAct(selected) && (
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => handleApprove(selected.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  <Check size={14} /> {mode === "head" ? "Duyệt" : "Đồng ý"}
                </button>
                <button onClick={() => handleReject(selected.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  <XCircle size={14} /> Từ chối
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
