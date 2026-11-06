import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import { PageHeader } from '@/components/ui/page-header';
import { getShopProfile, type ShopProfile } from '@/lib/api/shop-profile';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { DEFAULT_STATE_CODE } from '@/lib/shops/indian-states';
import type { ProfileFormValues } from '@/lib/shops/profile';
import { formatIndianMobile } from '@/lib/phone';
import { saveShopProfileAction } from './actions';
import { uploadShopPhotoAction } from './photo-actions';
import { ImageUploadForm } from '@/components/media/image-upload-form';
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
  // Locked while the shop waits for review (D-033); the API enforces it too.
  const inReview = shop.status === 'PENDING_REVIEW';
  const canEdit = shop.myRole === 'MASTER' && !inReview;

  return (
    <>
      {inReview ? (
        <Alert tone="info" title="Locked while in review">
          Your shop is waiting for review, so the profile, photo and location
          can&apos;t be changed. To make changes, withdraw the submission on the
          Overview page.
        </Alert>
      ) : null}
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
        eyebrow="Profile"
        title="Shop profile"
        description="Photo, support mobile, address and map location. Customers see these once your shop is live."
      />
      {canEdit ? (
        <RequiredFieldsNote>
          are needed before you can submit your shop for review. You can save
          the profile at any time.
        </RequiredFieldsNote>
      ) : null}
      <div className="grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_22rem]">
        <Card
          as="section"
          className="p-6 medium:p-8 desktop:sticky desktop:top-10 desktop:order-last"
        >
          <ImageUploadForm
            title="Shop photo"
            description="A clear photo of the shop front. JPEG, PNG or WebP, up to 5 MB. Photo details such as the camera and location are removed."
            noun="photo"
            fieldName="photo"
            // Remount after an upload so the preview is cleared.
            key={profile.photo?.updatedAt ?? 'none'}
            action={uploadShopPhotoAction.bind(null, shop.id)}
            currentUrl={profile.photo?.url ?? null}
            canEdit={canEdit}
            required
          />
        </Card>
        <ShopProfileForm
          // Remount after a save so the form shows the stored values.
          key={profile.updatedAt ?? 'new'}
          action={saveShopProfileAction.bind(null, shop.id)}
          initialValues={toFormValues(profile)}
          canEdit={canEdit}
          viewOnlyNote={inReview ? null : undefined}
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
