import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_LIST_PAGE_SIZE = 7;

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getVisiblePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis-start", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", currentPage, "ellipsis-end", totalPages];
}

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export function ListPagination({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  const visibleItems = getVisiblePageItems(currentPage, totalPages);

  function goToPage(page: number) {
    onPageChange(Math.min(Math.max(page, 1), totalPages));
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <div className="text-xs text-gray-500">
        Hiển thị {pageStart}-{pageEnd} / {totalItems} {itemLabel}
      </div>

      <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {visibleItems.map((item) => (
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              onClick={() => goToPage(item)}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition-colors ${
                currentPage === item
                  ? "bg-teal-700 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="px-1 text-xs font-semibold text-gray-400">
              ...
            </span>
          )
        ))}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
