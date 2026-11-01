interface SkeletonProps {
  className?: string
}

/** Bloco de loading genérico. Compor com className p/ w-/h- conforme o local. */
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`} />
)

/** Lista de skeletons empilhados — usar em mobile card-lists enquanto carrega. */
export const SkeletonStack = ({ count = 4, itemClassName = 'h-16 w-full' }: { count?: number; itemClassName?: string }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className={itemClassName} />
    ))}
  </div>
)
