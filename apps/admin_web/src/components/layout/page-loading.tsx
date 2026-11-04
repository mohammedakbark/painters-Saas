import { Spinner } from '@/components/ui/spinner';

/**
 * Fallback while a console page loads its data. Each console page wraps its
 * request-time content in <Suspense> with this, so client navigations
 * between pages are instant (Next.js Cache Components).
 */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 py-6 text-body-large text-text-secondary"
      aria-busy="true"
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
