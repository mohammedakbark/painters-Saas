import type { BadgeTone } from '@/components/ui/badge';

export type ShopStatus = 'DRAFT';
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
