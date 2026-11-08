import { cn } from '@/lib/cn';
import { Card } from './card';

/**
 * Placeholders shaped like the content that is loading (UX-001), so the
 * page doesn't jump when data arrives. The pulse stops when the user asks
 * for reduced motion. Screen readers hear the label once.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block rounded-badge bg-surface-subtle motion-safe:animate-pulse',
        className,
      )}
    />
  );
}

function Busy({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A list page: toolbar and rows (DataTable). */
export function TableSkeleton({
  label = 'Loading…',
  rows = 5,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <Busy label={label} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 medium:flex-row">
        <Skeleton className="h-control w-full" />
        <Skeleton className="h-control w-full medium:w-56" />
      </Card>
      <Card className="flex flex-col divide-y divide-border-default">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-5 w-24" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-24 medium:block" />
          </div>
        ))}
      </Card>
    </Busy>
  );
}

/** A detail page: a main card and a side column. */
export function DetailSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <Busy
      label={label}
      className="grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <Card className="flex flex-col gap-4 p-5 medium:p-6">
        <Skeleton className="h-6 w-40" />
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </Card>
      <div className="flex flex-col gap-6">
        {[0, 1].map((key) => (
          <Card key={key} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </Busy>
  );
}

/** A row of stat tiles. */
export function TilesSkeleton({
  label = 'Loading…',
  tiles = 4,
}: {
  label?: string;
  tiles?: number;
}) {
  return (
    <Busy label={label} className="grid grid-cols-2 gap-4 wide:grid-cols-4">
      {Array.from({ length: tiles }, (_, index) => (
        <Card key={index} className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </Busy>
  );
}

/** A form or card body: a few lines. */
export function LinesSkeleton({
  label = 'Loading…',
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <Busy label={label} className="flex flex-col gap-3">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full'}
        />
      ))}
    </Busy>
  );
}
