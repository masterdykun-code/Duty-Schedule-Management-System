import { useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronDown,
  KeyRound,
  LogOut,
  X,
} from "lucide-react";
import { changePassword } from "../lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Role = "admin" | "staff" | "head" | "office";

const roleLabel: Record<Role, string> = {
  admin: "Quản trị viên",
  staff: "Nhân viên y tế",
  head: "Trưởng khoa",
  office: "Phòng hành chính",
};

interface HeaderProps {
  userName: string;
  role: Role;
  onLogout: () => void;
}

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function Header({ userName, role, onLogout }: HeaderProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-60 right-0 z-10">
      <h1 className="text-base font-semibold text-gray-800">
        HỆ THỐNG QUẢN LÝ LỊCH TRỰC BỆNH VIỆN
      </h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>
        <div className="pl-4 border-l border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-50 transition-colors"
                aria-label="Mở menu tài khoản"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-gray-800 leading-tight">
                    {userName}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {roleLabel[role]}
                  </span>
                </div>
                <ChevronDown size={14} className="text-gray-400 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-44">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Đăng xuất
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[420px]">
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
                  <AlertCircle
                    size={16}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-600">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle
                    size={16}
                    className="text-emerald-600 flex-shrink-0 mt-0.5"
                  />
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}

export type { Role };
