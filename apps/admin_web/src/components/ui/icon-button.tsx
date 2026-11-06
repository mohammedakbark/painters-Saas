import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

/**
 * A square button with only an icon (WEB-005), e.g. collapsing the sidebar.
 * `label` is its spoken name and its tooltip.
 */
export function IconButton({
  icon,
  label,
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  icon: IconName;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-nav-item text-text-secondary hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
