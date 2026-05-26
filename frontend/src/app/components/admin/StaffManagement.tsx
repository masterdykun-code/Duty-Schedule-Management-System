import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, Pencil, Trash2, X, ChevronDown, AlertCircle } from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import {
  createStaff,
  deactivateStaff,
  fetchDepartments,
  fetchRooms,
  fetchStaff,
  toApiStatus,
  updateStaff,
  type DepartmentOption,
  type RoomOption,
  type StaffPayload,
  type StaffRecord,
} from "../../lib/adminApi";
import { DEFAULT_LIST_PAGE_SIZE, ListPagination } from "../shared/ListPagination";

type StaffStatus = "active" | "inactive";

interface StaffFormData {
  name: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  departmentId: string;
  roomId: string;
  position: string;
  status: StaffStatus;
}

const defaultPositions = ["Bác sĩ", "Điều dưỡng", "Y tá", "Kỹ thuật viên", "Trưởng khoa"];

const emptyForm: StaffFormData = {
  name: "",
  gender: "",
  dob: "",
  phone: "",
  email: "",
  departmentId: "",
  roomId: "",
  position: "",
  status: "active",
};

const STAFF_PER_PAGE = DEFAULT_LIST_PAGE_SIZE;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;

const genderLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
  "": "Chưa cập nhật",
};

export function StaffManagement() {
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [posFilter, setPosFilter] = useState("Tất cả");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffFormData>(emptyForm);
  const [viewStaff, setViewStaff] = useState<StaffRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const positionOptions = useMemo(() => {
    const merged = new Set([...defaultPositions, ...staffList.map((s) => s.position).filter(Boolean)]);
    return ["Tất cả", ...Array.from(merged)];
  }, [staffList]);

  const activeDepartments = departments.filter((department) => department.status === "ACTIVE");
  const activeRooms = rooms.filter(
    (room) => room.status === "ACTIVE" && room.departmentId === Number(form.departmentId),
  );

  const filtered = staffList.filter((staff) => {
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      staff.name.toLowerCase().includes(term) ||
      staff.code.toLowerCase().includes(term) ||
      staff.phone.includes(term);
    const matchDept = deptFilter === "all" || staff.departmentId === Number(deptFilter);
    const matchPos = posFilter === "Tất cả" || staff.position === posFilter;
    return matchSearch && matchDept && matchPos;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / STAFF_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * STAFF_PER_PAGE;
  const paginatedStaff = filtered.slice(pageStartIndex, pageStartIndex + STAFF_PER_PAGE);
  const visibleStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + paginatedStaff.length, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, posFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function loadData() {
    try {
      setLoading(true);
      const [departmentData, roomData, staffData] = await Promise.all([
        fetchDepartments(),
        fetchRooms(),
        fetchStaff(),
      ]);
      setDepartments(departmentData);
      setRooms(roomData);
      setStaffList(staffData);
    } catch (loadError) {
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(staff: StaffRecord) {
    setForm({
      name: staff.name,
      gender: staff.gender,
      dob: staff.dob,
      phone: staff.phone,
      email: staff.email,
      departmentId: String(staff.departmentId),
      roomId: staff.roomId ? String(staff.roomId) : "",
      position: staff.position,
      status: staff.status,
    });
    setEditingId(staff.id);
    setFormError("");
    setShowModal(true);
  }

  function buildPayload(): StaffPayload | null {
    const departmentId = Number(form.departmentId);
    const roomId = Number(form.roomId);

    if (!form.name.trim() || !departmentId || !form.position.trim()) {
      setFormError("Vui lòng nhập họ tên, khoa và chức vụ.");
      return null;
    }

    if (form.email.trim() && !emailPattern.test(form.email.trim())) {
      setFormError("Email không đúng định dạng.");
      return null;
    }

    if (form.phone.trim() && !phonePattern.test(form.phone.trim())) {
      setFormError("Số điện thoại phải gồm đúng 10 chữ số.");
      return null;
    }

    return {
      full_name: form.name.trim(),
      gender: form.gender,
      date_of_birth: form.dob || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      department_id: departmentId,
      room_id: roomId || null,
      position: form.position.trim(),
      status: toApiStatus(form.status),
    };
  }

  async function handleSave() {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      setFormError("");
      const savedStaff = editingId
        ? await updateStaff(editingId, payload)
        : await createStaff(payload);

      setStaffList((prev) =>
        editingId
          ? prev.map((staff) => (staff.id === editingId ? savedStaff : staff))
          : [...prev, savedStaff],
      );
      setShowModal(false);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Không thể lưu nhân viên.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deleteConfirm) return;

    try {
      setSaving(true);
      const updatedStaff = await deactivateStaff(deleteConfirm.id);
      setStaffList((prev) =>
        prev.map((staff) => (staff.id === updatedStaff.id ? updatedStaff : staff)),
      );
      setDeleteConfirm(null);
    } catch (deleteError) {
      console.error(deleteError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full min-h-0 max-w-full overflow-hidden flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Quản lý nhân viên y tế</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shrink-0">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên, mã nhân viên hoặc số điện thoại..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="all">Tất cả khoa</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <SelectFilter value={posFilter} options={positionOptions} onChange={setPosFilter} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-full shrink-0">
        <div className="max-w-full overflow-x-auto overflow-y-hidden">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Mã NV", "Họ tên", "Khoa", "Phòng", "Chức vụ", "Số điện thoại", "Trạng thái", "Thao tác"].map((heading) => (
                <th key={heading} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Đang tải danh sách nhân viên...</td></tr>
            )}
            {!loading && paginatedStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{staff.code}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{staff.name}</td>
                <td className="px-4 py-3 text-gray-600">{staff.department}</td>
                <td className="px-4 py-3 text-gray-600">{staff.room || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{staff.position}</td>
                <td className="px-4 py-3 text-gray-600">{staff.phone || "-"}</td>
                <td className="px-4 py-3"><StatusBadge status={staff.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewStaff(staff)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Xem"><Eye size={15} /></button>
                    <button onClick={() => openEdit(staff)} className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Sửa"><Pencil size={15} /></button>
                    {staff.status === "active" && (
                      <button onClick={() => setDeleteConfirm(staff)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Ngừng hoạt động"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Không tìm thấy nhân viên</td></tr>
            )}
          </tbody>
        </table>
        </div>
        {!loading && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageStart={visibleStart}
            pageEnd={visibleEnd}
            itemLabel="nhân viên"
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {viewStaff && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setViewStaff(null)}>
          <div className="bg-white rounded-xl shadow-xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Thông tin nhân viên</h3>
              <button onClick={() => setViewStaff(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                ["Mã nhân viên", viewStaff.code],
                ["Tên tài khoản", viewStaff.username],
                ["Họ tên", viewStaff.name],
                ["Khoa", viewStaff.department],
                ["Phòng", viewStaff.room || "Chưa cập nhật"],
                ["Chức vụ", viewStaff.position],
                ["Giới tính", genderLabel[viewStaff.gender] || "Chưa cập nhật"],
                ["Ngày sinh", viewStaff.dob || "Chưa cập nhật"],
                ["Số điện thoại", viewStaff.phone || "Chưa cập nhật"],
                ["Email", viewStaff.email || "Chưa cập nhật"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-sm text-gray-500 w-36 flex-shrink-0">{label}:</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-36 flex-shrink-0">Trạng thái:</span>
                <StatusBadge status={viewStaff.status} />
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Ngừng hoạt động nhân viên</h3>
            <p className="text-sm text-gray-600 mb-5">
              Nhân viên {deleteConfirm.name} sẽ không còn ở trạng thái hoạt động. Bạn có chắc chắn?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleDeactivate} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{editingId ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}
              <FormField label="Họ tên *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Nhập họ tên" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
                  <select value={form.gender} onChange={(e) => setForm((current) => ({ ...current, gender: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Chưa cập nhật</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <FormField label="Ngày sinh" type="date" value={form.dob} onChange={(value) => setForm((current) => ({ ...current, dob: value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Số điện thoại"
                  value={form.phone}
                  onChange={(value) => setForm((current) => ({ ...current, phone: value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="0901234567"
                  inputMode="numeric"
                  maxLength={10}
                />
                <FormField label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="email@hospital.vn" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Khoa *</label>
                  <select value={form.departmentId} onChange={(e) => setForm((current) => ({ ...current, departmentId: e.target.value, roomId: "" }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Chọn khoa</option>
                    {activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng</label>
                  <select value={form.roomId} onChange={(e) => setForm((current) => ({ ...current, roomId: e.target.value }))} disabled={!form.departmentId} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">{form.departmentId ? "Chọn phòng" : "Chọn khoa trước"}</option>
                    {activeRooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chức vụ *</label>
                <select value={form.position} onChange={(e) => setForm((current) => ({ ...current, position: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Chọn chức vụ</option>
                  {defaultPositions.map((position) => <option key={position}>{position}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as StaffStatus }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
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

function SelectFilter({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
