# Philosophy of Kerik

Official multilingual website for **Philosophy of Kerik / Філософія Кєріка** by Kyrylo Kovalchuk.

## Current state

Production-ready static site with four crawlable language versions:

- Ukrainian — `/`
- English — `/en/`
- Finnish — `/fi/`
- Swedish — `/sv/`

The visual direction intentionally preserves the original dark, minimal Philosophy of Kerik concept. The current repository also includes the official book-cover artwork extracted from the author's supplied book PDF. The full book PDFs are intentionally **not** included in the public site repository.

## Technology

- Semantic HTML5
- CSS
- Minimal vanilla JavaScript
- Node.js build script with no third-party runtime dependencies
- Cloudflare Pages compatible
- GitHub Actions validation

## Local check

Requires Node.js 20+.

```bash
npm run check
npm run preview
```

Open `http://localhost:4173`.

## Cloudflare Pages

Use these settings:

- Framework preset: **None**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: 20+

The first deployment can run without `SITE_URL`. This intentionally omits canonical absolute URLs and sitemap.xml until a stable public origin exists.

After Cloudflare gives the permanent `*.pages.dev` URL, or after a custom domain is connected, add an environment variable:

```text
SITE_URL=https://your-domain.example
```

Then redeploy. The build automatically generates:

- canonical URLs
- `hreflang` links for UK/EN/FI/SV
- Open Graph URL/image metadata
- Twitter image metadata
- `sitemap.xml`
- sitemap declaration in `robots.txt`

## Content editing

All current translations and public text live in:

```text
src/content.json
```

The page structure is in `src/template.html`. This prevents the four language versions from drifting apart.

## Book materials

The website currently identifies:

- full Ukrainian edition — prepared
- Ukrainian Short Edition — prepared
- English Short Edition — prepared

No full book text or downloadable book PDF is published by default.

## Repository structure

```text
.github/workflows/validate.yml
scripts/build.mjs
scripts/check.mjs
src/assets/book-cover.webp
src/content.json
src/favicon.svg
src/script.js
src/site.webmanifest
src/styles.css
src/template.html
.editorconfig
.env.example
.gitignore
.nvmrc
COPYRIGHT.md
README.md
package.json
```
