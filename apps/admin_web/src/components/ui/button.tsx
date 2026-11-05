import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner, disables the button and announces it as busy. */
  pending?: boolean;
  /** Label shown while pending, e.g. "Signing in…". */
  pendingLabel?: string;
}

const BASE =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-button px-6 text-body-large font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-70';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-button-primary-background text-button-primary-foreground hover:bg-button-primary-background-hover',
  secondary:
    'border border-button-secondary-border bg-button-secondary-background text-button-secondary-foreground hover:bg-button-secondary-background-hover',
};

/** Button styles, shared with ButtonLink so links that act as actions look the same. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], className);
}

export function Button({
  variant = 'primary',
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
      className={buttonClasses(variant, className)}
      {...rest}
    >
      {pending ? <Spinner className="size-4" /> : null}
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  );
}
