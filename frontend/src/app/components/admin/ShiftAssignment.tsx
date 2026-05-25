import { useState } from "react";
import { Filter, X, CheckCircle, UserPlus } from "lucide-react";

const days = ["Thứ 2\n19/05", "Thứ 3\n20/05", "Thứ 4\n21/05", "Thứ 5\n22/05", "Thứ 6\n23/05", "Thứ 7\n24/05", "Chủ nhật\n25/05"];
const dayLabels = ["Thứ 2\n19/05", "Thứ 3\n20/05", "Thứ 4\n21/05", "Thứ 5\n22/05", "Thứ 6\n23/05", "Thứ 7\n24/05", "Chủ nhật\n25/05"];
const shiftTypes = ["Sáng", "Tối", "CK"] as const;
type ShiftType = typeof shiftTypes[number];

interface CellKey { staffId: string; dayIdx: number; shiftType: ShiftType; }
interface Assignment { room: string; }

const staffList = [
  { id: "NV001", name: "Trần Thị Mai", dept: "Nội khoa" },
  { id: "NV002", name: "Nguyễn Văn Bình", dept: "Ngoại khoa" },
  { id: "NV003", name: "Lê Thị Hoa", dept: "Cấp cứu" },
  { id: "NV004", name: "Phạm Văn Đức", dept: "Sản khoa" },
  { id: "NV005", name: "Hoàng Thị Thu", dept: "ICU" },
  { id: "NV006", name: "Võ Văn Minh", dept: "Nhi khoa" },
];

const departments = ["Tất cả", "Nội khoa", "Ngoại khoa", "Cấp cứu", "Sản khoa", "ICU", "Nhi khoa"];
const rooms = ["P.101", "P.102", "P.201", "P.203", "P.001", "P.305"];

function cellKey(staffId: string, dayIdx: number, shiftType: ShiftType) {
  return `${staffId}-${dayIdx}-${shiftType}`;
}

const initAssignments: Record<string, Assignment> = {
  "NV001-0-Sáng": { room: "P.203" },
  "NV001-1-Tối": { room: "P.203" },
  "NV002-0-Tối": { room: "P.305" },
  "NV003-2-CK": { room: "P.001" },
  "NV004-3-Sáng": { room: "P.102" },
  "NV005-1-Sáng": { room: "P.101" },
};

export function ShiftAssignment() {
  const [dept, setDept] = useState("Tất cả");
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(initAssignments);
  const [selectedCell, setSelectedCell] = useState<CellKey | null>(null);
  const [panelMode, setPanelMode] = useState<"assign" | "view" | "edit">("assign");
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]);

  const filtered = staffList.filter((s) => dept === "Tất cả" || s.dept === dept);

  function handleCellClick(staffId: string, dayIdx: number, shiftType: ShiftType) {
    const key = cellKey(staffId, dayIdx, shiftType);
    setSelectedCell({ staffId, dayIdx, shiftType });
    if (assignments[key]) {
      setPanelMode("view");
    } else {
      setPanelMode("assign");
      setSelectedRoom(rooms[0]);
    }
  }

  function handleAssign() {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.staffId, selectedCell.dayIdx, selectedCell.shiftType);
    setAssignments((prev) => ({ ...prev, [key]: { room: selectedRoom } }));
    setPanelMode("view");
  }

  function handleSaveEdit() {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.staffId, selectedCell.dayIdx, selectedCell.shiftType);
    setAssignments((prev) => ({ ...prev, [key]: { room: selectedRoom } }));
    setPanelMode("view");
  }

  function handleRemove() {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.staffId, selectedCell.dayIdx, selectedCell.shiftType);
    setAssignments((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setSelectedCell(null);
  }

  const selectedStaff = selectedCell ? staffList.find((s) => s.id === selectedCell.staffId) : null;
  const selectedKey = selectedCell ? cellKey(selectedCell.staffId, selectedCell.dayIdx, selectedCell.shiftType) : null;
  const selectedAssignment = selectedKey ? assignments[selectedKey] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Phân công ca trực</h2>
        <div className="text-sm text-gray-500">Tuần 20/05 – 26/05/2026</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={15} />
          <span className="font-medium">Lọc:</span>
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option>Tuần 19/05 - 25/05</option>
          <option>Tuần 26/05 - 01/06</option>
        </select>
        <button className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-sm hover:bg-teal-800">Lọc</button>
      </div>

      <div className="flex gap-4">
        <div className={`flex-1 bg-white rounded-xl border border-gray-200 overflow-auto ${selectedCell ? "max-w-[calc(100%-300px)]" : ""}`}>
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-36 sticky left-0 bg-gray-50 z-10">Nhân viên</th>
                {dayLabels.map((d, i) => (
                  <th key={i} colSpan={3} className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 whitespace-pre-line">{d}</th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-1.5 sticky left-0 bg-gray-50 z-10"></th>
                {days.map((_, di) =>
                  shiftTypes.map((st) => (
                    <th key={`${di}-${st}`} className={`border border-gray-200 px-1.5 py-1.5 font-medium text-center w-16 ${
                      st === "Sáng" ? "text-amber-600" : st === "Tối" ? "text-blue-600" : "text-red-600"
                    }`}>{st}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-800">{staff.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{staff.dept}</div>
                  </td>
                  {days.map((_, di) =>
                    shiftTypes.map((st) => {
                      const key = cellKey(staff.id, di, st);
                      const assigned = assignments[key];
                      const isSelected = selectedCell?.staffId === staff.id && selectedCell?.dayIdx === di && selectedCell?.shiftType === st;
                      return (
                        <td
                          key={`${di}-${st}`}
                          onClick={() => handleCellClick(staff.id, di, st)}
                          className={`border border-gray-200 px-1.5 py-2 text-center cursor-pointer transition-colors ${
                            isSelected ? "bg-teal-100 ring-2 ring-inset ring-teal-500" :
                            assigned ? "bg-teal-50 hover:bg-teal-100" : "hover:bg-gray-100"
                          }`}
                        >
                          {assigned ? (
                            <span className="text-teal-700 font-medium">{assigned.room}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedCell && (
          <div className="w-72 bg-white rounded-xl border border-gray-200 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">
                {panelMode === "assign" ? "Phân công ca trực" : panelMode === "edit" ? "Sửa ca trực" : "Chi tiết ca trực"}
              </h3>
              <button onClick={() => setSelectedCell(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-4 flex-1 space-y-3">
              <InfoRow label="Nhân viên" value={selectedStaff?.name || ""} />
              <InfoRow label="Khoa" value={selectedStaff?.dept || ""} />
              <InfoRow label="Ngày trực" value={dayLabels[selectedCell.dayIdx].replace("\n", " ")} />
              <InfoRow label="Ca trực" value={selectedCell.shiftType === "Sáng" ? "Ca sáng" : selectedCell.shiftType === "Tối" ? "Ca tối" : "Ca cấp cứu"} />

              {panelMode === "view" && selectedAssignment && (
                <>
                  <InfoRow label="Phòng" value={selectedAssignment.room} />
                  <div className="pt-2 flex gap-2">
                    <button onClick={() => { setPanelMode("edit"); setSelectedRoom(selectedAssignment.room); }} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Sửa</button>
                    <button onClick={handleRemove} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Xóa</button>
                  </div>
                </>
              )}

              {(panelMode === "assign" || panelMode === "edit") && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Chọn phòng</label>
                    <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {rooms.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button onClick={() => setSelectedCell(null)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                    <button
                      onClick={panelMode === "assign" ? handleAssign : handleSaveEdit}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800"
                    >
                      {panelMode === "assign" ? <><UserPlus size={14} /> Phân công</> : <><CheckCircle size={14} /> Lưu</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-50 border border-teal-200 rounded-sm inline-block"></span> Đã phân công</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-white border border-gray-200 rounded-sm inline-block"></span> Chưa phân công</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-100 border-2 border-teal-500 rounded-sm inline-block"></span> Đang chọn</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0 mt-0.5">{label}:</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}
