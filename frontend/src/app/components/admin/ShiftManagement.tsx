import { useEffect, useState } from "react";
import { AlertCircle, Ban, Pencil, Plus, X } from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import {
  createShift,
  deactivateShift,
  fetchDepartments,
  fetchShifts,
  toApiStatus,
  updateShift,
  type DepartmentOption,
  type ShiftPayload,
  type ShiftRecord,
} from "../../lib/adminApi";

type ShiftStatus = "active" | "inactive";

interface DepartmentShiftSetting {
  departmentId: number;
  isRequired: boolean;
  minStaff: number;
  maxStaff: number;
}

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  type: string;
  note: string;
  status: ShiftStatus;
  departments: DepartmentShiftSetting[];
}

const shiftTypes = [
  { value: "SANG", label: "Sáng" },
  { value: "CHIEU", label: "Chiều" },
  { value: "CAP_CUU", label: "Cấp cứu" },
  { value: "HANH_CHINH", label: "Hành chính" },
];

const emptyForm: ShiftForm = {
  name: "",
  startTime: "",
  endTime: "",
  type: "SANG",
  note: "",
  status: "active",
  departments: [],
};

const shiftTypeLabel = Object.fromEntries(shiftTypes.map((type) => [type.value, type.label]));

export function ShiftManagement() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [deactivateConfirm, setDeactivateConfirm] = useState<ShiftRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const activeDepartments = departments.filter((department) => department.status === "ACTIVE");
  const selectedDepartmentIds = new Set(form.departments.map((department) => department.departmentId));

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [departmentData, shiftData] = await Promise.all([
        fetchDepartments(),
        fetchShifts(),
      ]);
      setDepartments(departmentData);
      setShifts(shiftData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách ca trực.");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(shift: ShiftRecord) {
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      type: shift.type,
      note: shift.note,
      status: shift.status,
      departments: shift.departments.map((department) => ({
        departmentId: department.departmentId,
        isRequired: department.isRequired,
        minStaff: department.minStaff,
        maxStaff: department.maxStaff,
      })),
    });
    setEditingId(shift.id);
    setError("");
    setShowModal(true);
  }

  function toggleDepartment(departmentId: number, checked: boolean) {
    setForm((current) => {
      if (!checked) {
        return {
          ...current,
          departments: current.departments.filter((department) => department.departmentId !== departmentId),
        };
      }

      if (current.departments.some((department) => department.departmentId === departmentId)) {
        return current;
      }

      return {
        ...current,
        departments: [
          ...current.departments,
          { departmentId, isRequired: true, minStaff: 1, maxStaff: 2 },
        ],
      };
    });
  }

  function updateDepartmentSetting(
    departmentId: number,
    changes: Partial<Omit<DepartmentShiftSetting, "departmentId">>,
  ) {
    setForm((current) => ({
      ...current,
      departments: current.departments.map((department) => (
        department.departmentId === departmentId
          ? { ...department, ...changes }
          : department
      )),
    }));
  }

  function getDepartmentSetting(departmentId: number) {
    return form.departments.find((department) => department.departmentId === departmentId);
  }

  function buildPayload(): ShiftPayload | null {
    if (!form.name.trim() || !form.startTime || !form.endTime || !form.type) {
      setError("Vui lòng nhập tên ca, giờ bắt đầu, giờ kết thúc và loại ca.");
      return null;
    }

    if (form.departments.length === 0) {
      setError("Vui lòng chọn ít nhất một khoa áp dụng ca trực.");
      return null;
    }

    const invalidStaffCount = form.departments.some(
      (department) =>
        department.minStaff < 0 ||
        department.maxStaff < 1 ||
        department.maxStaff > 2 ||
        department.minStaff > department.maxStaff ||
        (department.isRequired && department.minStaff < 1),
    );

    if (invalidStaffCount) {
      setError("Số người tối thiểu/tối đa của khoa chưa hợp lệ.");
      return null;
    }

    return {
      shift_name: form.name.trim(),
      start_time: form.startTime,
      end_time: form.endTime,
      shift_type: form.type,
      note: form.note.trim() || null,
      status: toApiStatus(form.status),
      departments: form.departments.map((department) => ({
        department_id: department.departmentId,
        is_required: department.isRequired,
        min_staff: department.minStaff,
        max_staff: department.maxStaff,
      })),
    };
  }

  async function handleSave() {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      setError("");
      const savedShift = editingId
        ? await updateShift(editingId, payload)
        : await createShift(payload);

      setShifts((current) =>
        editingId
          ? current.map((shift) => (shift.id === editingId ? savedShift : shift))
          : [...current, savedShift],
      );
      setShowModal(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu ca trực.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateConfirm) return;

    try {
      setSaving(true);
      const updatedShift = await deactivateShift(deactivateConfirm.id);
      setShifts((current) =>
        current.map((shift) => (shift.id === updatedShift.id ? updatedShift : shift)),
      );
      setDeactivateConfirm(null);
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Không thể ngừng áp dụng ca trực.");
    } finally {
      setSaving(false);
    }
  }

  function getTypeClass(type: string) {
    if (type === "CAP_CUU") return "bg-red-100 text-red-700";
    if (type === "CHIEU") return "bg-blue-100 text-blue-700";
    if (type === "HANH_CHINH") return "bg-slate-100 text-slate-700";
    return "bg-amber-100 text-amber-700";
  }

  function departmentSummary(shift: ShiftRecord) {
    if (shift.departments.length === 0) return "-";

    const activeConfigs = shift.departments.filter((department) => department.status === "ACTIVE");
    const visible = (activeConfigs.length ? activeConfigs : shift.departments).slice(0, 3);
    const extraCount = Math.max(0, (activeConfigs.length || shift.departments.length) - visible.length);

    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((department) => (
          <span key={department.departmentId} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs">
            {department.departmentCode}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">+{extraCount}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Quản lý ca trực</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm ca trực
        </button>
      </div>

      {error && !showModal && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Mã ca", "Tên ca", "Giờ bắt đầu", "Giờ kết thúc", "Loại ca", "Khoa áp dụng", "Trạng thái", "Ghi chú", "Thao tác"].map((heading) => (
                <th key={heading} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Đang tải danh sách ca trực...</td></tr>
            )}
            {!loading && shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 font-mono text-gray-500 text-xs">{shift.code}</td>
                <td className="px-4 py-3.5 font-medium text-gray-800">{shift.name}</td>
                <td className="px-4 py-3.5 text-gray-600">{shift.startTime}</td>
                <td className="px-4 py-3.5 text-gray-600">{shift.endTime}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeClass(shift.type)}`}>
                    {shiftTypeLabel[shift.type] || shift.type}
                  </span>
                </td>
                <td className="px-4 py-3.5">{departmentSummary(shift)}</td>
                <td className="px-4 py-3.5"><StatusBadge status={shift.status} /></td>
                <td className="px-4 py-3.5 text-gray-500 text-xs max-w-48 truncate">{shift.note || "-"}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(shift)} className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Sửa"><Pencil size={15} /></button>
                    {shift.status === "active" && (
                      <button onClick={() => setDeactivateConfirm(shift)} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors" title="Ngừng áp dụng"><Ban size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && shifts.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Chưa có ca trực</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Tổng cộng {shifts.length} ca trực
        </div>
      </div>

      {deactivateConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Ngừng áp dụng ca trực</h3>
            <p className="text-sm text-gray-600 mb-5">
              Ca {deactivateConfirm.name} sẽ không còn được dùng để phân công. Bạn có chắc chắn?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeactivateConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleDeactivate} disabled={saving} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-70">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{editingId ? "Sửa ca trực" : "Thêm ca trực mới"}</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên ca *</label>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="VD: Ca sáng" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ bắt đầu *</label>
                  <input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ kết thúc *</label>
                  <input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại ca</label>
                  <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {shiftTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Khoa áp dụng *</label>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {activeDepartments.map((department) => {
                    const setting = getDepartmentSetting(department.id);
                    const checked = selectedDepartmentIds.has(department.id);

                    return (
                      <div key={department.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            id={`shift-department-${department.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleDepartment(department.id, event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-500"
                          />
                          <label htmlFor={`shift-department-${department.id}`} className="text-sm font-medium text-gray-800 flex-1">
                            {department.name}
                          </label>
                          <span className="text-xs text-gray-400">{department.code}</span>
                        </div>

                        {setting && (
                          <div className="mt-2 ml-6 grid grid-cols-3 gap-3 items-center">
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={setting.isRequired}
                                onChange={(event) => updateDepartmentSetting(department.id, {
                                  isRequired: event.target.checked,
                                  minStaff: event.target.checked ? Math.max(1, setting.minStaff) : setting.minStaff,
                                })}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-teal-700 focus:ring-teal-500"
                              />
                              Bắt buộc
                            </label>
                            <NumberField
                              label="Tối thiểu"
                              value={setting.minStaff}
                              min={setting.isRequired ? 1 : 0}
                              max={2}
                              onChange={(value) => updateDepartmentSetting(department.id, { minStaff: value })}
                            />
                            <NumberField
                              label="Tối đa"
                              value={setting.maxStaff}
                              min={1}
                              max={2}
                              onChange={(value) => updateDepartmentSetting(department.id, { maxStaff: value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activeDepartments.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-gray-400">Chưa có khoa đang hoạt động.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} rows={2} placeholder="Nhập ghi chú..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ShiftStatus }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="active">Đang áp dụng</option>
                  <option value="inactive">Ngừng áp dụng</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-70">
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-600">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-14 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </label>
  );
}
