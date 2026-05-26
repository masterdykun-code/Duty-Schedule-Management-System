import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
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
import {
  AUTH_SESSION_KEY,
  getCurrentUser,
  type AuthSession,
  type AuthUser,
} from "./lib/auth";
import {
  appPages,
  canOpenPage,
  getDefaultPage,
  getPageFromPath,
  getPagePath,
  shouldLockPageScroll,
  type Page,
} from "./routes";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [initialSession] = useState(() => readStoredSession());
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null);
  const [checkingSession, setCheckingSession] = useState(Boolean(initialSession?.token));

  const requestedPage = getPageFromPath(location.pathname);
  const activePage =
    user && requestedPage && canOpenPage(user.role, requestedPage)
      ? requestedPage
      : user
        ? getDefaultPage(user.role)
        : null;

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
    if (checkingSession) return;

    if (!user) {
      if (location.pathname !== "/login") {
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
      return;
    }

    if (location.pathname === "/" || location.pathname === "/login") {
      navigate(getPagePath(getDefaultPage(user.role)), { replace: true });
      return;
    }

    if (!requestedPage || !canOpenPage(user.role, requestedPage)) {
      navigate(getPagePath(getDefaultPage(user.role)), { replace: true });
    }
  }, [checkingSession, location.pathname, navigate, requestedPage, user]);

  function handleLogin(session: AuthSession) {
    setToken(session.token);
    setUser(session.user);
    saveSession(session);

    const fromPath = (location.state as { from?: string } | null)?.from;
    const fromPage = fromPath ? getPageFromPath(fromPath) : null;
    const nextPage =
      fromPage && canOpenPage(session.user.role, fromPage)
        ? fromPage
        : getDefaultPage(session.user.role);

    navigate(getPagePath(nextPage), { replace: true });
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    clearSession();
    navigate("/login", { replace: true });
  }

  function handleUserUpdated(updatedUser: AuthUser) {
    setUser(updatedUser);
    if (token) {
      saveSession({ token, user: updatedUser });
    }
  }

  function handleNavigate(page: Page) {
    if (user && canOpenPage(user.role, page)) {
      navigate(getPagePath(page));
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

  const lockPageScroll = shouldLockPageScroll(activePage);

  function renderContent(page: Page) {
    if (!user) return null;

    const role = user.role;

    if (!canOpenPage(role, page)) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Bạn không có quyền truy cập chức năng này.
        </div>
      );
    }

    if (page === "dashboard") {
      if (role === "admin") return <AdminDashboard onOpenActivityLogs={() => handleNavigate("activity_logs")} />;
      if (role === "staff") return <StaffDashboard userName={user.name} />;
      if (role === "head") return <HeadDashboard userName={user.name} />;
      if (role === "office") return <OfficeDashboard />;
    }

    if (page === "staff_management" && role === "admin") return <StaffManagement />;
    if (page === "shift_management" && role === "admin") return <ShiftManagement />;
    if (page === "shift_assignment" && role === "admin") return <ShiftAssignment />;
    if (page === "activity_logs" && role === "admin") return <ActivityLogs />;
    if (page === "general_schedule") return <GeneralSchedule readOnly={role !== "admin"} />;
    if (page === "personal_schedule" && (role === "staff" || role === "head")) {
      return <PersonalSchedule user={user} />;
    }
    if (page === "exchange_requests" && (role === "staff" || role === "head")) {
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
        currentPage={activePage ?? getDefaultPage(user.role)}
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
          <Routes>
            <Route
              path="/"
              element={<Navigate to={getPagePath(getDefaultPage(user.role))} replace />}
            />
            <Route
              path="/login"
              element={<Navigate to={getPagePath(getDefaultPage(user.role))} replace />}
            />
            {appPages.map((page) => (
              <Route
                key={page}
                path={getPagePath(page)}
                element={renderContent(page)}
              />
            ))}
            <Route
              path="*"
              element={<Navigate to={getPagePath(getDefaultPage(user.role))} replace />}
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}
