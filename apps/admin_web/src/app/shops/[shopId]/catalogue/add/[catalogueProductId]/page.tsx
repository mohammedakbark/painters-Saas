import { redirect } from 'next/navigation';

/** Replaced by the Add product page (CAT-005); old links still work. */
export default async function OldAddCatalogueProduct({
  params,
}: PageProps<'/shops/[shopId]/catalogue/add/[catalogueProductId]'>) {
  const { shopId } = await params;
  redirect(`/shops/${encodeURIComponent(shopId)}/catalogue/new`);
}
