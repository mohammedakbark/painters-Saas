'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import {
  Menu,
  MenuButton,
  MenuLink,
  MenuSeparator,
} from '@/components/ui/menu';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';

type Action = () => Promise<CatalogueFormState>;

/**
 * The ⋯ menu of one catalogue row (WEB-005): edit, availability and
 * archive/restore. Archiving asks first. The API checks the owner role
 * again; this menu is only shown to the owner.
 */
export function RowActions({
  productName,
  editHref,
  availableCount,
  packCount,
  archived,
  markAllAvailable,
  markAllNotAvailable,
  setArchived,
}: {
  productName: string;
  editHref: string;
  availableCount: number;
  packCount: number;
  archived: boolean;
  markAllAvailable: Action;
  markAllNotAvailable: Action;
  setArchived: Action;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = productName;
  const run = (action: Action, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      after?.();
    });

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span role="alert" className="text-caption text-status-error">
          {error}
        </span>
      ) : null}
      <Menu
        label={`Actions for ${name}`}
        triggerClassName="justify-center px-2 text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
        trigger={
          pending ? (
            <span className="text-caption">Saving…</span>
          ) : (
            <Icon name="moreHorizontal" />
          )
        }
      >
        <MenuLink href={editHref}>
          <Icon name="notebook" className="size-4" />
          Edit prices and details
        </MenuLink>
        {archived || availableCount === packCount ? null : (
          <MenuButton disabled={pending} onSelect={() => run(markAllAvailable)}>
            <Icon name="eye" className="size-4" />
            {packCount === 1 ? 'Mark available' : 'Mark all sizes available'}
          </MenuButton>
        )}
        {archived || availableCount === 0 ? null : (
          <MenuButton
            disabled={pending}
            onSelect={() => run(markAllNotAvailable)}
          >
            <Icon name="eyeOff" className="size-4" />
            {packCount === 1
              ? 'Mark not available'
              : 'Mark all sizes not available'}
          </MenuButton>
        )}
        <MenuSeparator />
        {archived ? (
          <MenuButton disabled={pending} onSelect={() => run(setArchived)}>
            <Icon name="arrowLeft" className="size-4" />
            Restore product
          </MenuButton>
        ) : (
          <MenuButton
            tone="danger"
            disabled={pending}
            onSelect={() => setConfirming(true)}
          >
            <Icon name="archive" className="size-4" />
            Archive product
          </MenuButton>
        )}
      </Menu>
      <ConfirmDialog
        open={confirming}
        title="Archive this product?"
        message={`${productName} and all its pack sizes stop being sold. Customers will not see it. You can restore it from Archived.`}
        confirmLabel="Archive product"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => run(setArchived, () => setConfirming(false))}
      />
    </div>
  );
}
