import { BrandSettingsForm } from '@/components/catalogue/brand-forms';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { Brand } from '@/lib/api/platform-catalogue';
import { countLabel } from '@/lib/format';
import { updateBrandAction } from '../../actions';
import { ActiveBadge, BrandTabs } from '../../catalogue-parts';

/** Name, status, settings and section tabs of one brand. */
export function BrandHeader({ brand }: { brand: Brand }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={{ href: '/platform/catalogue', label: 'Catalogue' }}
        title={brand.name}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <ActiveBadge active={brand.active} />
            <span>
              {countLabel(brand.productCount, 'active product')} ·{' '}
              {countLabel(brand.shadeCount, 'active shade')}
            </span>
          </span>
        }
      />
      <Card as="details" className="px-5 py-4">
        <summary className="cursor-pointer text-body font-semibold">
          Brand settings
        </summary>
        <div className="pt-4">
          <BrandSettingsForm
            action={updateBrandAction.bind(null, brand.id)}
            name={brand.name}
            active={brand.active}
          />
        </div>
      </Card>
      <BrandTabs brandId={brand.id} />
    </div>
  );
}
