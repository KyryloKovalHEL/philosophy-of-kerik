import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const content = JSON.parse(fs.readFileSync(path.join(src, 'content.json'), 'utf8'));
const template = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
const langs = ['uk','en','fi','sv'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ['styles.css','script.js','favicon.svg','site.webmanifest']) {
  fs.copyFileSync(path.join(src,file), path.join(dist,file));
}
fs.cpSync(path.join(src,'assets'), path.join(dist,'assets'), { recursive: true });

const escapeHtml = (value) => String(value)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#39;');

const languagePath = lang => lang === 'uk' ? '/' : `/${lang}/`;
const pageUrl = lang => siteUrl ? `${siteUrl}${languagePath(lang)}` : '';
const assetPrefix = lang => lang === 'uk' ? '' : '../';

function replaceAllTokens(html, tokens){
  for (const [key,value] of Object.entries(tokens)) html = html.replaceAll(`{{${key}}}`, value);
  return html;
}

for (const lang of langs) {
  const t = content[lang];
  const prefix = assetPrefix(lang);
  const hreflang = siteUrl ? [
    ...langs.map(code => `<link rel="alternate" hreflang="${code}" href="${pageUrl(code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl('uk')}">`,
    `<link rel="canonical" href="${pageUrl(lang)}">`
  ].join('\n  ') : '';
  const urlMeta = siteUrl ? [
    `<meta property="og:url" content="${pageUrl(lang)}">`,
    `<meta property="og:image" content="${siteUrl}/assets/social-card.webp">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:image" content="${siteUrl}/assets/social-card.webp">`
  ].join('\n  ') : '';
  const langLinks = langs.map(code => {
    const href = languagePath(code);
    const current = code === lang ? ' aria-current="page"' : '';
    return `<a href="${href}" hreflang="${code}" lang="${code}"${current}>${content[code].label}</a>`;
  }).join('');
  const editions = t.editions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const articleCards = t.articles.map(([kicker,title]) => `<article><p>${escapeHtml(kicker)}</p><h3>${escapeHtml(title)}</h3><span class="coming">${escapeHtml(t.archiveStatus)}</span></article>`).join('');
  const conceptRows = t.concepts.map((item,i) => `<div><b>${String(i+1).padStart(2,'0')}</b><span>${escapeHtml(item)}</span></div>`).join('');
  const structured = {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebSite',
        name:'Philosophy of Kerik',
        inLanguage:lang,
        ...(siteUrl ? { url: pageUrl(lang) } : {})
      },
      {
        '@type':'Book',
        name: lang === 'uk' ? 'Філософія Кєріка. Система контролю реальності' : 'Philosophy of Kerik: A System of Reality Control',
        author:{'@type':'Person',name:'Kyrylo Kovalchuk'},
        copyrightYear:2026,
        inLanguage:['uk','en'],
        ...(siteUrl ? { image:`${siteUrl}/assets/book-cover.webp` } : {})
      },
      {
        '@type':'Person',
        name:'Kyrylo Kovalchuk'
      }
    ]
  };
  const tokens = {
    LANG: lang,
    LOCALE: t.locale,
    TITLE: escapeHtml(t.title),
    DESCRIPTION: escapeHtml(t.description),
    URL_META: urlMeta,
    HREFLANG: hreflang,
    ASSET_PREFIX: prefix,
    HOME_URL: languagePath(lang),
    SKIP: escapeHtml(t.skip),
    MENU: escapeHtml(t.menu),
    LANGUAGE: escapeHtml(t.language),
    LANG_LINKS: langLinks,
    NAV_BOOK: escapeHtml(t.nav[0]), NAV_ARTICLES: escapeHtml(t.nav[1]), NAV_CONCEPTS: escapeHtml(t.nav[2]), NAV_AUTHOR: escapeHtml(t.nav[3]),
    HERO_TITLE: escapeHtml(t.heroTitle), HERO_LEAD: escapeHtml(t.heroLead), HERO_BOOK: escapeHtml(t.heroBook), HERO_ARTICLES: escapeHtml(t.heroArticles),
    BOOK_HEADING: escapeHtml(t.bookHeading), BOOK_KICKER: escapeHtml(t.bookKicker), BOOK_TITLE: escapeHtml(t.bookTitle), BOOK_TEXT: escapeHtml(t.bookText), EDITIONS: editions, BOOK_NOTE: escapeHtml(t.bookNote),
    ARTICLES_HEADING: escapeHtml(t.articlesHeading), ARTICLES_INTRO: escapeHtml(t.articlesIntro), ARTICLE_CARDS: articleCards,
    CONCEPTS_HEADING: escapeHtml(t.conceptsHeading), CONCEPTS_INTRO: escapeHtml(t.conceptsIntro), CONCEPT_ROWS: conceptRows,
    AUTHOR_HEADING: escapeHtml(t.authorHeading), AUTHOR_KICKER: escapeHtml(t.authorKicker), AUTHOR_NAME: escapeHtml(t.authorName), AUTHOR_TEXT: escapeHtml(t.authorText),
    FOOTER_RIGHTS: escapeHtml(t.footerRights),
    STRUCTURED_DATA: JSON.stringify(structured).replaceAll('<','\\u003c')
  };
  let html = replaceAllTokens(template, tokens);
  const outputDir = lang === 'uk' ? dist : path.join(dist, lang);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir,'index.html'), html);
}

const notFound = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#090909"><title>404 — KERIK</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;background:#090909;color:#eee;font-family:system-ui;display:grid;place-items:center;min-height:100vh}main{text-align:center;padding:24px}h1{font:100px Georgia;margin:0}a{color:#d8b06a}</style></head><body><main><h1>404</h1><p>Page not found / Сторінку не знайдено.</p><a href="/">KERIK →</a></main></body></html>`;
fs.writeFileSync(path.join(dist,'404.html'), notFound);

fs.writeFileSync(path.join(dist,'_headers'), `/*\n  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; upgrade-insecure-requests\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n  Strict-Transport-Security: max-age=31536000\n  Cross-Origin-Opener-Policy: same-origin\n\n/assets/*\n  Cache-Control: public, max-age=86400\n\n/*.css\n  Cache-Control: public, max-age=3600\n\n/*.js\n  Cache-Control: public, max-age=3600\n`);
fs.writeFileSync(path.join(dist,'_redirects'), `/ua/* /:splat 301\n/uk/* /:splat 301\n`);
let robots = `User-agent: *\nAllow: /\n`;
if (siteUrl) robots += `Sitemap: ${siteUrl}/sitemap.xml\n`;
fs.writeFileSync(path.join(dist,'robots.txt'), robots);
if (siteUrl) {
  const urls = langs.map(lang => `  <url><loc>${pageUrl(lang)}</loc><changefreq>weekly</changefreq><priority>${lang==='uk'?'1.0':'0.9'}</priority></url>`).join('\n');
  fs.writeFileSync(path.join(dist,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
console.log(`Built ${langs.length} localized pages${siteUrl ? ` for ${siteUrl}` : ' (SITE_URL not set; canonical/OG URL/sitemap intentionally omitted)'}.`);
