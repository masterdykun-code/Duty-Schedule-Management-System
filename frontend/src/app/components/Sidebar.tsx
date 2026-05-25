import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Calendar,
  ArrowLeftRight,
  LogOut,
  Stethoscope,
} from "lucide-react";
import type { Role } from "./Header";

type Page =
  | "dashboard"
  | "staff_management"
  | "shift_management"
  | "shift_assignment"
  | "general_schedule"
  | "personal_schedule"
  | "exchange_requests";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={18} /> },
  { id: "staff_management", label: "Quản lý nhân viên", icon: <Users size={18} /> },
  { id: "shift_management", label: "Quản lý ca trực", icon: <Clock size={18} /> },
  { id: "shift_assignment", label: "Phân công ca trực", icon: <CalendarDays size={18} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <Calendar size={18} /> },
];

const staffNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={18} /> },
  { id: "personal_schedule", label: "Xem lịch trực cá nhân", icon: <Calendar size={18} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={18} /> },
  { id: "exchange_requests", label: "Xem yêu cầu đổi ca", icon: <ArrowLeftRight size={18} /> },
];

const headNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={18} /> },
  { id: "personal_schedule", label: "Xem lịch trực cá nhân", icon: <Calendar size={18} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={18} /> },
  { id: "exchange_requests", label: "Xem yêu cầu đổi ca", icon: <ArrowLeftRight size={18} /> },
];

const officeNavItems: NavItem[] = [
  { id: "dashboard", label: "Trang tổng quan", icon: <LayoutDashboard size={18} /> },
  { id: "general_schedule", label: "Xem lịch trực tổng quát", icon: <CalendarDays size={18} /> },
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
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function Sidebar({ role, currentPage, onNavigate, onLogout }: SidebarProps) {
  const navItems = navByRole[role];

  return (
    <aside className="w-60 bg-[#0F766E] min-h-screen fixed top-0 left-0 flex flex-col z-20">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-teal-600">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Stethoscope size={16} className="text-teal-700" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm leading-tight">MedSchedule</span>
          <span className="text-teal-200 text-xs leading-tight">Quản lý lịch trực</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
              currentPage === item.id
                ? "bg-white text-teal-800 font-medium"
                : "text-teal-100 hover:bg-teal-700 hover:text-white"
            }`}
          >
            <span className={currentPage === item.id ? "text-teal-700" : ""}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-teal-600">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-100 hover:bg-teal-700 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

export type { Page };
