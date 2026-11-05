// Store pages of the two mobile apps. Both are unpublished (the app IDs are
// still placeholders, question 41), so the home page shows "Coming soon".
// Fill in a URL when an app is published; the buttons become links.

export interface AppStoreLinks {
  appStore: string | null;
  googlePlay: string | null;
}

export const APP_STORE_LINKS: {
  customerApp: AppStoreLinks;
  shopApp: AppStoreLinks;
} = {
  customerApp: { appStore: null, googlePlay: null },
  shopApp: { appStore: null, googlePlay: null },
};
