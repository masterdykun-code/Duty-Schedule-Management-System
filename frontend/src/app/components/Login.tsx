import { useState } from "react";
import { Stethoscope, Eye, EyeOff, AlertCircle } from "lucide-react";
import { login as loginRequest, type AuthSession } from "../lib/auth";

interface LoginProps {
  onLogin: (session: AuthSession) => void;
}

const demoAccounts = [
  { username: "admin", password: "123456", label: "Quản trị" },
  { username: "bs_an", password: "123456", label: "Nhân viên" },
  { username: "truong_kcc", password: "123456", label: "Trưởng khoa" },
  { username: "phong_hanh_chinh", password: "123456", label: "Hành chính" },
];

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await loginRequest(username.trim(), password);
      onLogin(session);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-700 rounded-2xl mb-4 shadow-lg">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Hệ thống quản lý lịch trực
          </h1>
          <p className="text-gray-500 text-sm mt-1">Nhân viên y tế</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Tài khoản demo:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => { setUsername(a.username); setPassword(a.password); setError(""); }}
                  className="text-left px-2.5 py-1.5 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 rounded-md text-xs text-gray-600 transition-colors"
                >
                  <span className="font-medium">{a.username}</span>
                  <span className="text-gray-400 ml-1">/ 123456</span>
                  <span className="block text-[11px] text-gray-400">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 MedSchedule — Hệ thống y tế
        </p>
      </div>
    </div>
  );
}
