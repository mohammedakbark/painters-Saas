'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface ComboboxOption {
  id: string;
  title: string;
  /** Second line, e.g. "Demo Paints · Interior emulsion · 1 L, 4 L". */
  detail?: string;
  /** Short note on the right, e.g. "In your products". */
  note?: string;
}

/**
 * A search box with suggestions (CAT-005, D-039): type to search, pick with
 * the mouse or the arrow keys and Enter. The last option always offers to
 * create what was typed. Follows the ARIA combobox pattern.
 */
export function Combobox({
  label,
  description,
  placeholder,
  minLength = 2,
  search,
  onSelect,
  onCreate,
  createLabel,
}: {
  label: string;
  description?: string;
  placeholder?: string;
  minLength?: number;
  search: (text: string) => Promise<ComboboxOption[]>;
  onSelect: (option: ComboboxOption) => void;
  /** Called with the typed text when the "create" option is chosen. */
  onCreate: (text: string) => void;
  createLabel: (text: string) => string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef('');

  const ready = text.trim().length >= minLength;
  const total = ready ? options.length + 1 : 0;

  function change(value: string) {
    setText(value);
    setActive(0);
    setOpen(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    const query = value.trim();
    latest.current = query;
    if (query.length < minLength) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      void search(query)
        .then((found) => {
          if (latest.current === query) {
            setOptions(found);
          }
        })
        .finally(() => {
          if (latest.current === query) {
            setLoading(false);
          }
        });
    }, 300);
  }

  function choose(index: number) {
    if (index < options.length) {
      onSelect(options[index]!);
    } else {
      onCreate(text.trim());
    }
    setOpen(false);
  }

  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-medium text-text-primary">
        {label}
      </label>
      {description ? (
        <p
          id={`${id}-description`}
          className="text-caption text-text-secondary"
        >
          {description}
        </p>
      ) : null}
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && ready}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={description ? `${id}-description` : undefined}
          aria-activedescendant={open && ready ? optionId(active) : undefined}
          autoComplete="off"
          maxLength={60}
          value={text}
          placeholder={placeholder}
          onChange={(event) => change(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (!ready) {
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActive((index) => (index + 1) % total);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + total) % total);
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              choose(active);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="min-h-control w-full rounded-control border border-control-border bg-control-background pr-4 pl-12 text-body-large text-text-primary placeholder:text-text-disabled focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-primary"
        />
      </div>
      {open && ready ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-30 mt-2 flex max-h-96 w-full flex-col overflow-y-auto rounded-panel border border-card-border bg-card-background p-1.5 shadow-xl shadow-brand-primary/10"
        >
          {loading && options.length === 0 ? (
            <li
              className="px-3 py-2 text-body text-text-secondary"
              aria-live="polite"
            >
              Searching…
            </li>
          ) : null}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-nav-item px-3 py-2.5',
                active === index && 'bg-surface-subtle',
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold text-text-primary">
                  {option.title}
                </span>
                {option.detail ? (
                  <span className="truncate text-caption text-text-secondary">
                    {option.detail}
                  </span>
                ) : null}
              </span>
              {option.note ? (
                <span className="shrink-0 text-caption font-semibold text-status-success">
                  {option.note}
                </span>
              ) : null}
            </li>
          ))}
          <li
            id={optionId(options.length)}
            role="option"
            aria-selected={active === options.length}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(options.length)}
            onMouseEnter={() => setActive(options.length)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-nav-item border-t border-border-default px-3 py-2.5 text-body font-semibold text-brand-primary',
              active === options.length && 'bg-brand-primary-soft',
            )}
          >
            <Icon name="plus" className="size-4" />
            {createLabel(text.trim())}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
