import { AlertBanner } from '@kit/components/feedback/alert-banner';
import { Button } from '@kit/components/forms/button';
import { errorMessage } from '@/lib/api-client';

type ErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export const ErrorState = ({
  error,
  title = 'Não foi possível carregar os dados',
  onRetry,
  compact = false,
}: ErrorStateProps) => (
  <div className={compact ? '' : 'py-6'}>
    <AlertBanner tone="danger" message={title}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{errorMessage(error)}</span>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
          >
            Tentar novamente
          </Button>
        )}
      </div>
    </AlertBanner>
  </div>
);
