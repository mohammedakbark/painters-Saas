import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/cn';

/**
 * The product mark (DS-001). A text mark until a logo is chosen: when the
 * logo arrives, change this component only, since every place that shows
 * the brand uses it.
 */
export function BrandMark({
  as: Tag = 'p',
  size = 'title',
  className,
}: {
  as?: 'p' | 'h1' | 'span';
  size?: 'title' | 'heading1';
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        size === 'heading1'
          ? 'text-heading1 font-bold'
          : 'text-title font-semibold',
        'text-text-primary',
        className,
      )}
    >
      {BRAND.adminPortalName}
    </Tag>
  );
}
