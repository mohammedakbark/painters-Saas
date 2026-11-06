import { Card } from '@/components/ui/card';

/**
 * Fallback while a console page loads its data: a placeholder of the page
 * (title and two cards). Each console page wraps its request-time content
 * in <Suspense> with this, so client navigations between pages are instant
 * (Next.js Cache Components).
 */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
        <span className="h-9 w-64 max-w-full rounded-badge bg-border-default" />
        <span className="h-5 w-96 max-w-full rounded-badge bg-border-default" />
      </div>
      {[0, 1].map((key) => (
        <Card
          key={key}
          aria-hidden="true"
          className="flex animate-pulse flex-col gap-4 p-6"
        >
          <span className="h-6 w-48 rounded-badge bg-surface-subtle" />
          <span className="h-4 w-full rounded-badge bg-surface-subtle" />
          <span className="h-4 w-2/3 rounded-badge bg-surface-subtle" />
        </Card>
      ))}
    </div>
  );
}
