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
and `shopify theme dev`, which serves a development theme built from your local
files.

The sync only goes one way. `shopify theme dev` pushes local files up and never
writes back, which is the right direction for a theme whose JSON lives in git —
but it also means anything arranged in the theme editor is overwritten on the
next sync. That costs you the home page in particular, since
`templates/index.json` is the whole of its content, along with anything set
under Theme settings, which lives in `config/settings_data.json`. Page, product
and blog content is safe either way: it lives in the Shopify admin rather than
in the theme.

**So editor work has to be pulled down deliberately** — nothing comes back on
its own. Once you've arranged something in the theme editor that's worth
keeping:

```bash
shopify theme pull --theme <id> --only templates/*.json --only config/settings_data.json
```

Then review the diff and commit it like any other change.

### Pulling live shop data

To develop against what the storefront actually renders — the live home page,
theme settings, section groups — pull the live theme's JSON down first:

```bash
npm run pull:live
```

That fetches `config/settings_data.json`, `templates/*.json` and `sections/*.json`
from the **live** theme into the working tree, then prints what changed. Review
with `git diff` and commit what's worth keeping; `git checkout --` the rest.

It refuses to run if those files already have uncommitted changes, so a pull can
never eat unpushed work — pass `--force` if you do want them discarded. Set
`SHOPIFY_FLAG_STORE` to point it at a different store.

Product, collection, page and blog content isn't theme data at all; it comes
from the admin and `shopify theme dev` already renders it live.

### You can't overwrite the live theme from here

`npm run pull:live` only ever runs `theme pull` — it reads. Nothing in this repo
writes to the live storefront:

- `npm run dev` serves a *development* theme built from your local files. It
  never touches the published one.
- `npm run theme -- <args>` wraps the Shopify CLI and refuses anything that
  would write to the published theme. Read-only commands (`pull`, `list`,
  `dev`, `share`, `check`) pass straight through; these don't:

| Refused | Why |
| --- | --- |
| `push --live`, `push --allow-live` | Overwrites the storefront in place. |
| `push --publish` | Publishes whatever it just pushed. |
| `push` with no `--theme` / `--unpublished` / `--development` | The CLI picks a target for you. |
| `push --theme <live>`, `delete --theme <live>` | Checked against `theme list` — by id *and* by name. |
| `publish` | Publishing is a deliberate, admin-side act. |

Short flags (`-l`, `-a`, `-p`, `-u`, `-t`) and the CLI's own environment
variables (`SHOPIFY_FLAG_LIVE`, `SHOPIFY_FLAG_ALLOW_LIVE`, …) are read the same
way, so there's no spelling that slips past. If the live-theme check can't reach
the store, the command is refused rather than allowed.

It's a guard rail, not a lock: `shopify theme …` run directly still does
whatever you tell it. That's the deliberate escape hatch for publishing a
release — see [Deploying](#deploying).

### Other scripts

| Command | What it does |
| --- | --- |
| `npm run build` | One production build. Minified — this is what gets committed. |
| `npm run dev` | Vite in watch mode plus the CLI dev server. |
| `npm run clean` | Deletes the two build outputs in `assets/`. |
| `npm run pull:live` | Pulls the live theme's JSON into the working tree. Read-only against the store. |
| `npm run theme -- <args>` | The Shopify CLI, minus anything that writes to the live theme. |

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

## Deploying

Releases are manual, through the Shopify CLI. Each one goes up as a *new
unpublished theme* and is published only once it's been looked at — which is
also what makes the rollback in the next section a single command.

**1. Pre-flight.** On `main`, working tree clean and pushed.

```bash
npm run build          # minified — `npm run dev` leaves the development bundle behind
shopify theme check    # `theme-check:recommended`; should report no offenses
```

Commit `assets/theme.css` / `assets/theme.js` if the build changed them.
Shipping the unminified dev bundle is the easiest mistake to make here.

**2. Note the theme you're replacing.**

```bash
shopify theme list --store 1f00j2-mr.myshopify.com
```

The CLI opens a browser to authenticate the first time, then remembers the store
in the gitignored `.shopify/`. Write down the id of the theme marked `[live]` —
that's the rollback target, and it belongs in the release notes rather than in
your memory.

**3. Optionally keep a copy of it on disk.**

```bash
shopify theme pull --theme <live-id> --path ../cawso-outgoing-theme
```

Only worth doing if someone might delete that theme from the store's library.
Otherwise step 2 is enough, because the theme itself stays put.

**4. Upload, unpublished.**

```bash
npm run theme -- push --unpublished --theme "CAWSO $(date +%F)"
```

This creates a new unpublished theme and prints its id and preview URL. Don't
run a bare `shopify theme push` against this store — the target it picks isn't
worth guessing at. Each run of the command above creates *another* theme; to
update the one you just made, push to `--theme <id>` instead.

**5. Configure it, then pull the settings back.** The new theme starts from this
repo's `config/settings_data.json` defaults, not from whatever is set up on the
currently-live theme — the logo, colours, fonts and home page layout do not
carry across. Set them in the theme editor on the *unpublished* theme, then
bring them back into the repo:

```bash
shopify theme pull --theme <id> --only templates/*.json --only config/settings_data.json
```

Commit that before publishing, so the repo stays the source of truth.

**6. Preview it.**

```bash
shopify theme share --theme <id>
```

That link works for people without admin access. Walk the home page, a product,
a collection, add-to-cart and its toast, the cart, search, a 404, the cookie
banner, and check that prices render in Newsreader. Check a phone width too.

**7. Publish.**

```bash
shopify theme publish --theme <id>
```

Or Admin → Online Store → Themes → Actions → Publish. The theme that was live is
*not* deleted — it drops back into the library as unpublished.

## Rolling back

The theme you replaced is still in the library, so going back is one command and
takes effect in seconds:

```bash
shopify theme list                       # find the old theme's id
shopify theme publish --theme <old-id>   # storefront is back
```

**Nothing is lost in either direction.** Publishing only swaps which theme
renders the storefront. Orders, products, pages, blog posts, navigation and
customer data live in the admin and aren't touched by any of this.

**Don't delete the old theme** — it *is* the rollback. Keep the last two or
three releases in the library and prune anything older.

**If it was deleted anyway,** restore the copy from step 3 and publish that:

```bash
shopify theme push --unpublished --path ../cawso-outgoing-theme
```

**Rolling back a later update** works the same way. Because every release is
pushed as a new unpublished theme rather than over the live one, the last good
release is always still sitting there to re-publish. Fixing the code afterwards
is an ordinary `git revert`, rebuild, and a fresh release.

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
