import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

/**
 * A small square product or shop image (CAT-006). Images are pre-sized WebP
 * from object storage, so a plain <img> is used (see ImageUploadForm). Shows
 * a placeholder icon when there is no image.
 */
export function Thumbnail({
  src,
  alt,
  size = 'medium',
  placeholder = 'tag',
}: {
  src: string | null;
  /** Describes the image, e.g. "Photo of Silk Emulsion". */
  alt: string;
  size?: 'medium' | 'large';
  placeholder?: IconName;
}) {
  const box = size === 'large' ? 'size-16' : 'size-12';
  if (!src) {
    return (
      <span
        role="img"
        aria-label={`${alt}: no photo yet`}
        className={cn(
          box,
          'flex shrink-0 items-center justify-center rounded-panel border border-panel-border bg-surface-subtle text-text-disabled',
        )}
      >
        <Icon name={placeholder} className="size-5" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the component comment
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={size === 'large' ? 64 : 48}
      height={size === 'large' ? 64 : 48}
      className={cn(
        box,
        'shrink-0 rounded-panel border border-panel-border bg-surface-default object-cover',
      )}
    />
  );
}
