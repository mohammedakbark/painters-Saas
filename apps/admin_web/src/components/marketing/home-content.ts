// Copy for the public home page (WEB-001). Every statement comes from the
// product documents; planned features are marked "Coming soon". Vision and
// mission are drafts for the product owner to review
// (docs/features/WEB-001-public-home-page.md).

import type { BadgeTone } from '@/components/ui/badge';
import type { IconName } from '@/components/ui/icon';

export const NAV_LINKS = [
  { href: '#products', label: 'What we provide' },
  { href: '#painters', label: 'For painters' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faq', label: 'Questions' },
] as const;

export const PROBLEMS = [
  {
    icon: 'message',
    today: 'Enquiries by phone calls and WhatsApp messages',
    instead:
      'One online catalogue with your prices, pack sizes, shades and what is in stock.',
  },
  {
    icon: 'notebook',
    today: 'Painter purchases and pending payments in notebooks',
    instead:
      'Orders, bills and payments recorded per shop, and per work site for painters.',
  },
  {
    icon: 'tag',
    today: 'Offers and painter incentives explained one by one',
    instead:
      'Offers set once by the shop and shown to the right customers in the app.',
  },
] as const;

export const VISION =
  'Every independent paint shop can serve its painters and customers digitally, without building an app of its own.';

export const MISSION =
  "Give paint shops, painters and customers one dependable system for catalogues, orders, site spending, bills and credit, while every shop's business stays its own.";

export interface ProductOffer {
  id: string;
  name: string;
  icon: IconName;
  audience: string;
  status: { label: string; tone: BadgeTone };
  points: readonly string[];
}

export const PRODUCTS: readonly ProductOffer[] = [
  {
    id: 'customer-app',
    name: 'Customer App',
    icon: 'smartphone',
    audience: 'For painters, contractors and home owners',
    status: { label: 'Coming soon', tone: 'neutral' },
    points: [
      'Find paint shops near you and keep your regular ones in My Shops.',
      'Browse brands, pack sizes, prices and shades.',
      'Order from one shop at a time and see your bills shop by shop.',
      'Painters: manage work sites and see what each site has cost.',
    ],
  },
  {
    id: 'shop-app',
    name: 'Shop App',
    icon: 'store',
    audience: 'For shop owners, on the counter or on the move',
    status: { label: 'Coming soon to stores', tone: 'info' },
    points: [
      'Sign in with your mobile number.',
      'Change prices, MRP and pack sizes in seconds.',
      'Mark items available or out of stock.',
      'Add products from brand catalogues and take product photos.',
    ],
  },
  {
    id: 'shop-portal',
    name: 'Shop Admin Portal',
    icon: 'monitor',
    audience: 'For running your shop from a computer',
    status: { label: 'Available now', tone: 'success' },
    points: [
      'Register your shop and pin it on the map.',
      'Build your catalogue from brand catalogues or add your own products.',
      'Mark favourite shades and add your own shade codes.',
      'Send your shop for review and go live.',
    ],
  },
];

export const PAINTER_POINTS = [
  {
    icon: 'mapPin',
    title: 'All your work sites',
    text: 'Keep each painting job as its own site and link your orders to it.',
  },
  {
    icon: 'chart',
    title: 'Spending per site',
    text: 'See what a site has cost in total, even when you buy from several shops.',
  },
  {
    icon: 'receipt',
    title: 'Separate bills from each shop',
    text: "Every shop's orders, bills and payments stay separate and clear.",
  },
  {
    icon: 'wallet',
    title: 'Credit from your shops',
    text: 'Each shop decides its own credit for you. Nothing is decided automatically.',
  },
] as const;

export const SHOP_STEPS = [
  {
    title: 'Register',
    text: 'Sign in with your mobile number and register your shop.',
  },
  {
    title: 'Set up your shop',
    text: 'Add your address and map location, support number, a shop photo and at least 10 products.',
  },
  {
    title: 'Send for review',
    text: 'The platform team checks your shop and approves it or tells you what to change.',
  },
  {
    title: 'Go live',
    text: 'Your shop is live and ready for customers and painters.',
  },
] as const;

export const PRIVACY_POINTS = [
  {
    icon: 'lock',
    text: 'Your customers, prices, orders, credit and bills are visible only to your shop.',
  },
  {
    icon: 'eyeOff',
    text: 'Other shops on the platform never see your business data.',
  },
  {
    icon: 'shield',
    text: 'Painter-only offers are shown only to the painters your shop confirms.',
  },
] as const;

export const FAQS = [
  {
    question: 'Does my shop need its own app?',
    answer:
      'No. Every shop uses the same Shop App and appears in the same Customer App. Customers choose which shop they are shopping from.',
  },
  {
    question: 'Do customers have to add my shop before they can browse it?',
    answer:
      'No. Any live shop can be opened and browsed. Adding a shop to My Shops is instant and needs no approval.',
  },
  {
    question: 'Can other shops see my prices or my customers?',
    answer:
      "No. Each shop's customers, prices, orders, credit and bills are private to that shop.",
  },
  {
    question: 'Who decides credit for a painter?',
    answer:
      'Each shop decides for itself. Information from other shops may help, but credit is never approved or refused automatically.',
  },
  {
    question: 'When will the mobile apps be available?',
    answer:
      'They are being prepared for the App Store and Google Play. The download buttons on this page will work as soon as they are published.',
  },
] as const;
