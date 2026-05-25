import { useEffect, useState } from "react";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { StaffManagement } from "./components/admin/StaffManagement";
import { ShiftManagement } from "./components/admin/ShiftManagement";
import { ShiftAssignment } from "./components/admin/ShiftAssignment";
import { ActivityLogs } from "./components/admin/ActivityLogs";
import { GeneralSchedule } from "./components/shared/GeneralSchedule";
import { StaffDashboard } from "./components/staff/StaffDashboard";
import { PersonalSchedule } from "./components/staff/PersonalSchedule";
import { ExchangeRequests } from "./components/shared/ExchangeRequests";
import { HeadDashboard } from "./components/head/HeadDashboard";
import { OfficeDashboard } from "./components/office/OfficeDashboard";
import type { Role } from "./components/Header";
import type { Page } from "./components/Sidebar";
import {
  AUTH_SESSION_KEY,
  getCurrentUser,
  type AuthSession,
  type AuthUser,
} from "./lib/auth";

const pagesByRole: Record<Role, Page[]> = {
  admin: [
    "dashboard",
    "staff_management",
    "shift_management",
    "shift_assignment",
    "general_schedule",
    "activity_logs",
  ],
  staff: ["dashboard", "personal_schedule", "general_schedule", "exchange_requests"],
  head: ["dashboard", "personal_schedule", "general_schedule", "exchange_requests"],
  office: ["dashboard", "general_schedule"],
};

function canOpenPage(role: Role, page: Page) {
  return pagesByRole[role].includes(page);
}

function readStoredSession(): AuthSession | null {
  try {
    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession) as AuthSession;
    if (!session.token || !session.user) return null;

    return session;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function saveSession(session: AuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export default function App() {
  const initialSession = readStoredSession();
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null);
  const [checkingSession, setCheckingSession] = useState(Boolean(initialSession?.token));
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;

    getCurrentUser(token)
      .then((currentUser) => {
        if (cancelled) return;

        setUser(currentUser);
        saveSession({ token, user: currentUser });
      })
      .catch(() => {
        if (cancelled) return;
        handleLogout();
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (user && !canOpenPage(user.role, currentPage)) {
      setCurrentPage("dashboard");
    }
  }, [currentPage, user]);

  function handleLogin(session: AuthSession) {
    setToken(session.token);
    setUser(session.user);
    saveSession(session);
    setCurrentPage("dashboard");
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    clearSession();
    setCurrentPage("dashboard");
  }

  function handleUserUpdated(updatedUser: AuthUser) {
    setUser(updatedUser);
    if (token) {
      saveSession({ token, user: updatedUser });
    }
  }

  function handleNavigate(page: Page) {
    if (!user || canOpenPage(user.role, page)) {
      setCurrentPage(page);
    }
  }

  if (checkingSession && !user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-gray-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const lockPageScroll =
    currentPage === "staff_management" ||
    currentPage === "general_schedule" ||
    currentPage === "shift_assignment";

  function renderContent() {
    if (!user) return null;

    const role = user.role;

    if (!canOpenPage(role, currentPage)) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Bạn không có quyền truy cập chức năng này.
        </div>
      );
    }

    if (currentPage === "dashboard") {
      if (role === "admin") return <AdminDashboard onOpenActivityLogs={() => setCurrentPage("activity_logs")} />;
      if (role === "staff") return <StaffDashboard userName={user.name} />;
      if (role === "head") return <HeadDashboard userName={user.name} />;
      if (role === "office") return <OfficeDashboard />;
    }

    if (currentPage === "staff_management" && role === "admin") return <StaffManagement />;
    if (currentPage === "shift_management" && role === "admin") return <ShiftManagement />;
    if (currentPage === "shift_assignment" && role === "admin") return <ShiftAssignment />;
    if (currentPage === "activity_logs" && role === "admin") return <ActivityLogs />;
    if (currentPage === "general_schedule") return <GeneralSchedule readOnly={role !== "admin"} />;
    if (currentPage === "personal_schedule" && (role === "staff" || role === "head")) {
      return <PersonalSchedule user={user} />;
    }
    if (currentPage === "exchange_requests" && (role === "staff" || role === "head")) {
      return <ExchangeRequests mode={role === "head" ? "head" : "staff"} />;
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Trang đang được phát triển...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar
        role={user.role}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <Header
        user={user}
        onUserUpdated={handleUserUpdated}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <main className={`ml-64 pt-16 ${lockPageScroll ? "h-screen overflow-hidden" : "min-h-screen"}`}>
        <div className={`p-6 ${lockPageScroll ? "h-full overflow-hidden" : ""}`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
