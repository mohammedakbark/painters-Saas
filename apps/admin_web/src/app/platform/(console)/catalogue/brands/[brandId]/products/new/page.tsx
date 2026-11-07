import { redirect } from 'next/navigation';

/** Add product opens as a side sheet on the brand page (WEB-007). */
export default async function NewProductPage({
  params,
}: PageProps<'/platform/catalogue/brands/[brandId]/products/new'>) {
  const { brandId } = await params;
  redirect(
    `/platform/catalogue/brands/${encodeURIComponent(brandId)}?add=product`,
  );
}
