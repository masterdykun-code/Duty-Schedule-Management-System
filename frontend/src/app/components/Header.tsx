import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  KeyRound,
  Loader2,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { changePassword, updateProfile, type AuthUser } from "../lib/auth";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../lib/notificationApi";
import type { Page, Role } from "../routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const roleLabel: Record<Role, string> = {
  admin: "Quản trị viên",
  staff: "Nhân viên y tế",
  head: "Trưởng khoa",
  office: "Phòng hành chính",
};

interface HeaderProps {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const emptyProfileForm = {
  fullName: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  email: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;

export function Header({ user, onUserUpdated, onNavigate, onLogout }: HeaderProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const loadNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingNotifications(true);
      setNotificationError("");
      const result = await fetchNotifications(8);
      setNotifications(result.data);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : "Không thể tải thông báo.",
      );
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(() => loadNotifications(true), 20000);

    return () => window.clearInterval(timer);
  }, [loadNotifications, user.id]);

  function openPasswordModal() {
    setShowPasswordModal(true);
    setPasswordForm(emptyPasswordForm);
    setPasswordError("");
    setPasswordSuccess("");
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setPasswordForm(emptyPasswordForm);
    setPasswordError("");
    setPasswordSuccess("");
  }

  function openProfileModal() {
    setShowProfileModal(true);
    setProfileForm({
      fullName: user.name || "",
      gender: user.gender || "",
      dateOfBirth: user.dateOfBirth || "",
      phone: user.phone || "",
      email: user.email || "",
    });
    setProfileError("");
    setProfileSuccess("");
  }

  function closeProfileModal() {
    setShowProfileModal(false);
    setProfileForm(emptyProfileForm);
    setProfileError("");
    setProfileSuccess("");
  }

  async function handleChangePassword() {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError(
        "Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu.",
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError("");
      const message = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      );
      setPasswordSuccess(message);
      setPasswordForm(emptyPasswordForm);
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Không thể đổi mật khẩu.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSaveProfile() {
    if (!user.employeeId) {
      setProfileError("Tài khoản này chưa liên kết với nhân viên y tế.");
      return;
    }

    if (!profileForm.fullName.trim()) {
      setProfileError("Vui lòng nhập họ tên.");
      return;
    }

    if (profileForm.phone.trim() && !phonePattern.test(profileForm.phone.trim())) {
      setProfileError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }

    if (profileForm.email.trim() && !emailPattern.test(profileForm.email.trim())) {
      setProfileError("Email không đúng định dạng.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError("");
      const result = await updateProfile({
        full_name: profileForm.fullName.trim(),
        gender: profileForm.gender,
        date_of_birth: profileForm.dateOfBirth || null,
        phone: profileForm.phone.trim() || null,
        email: profileForm.email.trim() || null,
      });
      setProfileSuccess(result.message);
      onUserUpdated(result.user);
      setProfileForm({
        fullName: result.user.name || "",
        gender: result.user.gender || "",
        dateOfBirth: result.user.dateOfBirth || "",
        phone: result.user.phone || "",
        email: result.user.email || "",
      });
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Không thể cập nhật thông tin cá nhân.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleNotificationClick(notification: NotificationRecord) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, isRead: true, readAt: item.readAt || "now" }
              : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        await loadNotifications(true);
      }
    }

    if (notification.linkTarget) {
      onNavigate(notification.linkTarget as Page);
    }

    setNotificationsOpen(false);
  }

  async function handleMarkAllNotificationsRead() {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || "now",
        })),
      );
      setUnreadCount(0);
    } catch {
      await loadNotifications(true);
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between gap-3 px-4 md:px-6 fixed top-0 left-16 right-0 z-30">
      <h1 className="truncate pl-2 text-sm font-semibold text-teal-700 md:text-base">
        HỆ THỐNG QUẢN LÝ LỊCH TRỰC BỆNH VIỆN
      </h1>
      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu
          open={notificationsOpen}
          onOpenChange={(open) => {
            setNotificationsOpen(open);
            if (open) void loadNotifications(true);
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative p-2 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Mở thông báo"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white leading-4 text-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-[min(360px,calc(100vw-24px))] p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">Thông báo</div>
                <div className="text-xs text-gray-500">{unreadCount} thông báo chưa đọc</div>
              </div>
              <button
                type="button"
                onClick={handleMarkAllNotificationsRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <CheckCheck size={14} />
                Đọc hết
              </button>
            </div>

            {loadingNotifications ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Đang tải thông báo...
              </div>
            ) : notificationError ? (
              <div className="px-4 py-5 text-sm text-red-600">{notificationError}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Chưa có thông báo nào.
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                      notification.isRead ? "bg-white" : "bg-teal-50/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${notification.isRead ? "bg-gray-300" : "bg-teal-600"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {notification.title}
                          </span>
                          <span className="flex-shrink-0 text-[11px] text-gray-400">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                          {notification.message}
                        </span>
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getNotificationTypeClass(notification.type)}`}>
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="pl-4 border-l border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-50 transition-colors"
                aria-label="Mở menu tài khoản"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden flex-col text-left sm:flex">
                  <span className="text-sm font-medium text-gray-800 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {roleLabel[user.role]}
                  </span>
                </div>
                <ChevronDown size={14} className="text-gray-400 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-48">
              <DropdownMenuItem
                onSelect={openProfileModal}
                className="cursor-pointer focus:bg-teal-50 focus:text-teal-700"
              >
                <UserRound size={15} />
                Thông tin cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={openPasswordModal}
                className="cursor-pointer focus:bg-teal-50 focus:text-teal-700"
              >
                <KeyRound size={15} />
                Đổi mật khẩu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          onClick={onLogout}
          className="hidden items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors sm:flex"
        >
          <LogOut size={14} />
          Đăng xuất
        </button>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[520px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Thông tin cá nhân</h3>
              <button onClick={closeProfileModal}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <InfoRow label="Tên tài khoản" value={user.username} />
                <InfoRow label="Vai trò" value={roleLabel[user.role]} />
                <InfoRow label="Mã nhân viên" value={user.employeeCode || "-"} />
                <InfoRow label="Chức vụ" value={user.position || "-"} />
                <InfoRow label="Khoa" value={user.departmentName || "-"} />
                <InfoRow label="Phòng" value={user.roomCode || user.roomName || "-"} />
              </div>

              <TextField
                label="Họ tên *"
                value={profileForm.fullName}
                onChange={(value) =>
                  setProfileForm((current) => ({ ...current, fullName: value }))
                }
                disabled={!user.employeeId}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Giới tính
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        gender: event.target.value,
                      }))
                    }
                    disabled={!user.employeeId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Chưa cập nhật</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <TextField
                  label="Ngày sinh"
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(value) =>
                    setProfileForm((current) => ({ ...current, dateOfBirth: value }))
                  }
                  disabled={!user.employeeId}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Số điện thoại"
                  value={profileForm.phone}
                  onChange={(value) =>
                    setProfileForm((current) => ({ ...current, phone: value }))
                  }
                  disabled={!user.employeeId}
                  maxLength={10}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(value) =>
                    setProfileForm((current) => ({ ...current, email: value }))
                  }
                  disabled={!user.employeeId}
                />
              </div>

              {!user.employeeId && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Tài khoản này chưa có hồ sơ nhân viên nên chỉ xem được thông tin tài khoản.
                  </p>
                </div>
              )}

              {profileError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{profileError}</p>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">{profileSuccess}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile || !user.employeeId}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-70"
              >
                {savingProfile ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[420px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Đổi mật khẩu</h3>
              <button onClick={closePasswordModal}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <PasswordField
                label="Mật khẩu cũ *"
                value={passwordForm.currentPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: value,
                  }))
                }
              />
              <PasswordField
                label="Mật khẩu mới *"
                value={passwordForm.newPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: value,
                  }))
                }
              />
              <PasswordField
                label="Xác nhận mật khẩu *"
                value={passwordForm.confirmPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: value,
                  }))
                }
              />

              {passwordError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">{passwordSuccess}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
              <button
                onClick={closePasswordModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-70"
              >
                {changingPassword ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 font-medium text-gray-800 truncate">{value}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      type="password"
      label={label}
      value={value}
      onChange={onChange}
    />
  );
}

function formatNotificationTime(value: string) {
  if (!value) return "";

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16) || value;
  }

  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    SCHEDULE_ASSIGNED: "Lịch trực",
    SCHEDULE_UPDATED: "Lịch trực",
    SCHEDULE_RESET: "Lịch trực",
    SWAP_REQUEST_CREATED: "Đổi ca",
    SWAP_REQUEST_RESPONDED: "Đổi ca",
    SWAP_REQUEST_APPROVED: "Đổi ca",
    SWAP_REQUEST_REJECTED: "Đổi ca",
    SWAP_REQUEST_EXPIRED: "Đổi ca",
    SYSTEM: "Hệ thống",
  };

  return labels[type] || "Thông báo";
}

function getNotificationTypeClass(type: string) {
  if (type.startsWith("SCHEDULE")) {
    return "bg-blue-50 text-blue-700";
  }

  if (type.startsWith("SWAP")) {
    return "bg-teal-50 text-teal-700";
  }

  return "bg-gray-100 text-gray-600";
}
