// The store every script in this repo talks to, unless SHOPIFY_FLAG_STORE says
// otherwise (the same env var the Shopify CLI itself reads).
export const STORE = process.env.SHOPIFY_FLAG_STORE || '1f00j2-mr.myshopify.com';

// The merchant-owned JSON: what the theme editor writes and the repo mirrors.
// Used both as Shopify CLI `--only` patterns and as git pathspecs.
export const THEME_DATA = [
  'config/settings_data.json',
  'templates/*.json',
  'templates/customers/*.json',
  'sections/*.json',
];
