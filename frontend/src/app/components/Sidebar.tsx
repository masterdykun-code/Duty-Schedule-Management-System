import type { ReactNode } from "react";
import { NavLink } from "react-router";
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react";
import { getPagePath, type Page, type Role } from "../routes";

interface NavItem {
  id: Page;
  label: string;
  icon: ReactNode;
}

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={19} /> },
  { id: "staff_management", label: "Quản lý nhân viên", icon: <Users size={19} /> },
  { id: "shift_management", label: "Quản lý ca trực", icon: <Clock size={19} /> },
  { id: "shift_assignment", label: "Phân công ca trực", icon: <CalendarDays size={19} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <Calendar size={19} /> },
  { id: "activity_logs", label: "Danh sách hoạt động", icon: <Activity size={19} /> },
];

const staffNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={19} /> },
  { id: "personal_schedule", label: "Xem lịch trực cá nhân", icon: <Calendar size={19} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={19} /> },
  { id: "exchange_requests", label: "Xem yêu cầu đổi ca", icon: <ArrowLeftRight size={19} /> },
];

const headNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={19} /> },
  { id: "personal_schedule", label: "Xem lịch trực cá nhân", icon: <Calendar size={19} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={19} /> },
  { id: "exchange_requests", label: "Xem yêu cầu đổi ca", icon: <ArrowLeftRight size={19} /> },
];

const officeNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={19} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={19} /> },
];

const navByRole: Record<Role, NavItem[]> = {
  admin: adminNavItems,
  staff: staffNavItems,
  head: headNavItems,
  office: officeNavItems,
};

interface SidebarProps {
  role: Role;
  currentPage: Page;
  onLogout: () => void;
}

export function Sidebar({ role, currentPage, onLogout }: SidebarProps) {
  const navItems = navByRole[role];

  return (
    <aside className="w-64 bg-[#0F766E] min-h-screen fixed top-0 left-0 flex flex-col z-20">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-teal-600">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
          <Stethoscope size={18} className="text-teal-700" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-base leading-tight">MedSchedule</span>
          <span className="text-teal-200 text-xs leading-tight">Quản lý lịch trực</span>
        </div>
      </div>

      <nav className="flex-1 py-5 px-3.5 space-y-1.5">
        {navItems.map((item) => {
          const active = currentPage === item.id;

          return (
            <NavLink
              key={item.id}
              to={getPagePath(item.id)}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm transition-colors text-left ${
                active
                  ? "bg-white text-teal-800 font-semibold shadow-sm"
                  : "text-teal-50 hover:bg-teal-700 hover:text-white"
              }`}
            >
              <span className={active ? "text-teal-700" : "text-teal-100"}>{item.icon}</span>
              <span className="leading-snug">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-teal-600">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium text-teal-50 hover:bg-teal-700 hover:text-white transition-colors"
        >
          <LogOut size={19} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
