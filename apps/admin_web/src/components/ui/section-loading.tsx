/**
 * Fallback for one data section of a page (PERF-001): a few placeholder
 * lines inside the section's own card, while the page title, headings and
 * other sections stay on screen. Use `PageLoading` only when the whole page
 * depends on the data.
 */
export function SectionLoading({
  label = 'Loading…',
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={
            index === lines - 1
              ? 'h-4 w-2/3 rounded-badge bg-surface-subtle'
              : 'h-4 w-full rounded-badge bg-surface-subtle'
          }
        />
      ))}
    </div>
  );
}
