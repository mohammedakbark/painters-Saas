import { cn } from '@/lib/cn';
import { Icon } from './icon';

export type ProgressStepState = 'done' | 'current' | 'todo';

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
}

/**
 * Where a record is in a fixed sequence, such as an order's steps (UI
 * redesign): done steps are green with a tick, the current step has a ring,
 * later steps are grey. The state is also in words for screen readers, so it
 * never rests on colour alone.
 */
export function ProgressSteps({
  label,
  steps,
}: {
  /** Accessible name, e.g. "Order progress". */
  label: string;
  steps: readonly ProgressStep[];
}) {
  return (
    <ol aria-label={label} className="flex items-start">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={cn(
            'relative flex flex-1 flex-col items-center gap-1.5 text-center text-caption font-semibold',
            step.state === 'todo' ? 'text-text-disabled' : 'text-text-primary',
          )}
        >
          {index > 0 ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-3 right-1/2 -left-1/2 h-0.5 -translate-y-1/2',
                step.state === 'todo'
                  ? 'bg-border-default'
                  : 'bg-status-success',
              )}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 grid size-6 place-items-center rounded-full border-2',
              step.state === 'done' &&
                'border-status-success bg-status-success text-surface-default',
              step.state === 'current' &&
                'border-brand-primary bg-surface-default ring-4 ring-brand-primary-soft',
              step.state === 'todo' &&
                'border-border-strong bg-surface-default',
            )}
          >
            {step.state === 'done' ? (
              <Icon name="check" className="size-3" />
            ) : null}
          </span>
          <span>{step.label}</span>
          <span className="sr-only">
            {step.state === 'done'
              ? ', done'
              : step.state === 'current'
                ? ', current step'
                : ', not yet'}
          </span>
        </li>
      ))}
    </ol>
  );
}
