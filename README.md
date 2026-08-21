# CAWSO

The Shopify theme for the Cocaine Anonymous World Service Office shop — the
literature, keytags, medallions and cards ordered by groups and by members.

Built on Shopify's [Skeleton Theme](https://github.com/Shopify/skeleton-theme),
though little of it is left: the section grid in `assets/critical.css` and the
layout's shape are the parts that survive.

## Getting started

You'll need the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), and if
you use VS Code, the [Shopify Liquid extension](https://shopify.dev/docs/storefronts/themes/tools/shopify-liquid-vscode)
for syntax highlighting, linting and Liquid completion.

```bash
npm install
npm run dev
```

That runs two things at once: Vite, rebuilding the Tailwind bundle on change,
and `shopify theme dev --theme-editor-sync --reconciliation-strategy keep-remote`.

Both flags matter. On its own, `shopify theme dev` *replaces* the development
theme with your local files — so anything arranged in the theme editor is
overwritten on the next sync. That costs you the home page in particular, since
`templates/index.json` is the whole of its content, along with anything set
under Theme settings, which lives in `config/settings_data.json`. Page, product
and blog content is safe either way: it lives in the Shopify admin rather than
in the theme.

`--theme-editor-sync` brings editor changes back into the local JSON files, so
they can be reviewed and committed like anything else. `--reconciliation-strategy`
decides what happens when a JSON file changed on both sides since the last sync;
without it the CLI stops to ask, which it can't usefully do while sharing a
terminal with Vite. `keep-remote` gives the editor the last word on those files,
which is the right way round for the merchant-owned ones — and git has your copy
if it ever takes the wrong one. Swap it for `keep-local` if you'd rather code
always win.

**The catch:** `keep-remote` also means a local edit to any JSON file — a
template, a section group, `config/settings_data.json` — is one `npm run dev`
away from being replaced by the store's copy. Push before you next run it.

### Other scripts

| Command | What it does |
| --- | --- |
| `npm run build` | One production build. Minified — this is what gets committed. |
| `npm run dev` | Vite in watch mode plus the CLI dev server. |
| `npm run clean` | Deletes the two build outputs in `assets/`. |

Run `shopify theme check` before pushing. The repo is set to
`theme-check:recommended` and currently passes with no offenses.

## Build outputs are committed

`assets/theme.css` and `assets/theme.js` are build artifacts, and they're
tracked in git — Shopify can only serve flat files out of `assets/`, so the
compiled bundle has to be in the theme it pushes.

`npm run dev` writes them **unminified**. `npm run build` writes them minified.
Run the build before committing, or you'll ship the development bundle.

Cache busting is handled by Shopify's `asset_url` filter, which appends its own
version string — which is why Vite is configured to emit predictable, un-hashed
filenames straight into `assets/`.

## Layout

```
.
├── assets      # Static files, plus the two compiled bundles
├── blocks      # Nestable, merchant-configurable components
├── config      # Global theme settings and their values
├── layout      # theme.liquid and password.liquid
├── locales     # Translations (en only for now)
├── sections    # Full-width page components
├── snippets    # Reusable Liquid fragments
├── src         # Tailwind entry point — not pushed to Shopify
└── templates   # JSON templates wiring sections to page types
```

`src/`, `node_modules/`, `vite.config.js` and the `package.json` pair are listed
in `.shopifyignore`, so only the compiled output in `assets/` reaches the store.

## Conventions

**Styling.** Tailwind utilities go in the markup. Anything utilities can't
express — a `::backdrop`, a `:has()` selector, styling for the bare `<a>` tags
that come out of a `richtext` setting — goes in the file's `{% stylesheet %}`
block. `assets/critical.css` holds only what every page needs: the reset, the
cascade layer order, the sticky footer, and the `.shopify-section` grid that
gives sections both a centred column and a `full-width` escape hatch.

Tailwind's preflight is deliberately left out, because `critical.css` already
ships a reset and two competing resets is one too many.

**Colours.** Merchant colour settings become CSS custom properties on the
section's root element, and the CSS reads them from there. That way one section
can theme everything inside it, snippets and blocks included, without any of
them knowing which section they're in.

**Fonts.** The primary face comes from a `font_picker` and loads weights 300 to
700 with their italics. Newsreader is the theme's serif and isn't in Shopify's
font library, so it's self-hosted out of `assets/` — it backs both `font-serif`
and `font-price`. Every `| money` figure in the theme carries `font-price`, and
it stays Newsreader whatever the merchant picks for the primary font.

**Text.** Everything a shopper reads goes through `{{ 'key' | t }}` and lives in
`locales/en.default.json`. Editor-facing labels live in
`locales/en.default.schema.json` and are referenced as `t:labels.foo`. Sentence
case throughout.

**Documentation.** Snippets and statically rendered blocks open with a
`{% doc %}` header describing their parameters.

## App blocks

Apps can be placed on the product, cart, collection and page templates, in the
custom section, and inside the group block. Everywhere else the layout is fixed
on purpose.

The cart's app blocks sit outside the region its script re-renders, so a widget
mounted there isn't torn down every time a quantity changes.

## Cookie consent

`sections/cookie-banner.liquid` runs on Shopify's Customer Privacy API. It shows
itself only where consent is required *and* the store's settings ask for it —
those live under **Settings → Customer privacy** in the admin, and Shopify's own
cookie banner has to be turned off there, or the store shows two.

## License

See [LICENSE.md](./LICENSE.md).
