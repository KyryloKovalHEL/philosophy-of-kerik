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

The home page uses an editorial author portrait at the chessboard in the hero and a research/library photograph in the book section. The dedicated author page uses a separate formal portrait. These photographs are generated as optimized WebP assets during the build, with localized alternative text and responsive layouts.

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

This prepares the editorial WebP photographs, builds the complete site, applies the responsive photo integration, and validates language synchronization, article/concept counts, book readers, search indexes, feeds, legal pages and SEO output.

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

Editorial photo source data:

```text
src/assets/photo-data/
```

The build reconstructs these into:

```text
src/assets/kerik-chess.webp
src/assets/kerik-library.webp
src/assets/kerik-author.webp
```

The generated public site does not expose the intermediate photo-data directory.
