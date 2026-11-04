import type { BadgeTone } from '@/components/ui/badge';

/** Mirrors ShopStatus in packages/api_contracts/openapi.json (PLT-002). */
export const SHOP_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'ACTIVE',
] as const;

export type ShopStatus = (typeof SHOP_STATUSES)[number];
export type ShopRole = 'MASTER';

const STATUS: Record<
  ShopStatus,
  { label: string; tone: BadgeTone; description: string }
> = {
  DRAFT: {
    label: 'Draft',
    tone: 'neutral',
    description: 'Not visible to customers or painters yet.',
  },
  PENDING_REVIEW: {
    label: 'In review',
    tone: 'info',
    description:
      'Waiting for the platform team. Not visible to customers or painters yet.',
  },
  CHANGES_REQUESTED: {
    label: 'Changes requested',
    tone: 'warning',
    description:
      'The platform team asked for changes. Not visible to customers or painters yet.',
  },
  ACTIVE: {
    label: 'Live',
    tone: 'success',
    description: 'Approved and visible to customers and painters.',
  },
};

const ROLE: Record<ShopRole, string> = {
  MASTER: 'Owner (master account)',
};

export function shopStatusLabel(status: ShopStatus) {
  return STATUS[status];
}

export function shopRoleLabel(role: ShopRole): string {
  return ROLE[role];
}
