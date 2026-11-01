import { Skeleton } from '@kit/components/feedback/skeleton';

export const PageLoading = () => (
  <div className="space-y-4">
    <div className="h-8 w-48">
      <Skeleton className="h-8 w-48" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full" />
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);
