import { LinesSkeleton } from './skeleton';

/**
 * Fallback for one data section of a page (PERF-001, UX-001): placeholder
 * lines while the page title, headings and other sections stay on screen.
 * Prefer the skeleton shaped like the content (`TableSkeleton`,
 * `DetailSkeleton`, `TilesSkeleton` in `skeleton.tsx`).
 */
export function SectionLoading({
  label = 'Loading…',
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return <LinesSkeleton label={label} lines={lines} />;
}
