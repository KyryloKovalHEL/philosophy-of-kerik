import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const content = JSON.parse(fs.readFileSync(path.join(src, 'content.json'), 'utf8'));
const articlesData = JSON.parse(fs.readFileSync(path.join(src, 'articles', 'index.json'), 'utf8'));
const loadArticle = (slug, lang) => JSON.parse(fs.readFileSync(path.join(src, 'articles', slug, `${lang}.json`), 'utf8'));
const template = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
const articleTemplate = fs.readFileSync(path.join(src, 'article-template.html'), 'utf8');
const readerTemplate = fs.readFileSync(path.join(src, 'book-reader-template.html'), 'utf8');
const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
const langs = ['uk','en','fi','sv'];

const readerEditions = [
  {
    lang:'uk',
    dir:'reader-uk',
    parts:4,
    sha256:'0bb5e5bea24501ca7dd220e0b40b71e32e92cb6487b9a04d41d5a70bbedced92',
    path:'/books/short-uk/',
    title:'Філософія Кєріка — скорочене видання',
    heading:'ФІЛОСОФІЯ КЄРІКА',
    edition:'Скорочене видання',
    author:'Автор КОВАЛЬЧУК КИРИЛО ВОЛОДИМИРОВИЧ',
    description:'Скорочене українське видання книги «Філософія Кєріка». Онлайн-читання на офіційному сайті автора.',
    back:'← До книги',
    note:'Онлайн-версія скороченого видання. Текст книги відтворено без редагування.',
    pageLabel:'Сторінка',
    skip:'Перейти до тексту книги',
    footerRights:'Усі права захищено.'
  },
  {
    lang:'en',
    dir:'reader-en',
    parts:3,
    sha256:'9d01d5850e4f5f672f573ec6e9b0572658ad0c08edbfe499a73af0d7e259baaf',
    path:'/books/short-en/',
    title:'The Philosophy of Kerik — Short Edition',
    heading:'THE PHILOSOPHY OF KERIK',
    edition:'Short Edition',
    author:'Kyrylo Kovalchuk',
    description:'The English Short Edition of The Philosophy of Kerik, available to read online on the author’s official website.',
    back:'← Back to the book',
    note:'Online version of the Short Edition. The book text is reproduced without editing.',
    pageLabel:'Page',
    skip:'Skip to the book text',
    footerRights:'All rights reserved.'
  }
];

const editionLinks = [null, '/books/short-uk/', '/books/short-en/'];
const editionLabels = {
  uk:[null, 'Скорочене українське видання — читати онлайн', 'English Short Edition — read online'],
  en:[null, 'Ukrainian Short Edition — read online', 'English Short Edition — read online'],
  fi:[null, 'Ukrainankielinen lyhytversio — lue verkossa', 'Englanninkielinen lyhytversio — lue verkossa'],
  sv:[null, 'Förkortad ukrainsk utgåva — läs online', 'Engelsk kortutgåva — läs online']
};
const editionActions = { uk:'Читати →', en:'Read →', fi:'Lue →', sv:'Läs →' };
const bookNotes = {
  uk:'Повне українське видання залишається непублічним. Скорочені видання доступні для читання на сайті.',
  en:'The full Ukrainian edition remains unpublished. The Short Editions are available to read on the website.',
  fi:'Ukrainankielinen täysversio pysyy julkaisemattomana. Lyhytversiot ovat luettavissa verkkosivustolla.',
  sv:'Den fullständiga ukrainska utgåvan förblir opublicerad. Kortutgåvorna finns att läsa på webbplatsen.'
};

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
const articlePath = (lang, slug) => `${languagePath(lang)}articles/${slug}/`;
const articleUrl = (lang, slug) => siteUrl ? `${siteUrl}${articlePath(lang, slug)}` : '';
const readerUrl = reader => siteUrl ? `${siteUrl}${reader.path}` : '';

function replaceAllTokens(html, tokens){
  for (const [key,value] of Object.entries(tokens)) html = html.replaceAll(`{{${key}}}`, value);
  return html;
}

function renderArticleBody(article) {
  return article.sections.map(section => {
    const paragraphs = section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('\n      ');
    return `<section class="article-section">\n      <h2>${escapeHtml(section.heading)}</h2>\n      ${paragraphs}\n    </section>`;
  }).join('\n    ');
}

function readBookText(reader) {
  const encoded = Array.from({length:reader.parts}, (_,index) => {
    const part = String(index + 1).padStart(2,'0');
    return fs.readFileSync(path.join(src,'books',reader.dir,`part-${part}.b64gz`),'utf8');
  }).join('').replace(/\s+/g,'');
  const raw = zlib.gunzipSync(Buffer.from(encoded,'base64'));
  const digest = crypto.createHash('sha256').update(raw).digest('hex');
  if (digest !== reader.sha256) {
    throw new Error(`Book text integrity check failed for ${reader.path}: ${digest}`);
  }
  return raw.toString('utf8');
}

function renderBookPages(text, pageLabel) {
  const pages = text.split('\f');
  if (pages.at(-1) === '') pages.pop();
  return pages.map((page,index) =>
    `<section class="reader-page" aria-label="${escapeHtml(pageLabel)} ${index + 1}"><pre>${escapeHtml(page)}</pre></section>`
  ).join('\n    ');
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
  const editions = t.editions.map((item,index) => {
    const href = editionLinks[index];
    const label = editionLabels[lang]?.[index] || item;
    if (!href) return `<li>${escapeHtml(label)}</li>`;
    return `<li class="edition-link"><a href="${href}"><span>${escapeHtml(label)}</span><b>${escapeHtml(editionActions[lang])}</b></a></li>`;
  }).join('');
  const articleCards = t.articles.map(([kicker,title], index) => {
    const article = articlesData.items[index];
    if (!article) throw new Error(`Missing article data for ${lang} article index ${index}`);
    return `<article><a class="card-link" href="${articlePath(lang, article.slug)}"><p>${escapeHtml(kicker)}</p><h3>${escapeHtml(title)}</h3><span class="coming">${escapeHtml(articlesData.ui[lang].read)} →</span></a></article>`;
  }).join('');
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
    BOOK_HEADING: escapeHtml(t.bookHeading), BOOK_KICKER: escapeHtml(t.bookKicker), BOOK_TITLE: escapeHtml(t.bookTitle), BOOK_TEXT: escapeHtml(t.bookText), EDITIONS: editions, BOOK_NOTE: escapeHtml(bookNotes[lang]),
    ARTICLES_HEADING: escapeHtml(t.articlesHeading), ARTICLES_INTRO: escapeHtml(articlesData.ui[lang].intro), ARTICLE_CARDS: articleCards,
    CONCEPTS_HEADING: escapeHtml(t.conceptsHeading), CONCEPTS_INTRO: escapeHtml(t.conceptsIntro), CONCEPT_ROWS: conceptRows,
    AUTHOR_HEADING: escapeHtml(t.authorHeading), AUTHOR_KICKER: escapeHtml(t.authorKicker), AUTHOR_NAME: escapeHtml(t.authorName), AUTHOR_TEXT: escapeHtml(t.authorText),
    FOOTER_RIGHTS: escapeHtml(t.footerRights),
    STRUCTURED_DATA: JSON.stringify(structured).replaceAll('<','\\u003c')
  };
  const html = replaceAllTokens(template, tokens);
  const outputDir = lang === 'uk' ? dist : path.join(dist, lang);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir,'index.html'), html);

  for (let index = 0; index < articlesData.items.length; index++) {
    const item = articlesData.items[index];
    const article = loadArticle(item.slug, lang);
    const [kicker,title] = t.articles[index] || [];
    if (!kicker || !title) throw new Error(`Missing ${lang} article card metadata for ${item.slug}`);

    const articleHreflang = siteUrl ? [
      ...langs.map(code => `<link rel="alternate" hreflang="${code}" href="${articleUrl(code, item.slug)}">`),
      `<link rel="alternate" hreflang="x-default" href="${articleUrl('uk', item.slug)}">`,
      `<link rel="canonical" href="${articleUrl(lang, item.slug)}">`
    ].join('\n  ') : '';
    const articleUrlMeta = siteUrl ? [
      `<meta property="og:url" content="${articleUrl(lang, item.slug)}">`,
      `<meta property="og:image" content="${siteUrl}/assets/social-card.webp">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="article:published_time" content="${articlesData.published}">`,
      `<meta property="article:author" content="Kyrylo Kovalchuk">`,
      `<meta name="twitter:image" content="${siteUrl}/assets/social-card.webp">`
    ].join('\n  ') : '';
    const articleLangLinks = langs.map(code => {
      const current = code === lang ? ' aria-current="page"' : '';
      return `<a href="${articlePath(code, item.slug)}" hreflang="${code}" lang="${code}"${current}>${content[code].label}</a>`;
    }).join('');
    const articleStructured = {
      '@context':'https://schema.org',
      '@type':'Article',
      headline:title,
      description:article.lead,
      inLanguage:lang,
      datePublished:articlesData.published,
      dateModified:articlesData.published,
      author:{'@type':'Person',name:'Kyrylo Kovalchuk'},
      publisher:{'@type':'Person',name:'Kyrylo Kovalchuk'},
      ...(siteUrl ? {
        mainEntityOfPage:{'@type':'WebPage','@id':articleUrl(lang, item.slug)},
        image:`${siteUrl}/assets/social-card.webp`
      } : {})
    };
    const articleTokens = {
      LANG:lang,
      LOCALE:t.locale,
      TITLE:escapeHtml(title),
      DESCRIPTION:escapeHtml(article.lead),
      URL_META:articleUrlMeta,
      HREFLANG:articleHreflang,
      HOME_URL:languagePath(lang),
      SKIP:escapeHtml(t.skip),
      MENU:escapeHtml(t.menu),
      LANGUAGE:escapeHtml(t.language),
      LANG_LINKS:articleLangLinks,
      NAV_BOOK:escapeHtml(t.nav[0]), NAV_ARTICLES:escapeHtml(t.nav[1]), NAV_CONCEPTS:escapeHtml(t.nav[2]), NAV_AUTHOR:escapeHtml(t.nav[3]),
      ARTICLE_BACK:escapeHtml(articlesData.ui[lang].back),
      ARTICLE_KICKER:escapeHtml(kicker),
      ARTICLE_TITLE:escapeHtml(title),
      ARTICLE_LEAD:escapeHtml(article.lead),
      ARTICLE_BODY:renderArticleBody(article),
      FOOTER_RIGHTS:escapeHtml(t.footerRights),
      STRUCTURED_DATA:JSON.stringify(articleStructured).replaceAll('<','\\u003c')
    };
    const articleHtml = replaceAllTokens(articleTemplate, articleTokens);
    const articleOutputDir = path.join(outputDir, 'articles', item.slug);
    fs.mkdirSync(articleOutputDir, { recursive: true });
    fs.writeFileSync(path.join(articleOutputDir,'index.html'), articleHtml);
  }
}

for (const reader of readerEditions) {
  const bookText = readBookText(reader);
  const otherReader = readerEditions.find(item => item.lang !== reader.lang);
  const hreflang = siteUrl ? [
    `<link rel="alternate" hreflang="uk" href="${readerUrl(readerEditions[0])}">`,
    `<link rel="alternate" hreflang="en" href="${readerUrl(readerEditions[1])}">`,
    `<link rel="alternate" hreflang="x-default" href="${readerUrl(readerEditions[0])}">`,
    `<link rel="canonical" href="${readerUrl(reader)}">`
  ].join('\n  ') : '';
  const urlMeta = siteUrl ? [
    `<meta property="og:url" content="${readerUrl(reader)}">`,
    `<meta property="og:image" content="${siteUrl}/assets/book-cover.webp">`,
    `<meta property="og:image:width" content="688">`,
    `<meta property="og:image:height" content="1265">`,
    `<meta name="twitter:image" content="${siteUrl}/assets/book-cover.webp">`
  ].join('\n  ') : '';
  const structured = {
    '@context':'https://schema.org',
    '@type':'Book',
    name:reader.heading,
    bookEdition:reader.edition,
    inLanguage:reader.lang,
    author:{'@type':'Person',name:'Kyrylo Kovalchuk'},
    copyrightYear:2026,
    ...(siteUrl ? { url:readerUrl(reader), image:`${siteUrl}/assets/book-cover.webp` } : {})
  };
  const readerTokens = {
    LANG:reader.lang,
    TITLE:escapeHtml(reader.title),
    TITLE_HEADING:escapeHtml(reader.heading),
    DESCRIPTION:escapeHtml(reader.description),
    EDITION_LABEL:escapeHtml(reader.edition),
    AUTHOR_LABEL:escapeHtml(reader.author),
    BACK_LABEL:escapeHtml(reader.back),
    READER_NOTE:escapeHtml(reader.note),
    SKIP:escapeHtml(reader.skip),
    FOOTER_RIGHTS:escapeHtml(reader.footerRights),
    URL_META:urlMeta,
    HREFLANG:hreflang,
    BOOK_PAGES:renderBookPages(bookText, reader.pageLabel),
    STRUCTURED_DATA:JSON.stringify(structured).replaceAll('<','\\u003c')
  };
  const readerHtml = replaceAllTokens(readerTemplate, readerTokens);
  const readerOutputDir = path.join(dist, ...reader.path.split('/').filter(Boolean));
  fs.mkdirSync(readerOutputDir, { recursive: true });
  fs.writeFileSync(path.join(readerOutputDir,'index.html'), readerHtml);

  if (!otherReader) throw new Error('Missing alternate short edition');
}

const notFound = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#090909"><title>404 — KERIK</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;background:#090909;color:#eee;font-family:system-ui;display:grid;place-items:center;min-height:100vh}main{text-align:center;padding:24px}h1{font:100px Georgia;margin:0}a{color:#d8b06a}</style></head><body><main><h1>404</h1><p>Page not found / Сторінку не знайдено.</p><a href="/">KERIK →</a></main></body></html>`;
fs.writeFileSync(path.join(dist,'404.html'), notFound);

fs.writeFileSync(path.join(dist,'_headers'), `/*\n  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; upgrade-insecure-requests\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n  Strict-Transport-Security: max-age=31536000\n  Cross-Origin-Opener-Policy: same-origin\n\n/assets/*\n  Cache-Control: public, max-age=86400\n\n/*.css\n  Cache-Control: public, max-age=3600\n\n/*.js\n  Cache-Control: public, max-age=3600\n`);
fs.writeFileSync(path.join(dist,'_redirects'), `/ua/* /:splat 301\n/uk/* /:splat 301\n`);
let robots = `User-agent: *\nAllow: /\n`;
if (siteUrl) robots += `Sitemap: ${siteUrl}/sitemap.xml\n`;
fs.writeFileSync(path.join(dist,'robots.txt'), robots);
if (siteUrl) {
  const homeUrls = langs.map(lang => `  <url><loc>${pageUrl(lang)}</loc><changefreq>weekly</changefreq><priority>${lang==='uk'?'1.0':'0.9'}</priority></url>`);
  const articleUrls = articlesData.items.flatMap(item => langs.map(lang => `  <url><loc>${articleUrl(lang,item.slug)}</loc><lastmod>${articlesData.published}</lastmod><changefreq>monthly</changefreq><priority>${lang==='uk'?'0.8':'0.7'}</priority></url>`));
  const readerUrls = readerEditions.map(reader => `  <url><loc>${readerUrl(reader)}</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>`);
  fs.writeFileSync(path.join(dist,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...homeUrls,...articleUrls,...readerUrls].join('\n')}\n</urlset>\n`);
}
console.log(`Built ${langs.length} localized home pages, ${langs.length * articlesData.items.length} localized article pages and ${readerEditions.length} short-edition reader pages${siteUrl ? ` for ${siteUrl}` : ' (SITE_URL not set; canonical/OG URL/sitemap intentionally omitted)'}.`);
