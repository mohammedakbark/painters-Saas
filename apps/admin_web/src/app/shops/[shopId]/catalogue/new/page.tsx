import { redirect } from 'next/navigation';

/** Add product opens as a side sheet on the Products page (WEB-007). */
export default async function AddProductPage({
  params,
}: PageProps<'/shops/[shopId]/catalogue/new'>) {
  const { shopId } = await params;
  redirect(`/shops/${encodeURIComponent(shopId)}/catalogue?add=product`);
}
