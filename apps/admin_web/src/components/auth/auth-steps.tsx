import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

const STEPS = ['Verify mobile', 'Shop details'] as const;

/** Registration progress: 1 Verify mobile → 2 Shop details (WEB-002). */
export function AuthSteps({ current }: { current: 1 | 2 }) {
  return (
    <ol aria-label="Registration steps" className="flex items-center gap-3">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-3"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-8 rounded-badge',
                  done || active ? 'bg-brand-primary' : 'bg-border-strong',
                )}
              />
            ) : null}
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-badge text-body font-bold',
                done && 'bg-brand-primary text-surface-default',
                active && 'bg-brand-accent text-text-primary',
                !done &&
                  !active &&
                  'border border-border-strong text-text-secondary',
              )}
            >
              {done ? <Icon name="check" className="size-4" /> : step}
            </span>
            <span
              className={cn(
                'text-body font-semibold',
                active ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              <span className="sr-only">
                Step {step} of {STEPS.length}
                {done ? ', done' : ''}:{' '}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
