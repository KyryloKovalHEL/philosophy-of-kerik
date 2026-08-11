# Philosophy of Kerik

Official multilingual website for **Philosophy of Kerik / Філософія Кєріка** by Kyrylo Kovalchuk.

## Current state

Production-ready static site with four crawlable language versions:

- Ukrainian — `/`
- English — `/en/`
- Finnish — `/fi/`
- Swedish — `/sv/`

The visual direction intentionally preserves the original dark, minimal Philosophy of Kerik concept. The repository includes the official book-cover artwork extracted from the author's supplied book PDF. The full book PDFs are intentionally **not** included in the public repository.

## Technology

- Semantic HTML5
- CSS
- Minimal vanilla JavaScript
- Node.js build script with no application runtime dependencies
- Cloudflare Workers Static Assets
- GitHub-integrated Cloudflare Workers Builds
- GitHub Actions validation

## Local validation

Requires Node.js 20+.

```bash
npm run check
```

For a simple local server:

```bash
npm run preview
```

Open `http://localhost:4173`.

For Cloudflare's local runtime:

```bash
npm run preview:cloudflare
```

## Cloudflare Workers deployment

The project is configured for **Cloudflare Workers Static Assets** with `wrangler.jsonc`.

Recommended Workers Builds settings:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Static asset directory: `dist` (declared in `wrangler.jsonc`)

`wrangler.jsonc` also enables:

- `workers.dev` deployment
- custom `404.html` handling
- automatic trailing-slash behavior for localized directory pages
- native `_headers` and `_redirects` processing

The first deployment can run without `SITE_URL`. This intentionally omits absolute canonical URLs, absolute Open Graph image URLs, and `sitemap.xml` until a stable public origin exists.

After Cloudflare gives the production `*.workers.dev` URL, or after the custom domain is connected, add this **build-time** environment variable in Cloudflare Workers → Settings → Build:

```text
SITE_URL=https://your-final-origin.example
```

Then trigger a new build. The build automatically generates:

- canonical URLs
- `hreflang` links for UK/EN/FI/SV
- Open Graph URL/image metadata
- Twitter image metadata
- `sitemap.xml`
- sitemap declaration in `robots.txt`

When the final custom domain is connected, set `SITE_URL` to the final canonical domain and redeploy once more.

## Content editing

All current translations and public text live in:

```text
src/content.json
```

The page structure is in `src/template.html`. This keeps all four language versions structurally synchronized.

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
src/assets/social-card.webp
src/content.json
src/favicon.svg
src/script.js
src/site.webmanifest
src/styles.css
src/template.html
.assetsignore
.editorconfig
.env.example
.gitignore
.nvmrc
COPYRIGHT.md
README.md
package.json
wrangler.jsonc
```

## Deployment architecture

```text
GitHub main branch
      ↓
Cloudflare Workers Builds
      ↓
npm run build
      ↓
dist/
      ↓
Wrangler deploy
      ↓
Cloudflare Workers Static Assets
      ↓
*.workers.dev
      ↓
Custom domain
```
