'use client';

import { useState } from 'react';
import {
  CatalogueListingForm,
  OwnProductForm,
} from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Combobox } from '@/components/ui/combobox';
import type { BrandSearchResult } from '@/lib/api/shop-catalogue';
import {
  addCatalogueProductAction,
  addOwnProductAction,
  searchBrandProductsAction,
} from './actions';

type Choice =
  | { kind: 'catalogue'; product: BrandSearchResult }
  | { kind: 'new'; name: string }
  | null;

/**
 * Add product (CAT-005): one search for every brand's products. Picking one
 * fills in its details (locked); the shop chooses pack sizes and prices.
 * Not found: add it as a new product with its own details.
 */
export function AddProductFlow({
  shopId,
  base,
  categories,
  brands,
}: {
  shopId: string;
  /** The shop's catalogue path. */
  base: string;
  categories: readonly { id: string; name: string }[];
  brands: readonly { id: string; name: string }[];
}) {
  const [choice, setChoice] = useState<Choice>(null);
  const [results, setResults] = useState<BrandSearchResult[]>([]);

  if (!choice) {
    return (
      <div className="flex flex-col gap-4">
        <Combobox
          label="Find the product"
          description="Search products from every brand. Can't find it? Add it as a new product."
          placeholder="For example: Silk Emulsion, wall putty, roller"
          search={async (text) => {
            const found = await searchBrandProductsAction(shopId, text);
            setResults(found);
            return found.map((product) => ({
              id: product.id,
              title: product.name,
              detail: [
                product.brandName,
                product.categoryName,
                product.packs.map((pack) => pack.label).join(', '),
              ].join(' · '),
              note: product.listedProductId ? 'In your products' : undefined,
            }));
          }}
          onSelect={(option) => {
            const product = results.find((item) => item.id === option.id);
            if (product) {
              setChoice({ kind: 'catalogue', product });
            }
          }}
          onCreate={(name) => setChoice({ kind: 'new', name })}
          createLabel={(text) => `Add "${text}" as a new product`}
        />
      </div>
    );
  }

  const change = (
    <Button variant="tertiary" onClick={() => setChoice(null)}>
      Change product
    </Button>
  );

  if (choice.kind === 'catalogue') {
    const { product } = choice;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Badge tone="info">From the brand catalogue</Badge>
            <h3 className="text-heading3 font-semibold text-text-primary">
              {product.name}
            </h3>
          </div>
          {change}
        </div>
        <dl className="grid gap-4 rounded-panel bg-surface-subtle p-4">
          <Detail term="Brand">{product.brandName}</Detail>
          <Detail term="Category">{product.categoryName}</Detail>
          <Detail term="Pack sizes">
            {product.packs.map((pack) => pack.label).join(', ')}
          </Detail>
        </dl>
        {product.listedProductId ? (
          <Alert tone="info" title="Already in your products">
            <span className="flex flex-col items-start gap-3">
              You already sell {product.name}. Change its prices and pack sizes
              on its page.
              <ButtonLink
                href={`${base}/products/${product.listedProductId}`}
                variant="secondary"
              >
                Edit prices
              </ButtonLink>
            </span>
          </Alert>
        ) : (
          <>
            <p className="text-body text-text-secondary">
              The name, brand, category and pack sizes come from the brand
              catalogue. Tick the pack sizes you sell and enter your prices.
            </p>
            <CatalogueListingForm
              action={addCatalogueProductAction.bind(
                null,
                shopId,
                product.id,
                product.packs.map((pack) => pack.id),
              )}
              packs={product.packs}
              cancelHref={base}
              withPhoto
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Badge tone="neutral">New product</Badge>
          <h3 className="text-heading3 font-semibold text-text-primary">
            {choice.name}
          </h3>
        </div>
        {change}
      </div>
      <OwnProductForm
        key={choice.name}
        action={addOwnProductAction.bind(null, shopId)}
        categories={categories}
        brands={brands}
        initial={{
          name: choice.name,
          categoryId: '',
          brandId: '',
          brandName: '',
          description: '',
          supportsShades: false,
        }}
        withPacks
        submitLabel="Save product"
        cancelHref={base}
      />
    </div>
  );
}

function Detail({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-semibold text-text-secondary uppercase">
        {term}
      </dt>
      <dd className="text-body font-semibold text-text-primary">{children}</dd>
    </div>
  );
}
