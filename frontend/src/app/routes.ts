export type Role = "admin" | "staff" | "head" | "office";

export type Page =
  | "dashboard"
  | "staff_management"
  | "shift_management"
  | "shift_assignment"
  | "general_schedule"
  | "activity_logs"
  | "personal_schedule"
  | "exchange_requests";

export const routeByPage: Record<Page, string> = {
  dashboard: "/dashboard",
  staff_management: "/admin/staff",
  shift_management: "/admin/shifts",
  shift_assignment: "/admin/assignments",
  general_schedule: "/schedules/general",
  activity_logs: "/admin/activity-logs",
  personal_schedule: "/schedules/personal",
  exchange_requests: "/swap-requests",
};

export const appPages = Object.keys(routeByPage) as Page[];

export const pagesByRole: Record<Role, Page[]> = {
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

const pageByRoute = new Map(
  appPages.map((page) => [routeByPage[page], page] as const),
);

const scrollLockedPages = new Set<Page>([
  "staff_management",
  "general_schedule",
  "shift_assignment",
]);

export function canOpenPage(role: Role, page: Page) {
  return pagesByRole[role].includes(page);
}

export function getDefaultPage(_role: Role): Page {
  return "dashboard";
}

export function getPagePath(page: Page) {
  return routeByPage[page];
}

export function getPageFromPath(pathname: string): Page | null {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return pageByRoute.get(normalizedPath) ?? null;
}

export function shouldLockPageScroll(page: Page | null) {
  return page ? scrollLockedPages.has(page) : false;
}
