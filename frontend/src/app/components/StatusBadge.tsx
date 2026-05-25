type BadgeStatus =
  | "active"
  | "inactive"
  | "assigned"
  | "waiting_response"
  | "waiting_process"
  | "approved"
  | "rejected"
  | "expired"
  | "empty"
  | "on_duty";

const badgeConfig: Record<BadgeStatus, { label: string; className: string }> = {
  active: { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Ngừng hoạt động", className: "bg-gray-100 text-gray-500" },
  assigned: { label: "Đã phân công", className: "bg-blue-100 text-blue-700" },
  waiting_response: { label: "Chờ phản hồi", className: "bg-yellow-100 text-yellow-700" },
  waiting_process: { label: "Chờ xử lý", className: "bg-orange-100 text-orange-700" },
  approved: { label: "Đã duyệt", className: "bg-green-100 text-green-700" },
  rejected: { label: "Bị từ chối", className: "bg-red-100 text-red-700" },
  expired: { label: "Hết hạn", className: "bg-gray-100 text-gray-500" },
  empty: { label: "Trống", className: "bg-gray-50 text-gray-400" },
  on_duty: { label: "Có trực", className: "bg-teal-100 text-teal-700" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const cfg = badgeConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export type { BadgeStatus };
