# Philosophy of Kerik

Official multilingual website for **Philosophy of Kerik / Філософія Кєріка** by Kyrylo Kovalchuk.

Production: `https://philosophyofkerik.com`

## Current state

Production-ready static site with four crawlable language versions:

- Ukrainian — `/`
- English — `/en/`
- Finnish — `/fi/`
- Swedish — `/sv/`

The visual direction preserves the dark, minimal Philosophy of Kerik identity. The site is built as an author platform and structured body of work rather than a temporary project page.

## Published architecture

The build generates, in all four languages:

- home page
- article archive with **10 essays**, topic tags and filtering
- **4 core concept pages**
- **7 core principles**
- complete **13-chapter book structure**
- references and further reading
- expanded author page
- official contact page linking LinkedIn and GitHub
- local site search
- privacy policy
- terms of use / copyright guidance
- Atom/RSS subscription feed

The online Ukrainian and English Short Editions include:

- table of contents
- chapter anchors
- reading progress indicator
- previous / next chapter navigation

Articles and concepts include related-reading links.

## Technology

- Semantic HTML5
- CSS
- Minimal vanilla JavaScript
- Node.js static build with no application runtime dependencies
- Cloudflare Workers Static Assets
- GitHub-integrated Cloudflare Workers Builds
- GitHub Actions validation

## Local validation

Requires Node.js 20+.

```bash
npm run check
```

This builds the complete site and validates language synchronization, article/concept counts, book readers, search indexes, feeds, legal pages and SEO output.

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

Workers Builds settings:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Static asset directory: `dist`

The build uses `https://philosophyofkerik.com` as the canonical production origin unless `SITE_URL` overrides it.

Every production build generates:

- canonical URLs
- `hreflang` links for UK / EN / FI / SV with English as `x-default`
- Open Graph and Twitter image metadata
- Schema.org data for WebSite, Book, Person, Article, DefinedTerm and relevant page types
- `sitemap.xml`
- `robots.txt`
- security headers
- localized Atom feeds and search indexes

## Content sources

Primary public copy and home-page labels:

```text
src/content.json
```

Extended multilingual pages, concepts, principles, chapter summaries, author/contact/legal content and references:

```text
src/extended-content.json
```

Article catalogue and localized topic metadata:

```text
src/articles/index.json
```

The original three essays remain in:

```text
src/articles/<slug>/<lang>.json
```

The seven newer essays are synchronized in:

```text
src/new-articles.json
```

## Templates and build

```text
src/template.html
src/page-template.html
src/article-template.html
src/book-reader-template.html
src/styles.css
src/assets/books.css
src/script.js
scripts/build.mjs
scripts/check.mjs
```

## Book materials

The website identifies:

- full Ukrainian edition — prepared, not published on the site
- Ukrainian Short Edition — available for online reading
- English Short Edition — available for online reading

Reader source text is stored as compressed build data and verified by SHA-256 before rendering. The known English sentence error is corrected only after integrity verification during the build, preserving the source checksum.

## Privacy

The site intentionally avoids user accounts, advertising pixels, third-party analytics and non-essential cookies. Search runs locally in the browser. Subscription is provided through a standards-based Atom/RSS feed, so the site does not need to collect email addresses.

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
philosophyofkerik.com
```
