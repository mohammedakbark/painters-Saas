import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

export type ButtonVariant =
  'primary' | 'secondary' | 'tertiary' | 'destructive';

/** `compact` is for actions inside table rows (ORD-002); `default` elsewhere. */
export type ButtonSize = 'default' | 'compact';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and announces it as busy. */
  pending?: boolean;
  /** Label shown while pending, e.g. "Signing in…". */
  pendingLabel?: string;
  /** For forms that submit through this button, e.g. `requestSubmit`. */
  ref?: Ref<HTMLButtonElement>;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-70';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-button-primary-background text-button-primary-foreground hover:bg-button-primary-background-hover',
  secondary:
    'border border-button-secondary-border bg-button-secondary-background text-button-secondary-foreground hover:bg-button-secondary-background-hover',
  /** Quiet text action, e.g. "Change number". */
  tertiary:
    'text-button-tertiary-foreground hover:bg-button-tertiary-background-hover',
  /** Confirms a destructive action, e.g. in `ConfirmDialog`. */
  destructive:
    'bg-button-destructive-background text-button-destructive-foreground hover:bg-button-destructive-background-hover',
};

/** Button styles, shared with ButtonLink so links that act as actions look the same. */
const SIZES: Record<ButtonSize, string> = {
  default: 'min-h-control px-6 text-body-large',
  compact: 'min-h-10 px-3 text-body',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  className?: string,
  size: ButtonSize = 'default',
): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

export function Button({
  variant = 'primary',
  size = 'default',
  pending = false,
  pendingLabel,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClasses(variant, className, size)}
      {...rest}
    >
      {pending ? <Spinner className="size-4" /> : null}
      <span className="inline-flex items-center gap-2">
        {pending && pendingLabel ? pendingLabel : children}
      </span>
    </button>
  );
}
