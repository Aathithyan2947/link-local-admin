import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import { Button } from './button';
import { Spinner } from './card';

export interface Column<T> {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  meta,
  onPageChange,
  emptyMessage = 'No records found',
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500">
              {columns.map((c, i) => (
                <th key={i} className={cn('px-5 py-3.5 font-semibold', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <Spinner />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  {columns.map((c, ci) => (
                    <td key={ci} className={cn('px-5 py-3.5 text-gray-700', c.className)}>
                      {c.cell(row, ri)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
          <span>
            Showing {(meta.page - 1) * meta.pageSize + 1} to{' '}
            {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onPageChange?.(meta.page - 1)}
            >
              Prev
            </Button>
            <span className="px-2">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange?.(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
