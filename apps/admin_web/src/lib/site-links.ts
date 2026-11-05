// Footer destinations on the public site (WEB-001). All are empty until the
// product name is confirmed and the pages and accounts exist; an empty one
// shows as a disabled "coming soon" link. Fill in a URL to switch it on.

export interface SiteLink {
  label: string;
  href: string | null;
}

export const COMPANY_LINKS: readonly SiteLink[] = [
  { label: 'About us', href: null },
  { label: 'Contact us', href: null },
];

export const LEGAL_LINKS: readonly SiteLink[] = [
  { label: 'Privacy policy', href: null },
  { label: 'Terms of use', href: null },
];

export const SOCIAL_LINKS: readonly (SiteLink & {
  icon: 'whatsapp' | 'instagram' | 'linkedin';
})[] = [
  { label: 'WhatsApp', icon: 'whatsapp', href: null },
  { label: 'Instagram', icon: 'instagram', href: null },
  { label: 'LinkedIn', icon: 'linkedin', href: null },
];

/** zero.byt's own site or profile, used by "Powered by zero.byt". */
export const COMPANY_URL: string | null = null;
