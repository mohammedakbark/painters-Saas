import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  CategoryCreateForm,
  CategoryRowForm,
} from '@/components/catalogue/brand-forms';
import { type Column, DataTable } from '@/components/ui/data-table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { listCategories } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { createCategoryAction, updateCategoryAction } from '../actions';
import { ActiveBadge } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Categories · Catalogue' };

const ADD_SHEET = 'add-category';
const editSheet = (id: string) => `edit-category-${id}`;

type Category = Awaited<ReturnType<typeof listCategories>>[number];

/**
 * Product categories shared by all brands and shops (CAT-001). A table;
 * adding and editing open side sheets (WEB-007).
 */
export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        back={{ href: '/platform/catalogue', label: 'Catalogue' }}
        title="Categories"
        description="Every catalogue and shop product belongs to one category. Archived categories are hidden from shops."
        actions={
          <SideSheetButton sheet={ADD_SHEET} icon="plus">
            Add category
          </SideSheetButton>
        }
      />
      <SideSheet
        id={ADD_SHEET}
        title="Add a category"
        description="Shared by every brand and shop."
      >
        <CategoryCreateForm action={createCategoryAction} />
      </SideSheet>
      <Suspense fallback={<TableSkeleton label="Loading categories…" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  const { token } = await requirePlatformAdmin();
  const categories = await listCategories(token);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (category) => (
        <span className="text-body-large font-semibold">{category.name}</span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      align: 'end',
      width: 'w-28',
      cell: (category) => (
        <span className="tabular-nums">{category.sortOrder}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (category) => <ActiveBadge active={category.active} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-28',
      cell: (category) => (
        <SideSheetButton
          sheet={editSheet(category.id)}
          variant="tertiary"
          aria-label={`Edit ${category.name}`}
        >
          Edit
        </SideSheetButton>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <SideSheet
          key={category.id}
          id={editSheet(category.id)}
          title={`Edit ${category.name}`}
          description="Rename, reorder, archive or restore."
        >
          <CategoryRowForm
            action={updateCategoryAction.bind(null, category.id)}
            id={category.id}
            name={category.name}
            sortOrder={category.sortOrder}
            active={category.active}
          />
        </SideSheet>
      ))}
      <DataTable
        caption="Categories"
        columns={columns}
        rows={categories}
        rowKey={(category) => category.id}
        empty={
          <StateMessage
            icon="tag"
            title="No categories yet"
            description="Add the first category."
          />
        }
      />
    </div>
  );
}
