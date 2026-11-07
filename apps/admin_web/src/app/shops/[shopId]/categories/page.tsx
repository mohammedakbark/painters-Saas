import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { type Column, DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoading } from '@/components/ui/section-loading';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import {
  listShopCategories,
  type ShopCategory,
} from '@/lib/api/shop-categories';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { listLink, oneOf, text } from '@/lib/list-params';
import { createShopCategoryAction, updateShopCategoryAction } from './actions';
import { ShopCategoryForm } from './category-forms';

export const metadata: Metadata = { title: 'Categories' };

type Props = PageProps<'/shops/[shopId]/categories'>;

const VIEWS = ['all', 'own', 'platform'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABELS: Record<View, string> = {
  all: 'All',
  own: 'Yours',
  platform: 'Platform',
};
const ADD_SHEET = 'add-category';
const editSheet = (id: string) => `edit-category-${id}`;

/**
 * Categories (CAT-007, D-048): the platform's categories and the shop's own.
 * A shop has at most 50 of its own, so the list is not paged.
 */
export default function CategoriesPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Every product belongs to a category. Use the platform's categories, or add your own for things only your shop sells."
      />
      <Suspense fallback={<SectionLoading label="Loading categories…" />}>
        <Categories {...props} />
      </Suspense>
    </div>
  );
}

async function Categories({ params, searchParams }: Props) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const categories = await listShopCategories(
    await requireShopSession(),
    shopId,
  );
  const view = oneOf(VIEWS, text((await searchParams).view), 'all');
  const base = `/shops/${encodeURIComponent(shopId)}/categories`;
  const canEdit = shop.myRole === 'MASTER';
  const own = categories.filter((category) => category.own);
  const rows =
    view === 'all'
      ? categories
      : categories.filter((category) => category.own === (view === 'own'));
  const counts: Record<View, number> = {
    all: categories.length,
    own: own.length,
    platform: categories.length - own.length,
  };

  const columns: Column<ShopCategory>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (category) => (
        <span className="text-body-large font-semibold">{category.name}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-36',
      cell: (category) =>
        category.own ? (
          <Badge tone="info">Yours</Badge>
        ) : (
          <Badge tone="neutral">Platform</Badge>
        ),
    },
    {
      key: 'products',
      header: 'Your products',
      width: 'w-36',
      cell: (category) => category.productCount,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (category) =>
        category.active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="warning">Archived</Badge>
        ),
    },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: 'Action',
            align: 'end' as const,
            width: 'w-28',
            cell: (category: ShopCategory) =>
              category.own ? (
                <SideSheetButton
                  sheet={editSheet(category.id)}
                  variant="tertiary"
                  aria-label={`Edit ${category.name}`}
                >
                  Edit
                </SideSheetButton>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      {canEdit ? (
        <>
          <SideSheet
            id={ADD_SHEET}
            title="Add a category"
            description="Only your shop sees and uses it."
          >
            <ShopCategoryForm
              action={createShopCategoryAction.bind(null, shopId)}
            />
          </SideSheet>
          {own.map((category) => (
            <SideSheet
              key={category.id}
              id={editSheet(category.id)}
              title={`Edit ${category.name}`}
              description={
                category.active
                  ? 'Archived categories are hidden when adding products; products keep them.'
                  : 'Restore it to use it for products again.'
              }
            >
              <ShopCategoryForm
                action={updateShopCategoryAction.bind(
                  null,
                  shopId,
                  category.id,
                )}
                name={category.name}
                active={category.active}
              />
            </SideSheet>
          ))}
        </>
      ) : null}

      <div className="flex flex-col gap-3 medium:flex-row medium:items-center medium:justify-between">
        <SegmentedLinks
          label="Category type"
          segments={VIEWS.map((value) => ({
            href: listLink(base, { view: value }, { view: 'all' }),
            label: `${VIEW_LABELS[value]} (${counts[value]})`,
            current: view === value,
          }))}
        />
        {canEdit ? (
          <SideSheetButton sheet={ADD_SHEET} icon="plus">
            Add category
          </SideSheetButton>
        ) : null}
      </div>

      <DataTable
        caption="Categories"
        columns={columns}
        rows={rows}
        rowKey={(category) => category.id}
        empty={
          <StateMessage
            icon="tag"
            title={
              view === 'own' ? 'No categories of your own yet' : 'No categories'
            }
            description={
              view === 'own'
                ? 'Add one for products the platform categories don’t cover.'
                : 'The platform team has not added categories yet.'
            }
          />
        }
      />
    </>
  );
}
