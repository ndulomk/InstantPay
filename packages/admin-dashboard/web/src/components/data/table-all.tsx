import type { ReactNode } from 'react';
import { Skeleton } from '@kit/components/feedback/skeleton';

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type TableAllProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  loadingRows?: number;
  emptyMessage?: string;
};

const columnClass = <T,>(column: TableColumn<T>): string =>
  column.className ?? '';

/**
 * Tabela desktop partilhada por todas as list-pages. Mantém o mesmo visual do
 * kit e evita duplicar markup de tabela em cada módulo.
 */
export const TableAll = <T,>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loading = false,
  loadingRows = 5,
  emptyMessage = 'Sem registos para mostrar',
}: TableAllProps<T>) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: loadingRows }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 ${column.headerClassName ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-600"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                      : ''
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${columnClass(column)}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
