import { Skeleton, DetailSkeleton } from '@/components/ui/skeleton';

/**
 * Fallback while a whole console page depends on its data (UX-001): a title
 * placeholder and the detail layout. Prefer a static header with a section
 * skeleton (PERF-001); use this only where the title itself is data.
 */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Shaped like the page bar (PageHeader), so nothing jumps. */}
      <div
        aria-hidden="true"
        className="-mx-4 flex flex-col gap-2 border-b border-top-bar-border bg-top-bar-background px-4 py-4 medium:-mx-6 medium:px-6"
      >
        <Skeleton className="h-7 w-64 max-w-full bg-border-default" />
        <Skeleton className="h-5 w-96 max-w-full bg-border-default" />
      </div>
      <DetailSkeleton label={label} />
    </div>
  );
}
