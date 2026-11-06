import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/cn';
import { LogoMark } from './logo-mark';

/**
 * The product mark (DS-001, DS-003): the SevenPalette fan and wordmark.
 * Every place that shows the brand uses this component, so a logo change is
 * made here once. Screen readers hear the plain name.
 */
export function BrandMark({
  as: Tag = 'p',
  size = 'title',
  name = 'portal',
  tone = 'default',
  className,
}: {
  as?: 'p' | 'h1' | 'span';
  size?: 'title' | 'heading1';
  /** `product` on public pages, `portal` inside the portal (adds "Admin"). */
  name?: 'product' | 'portal';
  /** `inverse` on dark brand surfaces. */
  tone?: 'default' | 'inverse';
  className?: string;
}) {
  const inverse = tone === 'inverse';
  const label = name === 'product' ? BRAND.productName : BRAND.adminPortalName;

  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2',
        size === 'heading1' ? 'text-heading1' : 'text-title',
        className,
      )}
    >
      <LogoMark
        tone={inverse ? 'inverse' : 'full'}
        className={size === 'heading1' ? 'h-10' : 'h-7'}
      />
      <span aria-hidden="true" className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-bold tracking-tight',
            inverse ? 'text-surface-default' : 'text-text-primary',
          )}
        >
          Seven
          <span
            className={inverse ? 'text-brand-accent' : 'text-brand-primary'}
          >
            Palette
          </span>
        </span>
        {name === 'portal' ? (
          <span
            className={cn(
              'text-body font-semibold',
              inverse ? 'text-brand-primary-soft' : 'text-text-secondary',
            )}
          >
            Admin
          </span>
        ) : null}
      </span>
      <span className="sr-only">{label}</span>
    </Tag>
  );
}
