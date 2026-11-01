import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@kit/components/forms/button';
import { formatNumber } from '@/lib/format';

type CursorPaginationProps = {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  totalItems?: number;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
};

/**
 * Paginação por cursor usada pela API do admin. `page` é 1-based e representa
 * apenas a posição na pilha de cursores, não o número total de páginas.
 */
export const CursorPagination = ({
  page,
  hasPrevious,
  hasNext,
  totalItems,
  onPrevious,
  onNext,
  loading = false,
}: CursorPaginationProps) => {
  if (!hasPrevious && !hasNext) return null;

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Página {formatNumber(page)}
        {totalItems !== undefined ? ` · ${formatNumber(totalItems)} registos` : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious || loading}
        >
          <ChevronLeftIcon className="w-4 h-4" /> Anterior
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext || loading}
        >
          Seguinte <ChevronRightIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
