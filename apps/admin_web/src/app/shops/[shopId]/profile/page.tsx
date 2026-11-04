import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { getShopProfile, type ShopProfile } from '@/lib/api/shop-profile';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { serverEnv } from '@/lib/env';
import { DEFAULT_STATE_CODE } from '@/lib/shops/indian-states';
import type { ProfileFormValues } from '@/lib/shops/profile';
import { formatIndianMobile } from '@/lib/phone';
import { saveShopProfileAction } from './actions';
import type { MapsConfig } from './location-picker';
import { uploadShopPhotoAction } from './photo-actions';
import { ShopPhotoForm } from './photo-form';
import { ShopProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Shop profile' };

/** Request data is read inside Suspense so navigating here is instant. */
export default function ShopProfilePage(
  props: PageProps<'/shops/[shopId]/profile'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the profile…" />}>
      <ShopProfileContent {...props} />
    </Suspense>
  );
}

async function ShopProfileContent({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/profile'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const profile = await getShopProfile(token, shopId);
  const query = await searchParams;
  const saved = query.saved === '1';
  const photoSaved = query.photo === '1';
  const canEdit = shop.myRole === 'MASTER';

  return (
    <>
      {saved ? (
        <Alert tone="success" title="Profile saved">
          Your shop profile is up to date.
        </Alert>
      ) : null}
      {photoSaved ? (
        <Alert tone="success" title="Photo saved">
          Your shop photo is updated.
        </Alert>
      ) : null}
      <PageHeader
        title="Shop profile"
        description="Photo, support mobile, address and map location. Customers see these once your shop is live."
      />
      <div className="flex max-w-content flex-col gap-10">
        <ShopPhotoForm
          // Remount after an upload so the preview is cleared.
          key={profile.photo?.updatedAt ?? 'none'}
          action={uploadShopPhotoAction.bind(null, shop.id)}
          currentUrl={profile.photo?.url ?? null}
          canEdit={canEdit}
        />
        <ShopProfileForm
          // Remount after a save so the form shows the stored values.
          key={profile.updatedAt ?? 'new'}
          action={saveShopProfileAction.bind(null, shop.id)}
          initialValues={toFormValues(profile)}
          maps={mapsConfig()}
          canEdit={canEdit}
          cancelHref={`/shops/${shop.id}`}
        />
      </div>
    </>
  );
}

function toFormValues(profile: ShopProfile): ProfileFormValues {
  const { address, location } = profile;
  return {
    supportPhone: profile.supportPhone
      ? formatIndianMobile(profile.supportPhone)
      : '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    landmark: address?.landmark ?? '',
    city: address?.city ?? '',
    district: address?.district ?? '',
    stateCode: address?.stateCode ?? DEFAULT_STATE_CODE,
    postalCode: address?.postalCode ?? '',
    latitude: location ? String(location.latitude) : '',
    longitude: location ? String(location.longitude) : '',
    locationSource: location?.source ?? '',
  };
}

/** The public browser key, or null when maps are not configured (no-map fallback). */
function mapsConfig(): MapsConfig | null {
  const { GOOGLE_MAPS_BROWSER_KEY, GOOGLE_MAPS_MAP_ID } = serverEnv();
  return GOOGLE_MAPS_BROWSER_KEY
    ? { apiKey: GOOGLE_MAPS_BROWSER_KEY, mapId: GOOGLE_MAPS_MAP_ID ?? null }
    : null;
}
