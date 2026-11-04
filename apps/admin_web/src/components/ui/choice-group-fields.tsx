// Radio and checkbox groups (D-039): a fieldset with a legend, an optional
// hint, one labelled control per option and an accessible error.

import type { ReactNode } from 'react';

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

interface GroupProps {
  legend: string;
  name: string;
  options: readonly ChoiceOption[];
  hint?: string;
  error?: string;
}

function GroupFrame({
  legend,
  name,
  hint,
  error,
  children,
}: Omit<GroupProps, 'options'> & { children: ReactNode }) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={
        [hintId, errorId].filter(Boolean).join(' ') || undefined
      }
    >
      <legend className="text-body-large font-semibold">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-caption text-text-secondary">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Choice({
  type,
  name,
  option,
  checked,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  option: ChoiceOption;
  checked: boolean;
}) {
  const id = `${name}-${option.value}`;
  const descriptionId = option.description ? `${id}-description` : undefined;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type={type}
        name={name}
        value={option.value}
        defaultChecked={checked}
        aria-describedby={descriptionId}
        className="mt-1 size-5 accent-brand-primary"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-body font-medium text-text-primary">
          {option.label}
        </label>
        {option.description ? (
          <p id={descriptionId} className="text-caption text-text-secondary">
            {option.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Choose one option. */
export function RadioGroupField({
  defaultValue,
  ...group
}: GroupProps & { defaultValue?: string }) {
  return (
    <GroupFrame {...group}>
      {group.options.map((option) => (
        <Choice
          key={option.value}
          type="radio"
          name={group.name}
          option={option}
          checked={defaultValue === option.value}
        />
      ))}
    </GroupFrame>
  );
}

/** Choose any number of options. */
export function CheckboxGroupField({
  defaultValues = [],
  ...group
}: GroupProps & { defaultValues?: readonly string[] }) {
  const chosen = new Set(defaultValues);
  return (
    <GroupFrame {...group}>
      {group.options.map((option) => (
        <Choice
          key={option.value}
          type="checkbox"
          name={group.name}
          option={option}
          checked={chosen.has(option.value)}
        />
      ))}
    </GroupFrame>
  );
}
