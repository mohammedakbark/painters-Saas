import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  CategoryCreateForm,
  CategoryRowForm,
} from '@/components/catalogue/brand-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardList } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { listCategories } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { createCategoryAction, updateCategoryAction } from '../actions';
import { ActiveBadge, BackToCatalogue } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Categories · Catalogue' };

/** Product categories shared by all brands and shops (CAT-001). */
export default function CategoriesPage() {
  return (
    <>
      <BackToCatalogue />
      <PageHeader
        title="Categories"
        description="Every catalogue and shop product belongs to one category. Archived categories are hidden from shops."
      />
      <Suspense fallback={<PageLoading label="Loading categories…" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  const { token } = await requirePlatformAdmin();
  const categories = await listCategories(token);

  return (
    <div className="flex max-w-content flex-col gap-8">
      <Card as="section" className="p-6">
        <CategoryCreateForm action={createCategoryAction} />
      </Card>
      {categories.length === 0 ? (
        <StateMessage
          title="No categories yet"
          description="Add the first category above."
        />
      ) : (
        <CardList className="px-5">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-col">
              <div className="flex items-center gap-3 pt-4">
                <span className="text-title font-semibold">
                  {category.name}
                </span>
                <ActiveBadge active={category.active} />
              </div>
              <CategoryRowForm
                action={updateCategoryAction.bind(null, category.id)}
                id={category.id}
                name={category.name}
                sortOrder={category.sortOrder}
                active={category.active}
              />
            </li>
          ))}
        </CardList>
      )}
    </div>
  );
}
