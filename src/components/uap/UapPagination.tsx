/**
 * Shared pagination controls for UAP entity directory pages.
 * Server-rendered — uses <Link> with URL search params for zero-JS navigation.
 */

import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  /** Preserve existing query params (sort, order, q) */
  searchParams?: Record<string, string | null>;
}

function buildPageUrl(basePath: string, page: number, searchParams?: Record<string, string | null>): string {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== null && v !== undefined) params.set(k, v);
    }
  }
  if (page > 1) params.set('page', String(page));
  const str = params.toString();
  return `${basePath}${str ? `?${str}` : ''}`;
}

export function UapPagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to show: current ± 2, plus first and last
  const pages: (number | 'ellipsis')[] = [];
  const range = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - range && i <= currentPage + range)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const linkClass = (active: boolean, disabled: boolean) =>
    `inline-flex items-center justify-center min-w-[36px] h-9 px-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-green-600 text-white shadow-sm'
        : disabled
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
    }`;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-8 mb-4">
      {/* First */}
      {currentPage > 3 && (
        <Link
          href={buildPageUrl(basePath, 1, searchParams)}
          className={linkClass(false, false)}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Link>
      )}

      {/* Previous */}
      <Link
        href={hasPrev ? buildPageUrl(basePath, currentPage - 1, searchParams) : '#'}
        className={linkClass(false, !hasPrev)}
        aria-label="Previous page"
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-1 text-slate-400 dark:text-slate-600 text-sm select-none">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildPageUrl(basePath, page, searchParams)}
            className={linkClass(page === currentPage, false)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Link>
        )
      )}

      {/* Next */}
      <Link
        href={hasNext ? buildPageUrl(basePath, currentPage + 1, searchParams) : '#'}
        className={linkClass(false, !hasNext)}
        aria-label="Next page"
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>

      {/* Last */}
      {currentPage < totalPages - 2 && (
        <Link
          href={buildPageUrl(basePath, totalPages, searchParams)}
          className={linkClass(false, false)}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}
