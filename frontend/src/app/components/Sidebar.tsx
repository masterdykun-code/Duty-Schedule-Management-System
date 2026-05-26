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
    <aside
      tabIndex={0}
      className="group fixed left-0 top-0 z-40 flex min-h-screen w-16 flex-col overflow-hidden bg-[#0F766E] shadow-xl transition-[width] duration-200 ease-out hover:w-72 focus-within:w-72"
    >
      <div className="flex h-16 items-center gap-0 border-b border-teal-600 px-3 transition-[gap] duration-200 group-hover:gap-3 group-focus-within:gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white">
          <Stethoscope size={18} className="text-teal-700" />
        </div>
        <div className="flex max-w-0 flex-col overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-48 group-hover:opacity-100 group-focus-within:max-w-48 group-focus-within:opacity-100">
          <span className="text-white font-semibold text-base leading-tight">MedSchedule</span>
          <span className="text-teal-200 text-xs leading-tight">Quản lý lịch trực</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-2 py-5">
        {navItems.map((item) => {
          const active = currentPage === item.id;

          return (
            <NavLink
              key={item.id}
              to={getPagePath(item.id)}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 w-full items-center justify-center gap-0 rounded-xl px-0 text-left text-sm transition-[gap,padding,background-color,color,box-shadow] duration-200 group-hover:justify-start group-hover:gap-3.5 group-hover:px-4 group-focus-within:justify-start group-focus-within:gap-3.5 group-focus-within:px-4 ${
                active
                  ? "bg-white text-teal-800 font-semibold shadow-sm"
                  : "text-teal-50 hover:bg-teal-700 hover:text-white"
              }`}
            >
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center ${active ? "text-teal-700" : "text-teal-100"}`}>{item.icon}</span>
              <span className="max-w-0 overflow-hidden whitespace-nowrap leading-snug opacity-0 transition-all duration-200 group-hover:max-w-56 group-hover:opacity-100 group-focus-within:max-w-56 group-focus-within:opacity-100">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-teal-600 p-2">
        <button
          onClick={onLogout}
          title="Đăng xuất"
          className="flex h-12 w-full items-center justify-center gap-0 rounded-xl px-0 text-sm font-medium text-teal-50 transition-[gap,padding,background-color,color] duration-200 hover:bg-teal-700 hover:text-white group-hover:justify-start group-hover:gap-3.5 group-hover:px-4 group-focus-within:justify-start group-focus-within:gap-3.5 group-focus-within:px-4"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <LogOut size={19} />
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-40 group-hover:opacity-100 group-focus-within:max-w-40 group-focus-within:opacity-100">
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );
}
