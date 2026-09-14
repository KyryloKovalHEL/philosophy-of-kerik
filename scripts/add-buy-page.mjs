import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const content = JSON.parse(fs.readFileSync(path.join(src, 'content.json'), 'utf8'));
const extended = JSON.parse(fs.readFileSync(path.join(src, 'extended-content.json'), 'utf8'));
const pageTemplate = fs.readFileSync(path.join(src, 'page-template.html'), 'utf8');
const siteUrl = (process.env.SITE_URL || 'https://philosophyofkerik.com').replace(/\/$/, '');
const langs = ['uk', 'en', 'fi', 'sv'];

const purchase = {
  uk: {
    nav: 'Купити книгу',
    title: 'Купити книгу',
    lead: 'Офіційні посилання для придбання «Філософії Кєріка» з’являться тут після завершення необхідної реєстрації прав інтелектуальної власності та підготовки документів для проєкту.',
    amazonHeading: 'Планований продаж через Amazon',
    amazonText: '«Філософія Кєріка» планується до міжнародного розповсюдження через Amazon. Комерційний запуск відбудеться після завершення необхідних процедур реєстрації прав інтелектуальної власності та підготовки документів для проєкту.',
    flowHeading: 'Як відбуватиметься придбання',
    flowText: 'Сайт → Amazon → Замовлення та оплата → Доставка',
    flowNote: 'Після запуску на цій сторінці з’являться прямі посилання на офіційні сторінки продажу Amazon.',
    policyHeading: 'Доставка, повернення та відшкодування',
    policyText: 'Друк, обробка платежів, доставка, повернення та відшкодування плануються через інфраструктуру Amazon відповідно до застосовних політик Amazon, які можуть відрізнятися залежно від країни та формату.',
    status: 'Статус: комерційний запуск запланований після завершення необхідної документації.'
  },
  en: {
    nav: 'Buy the Book',
    title: 'Buy the Book',
    lead: 'Official purchase links for The Philosophy of Kerik will appear here after the required intellectual property registration and project documentation processes have been completed.',
    amazonHeading: 'Planned distribution through Amazon',
    amazonText: 'The Philosophy of Kerik is planned for international distribution through Amazon. The commercial launch will begin after the required intellectual property registration and project documentation processes have been completed.',
    flowHeading: 'Planned purchasing process',
    flowText: 'Website → Amazon → Order & Payment → Delivery',
    flowNote: 'After launch, this page will provide direct links to the official Amazon sales pages.',
    policyHeading: 'Delivery, returns and refunds',
    policyText: 'Printing, payment processing, delivery, returns and refunds are planned to be handled through Amazon’s infrastructure and applicable policies, which may vary by country and format.',
    status: 'Status: commercial launch is planned after the required documentation is complete.'
  },
  fi: {
    nav: 'Osta kirja',
    title: 'Osta kirja',
    lead: 'Kerikin filosofian viralliset ostolinkit julkaistaan tällä sivulla, kun tarvittavat immateriaalioikeuksien rekisteröinnit ja hankkeen asiakirjaprosessit on saatu päätökseen.',
    amazonHeading: 'Suunniteltu jakelu Amazonin kautta',
    amazonText: 'Kerikin filosofia on tarkoitus tuoda kansainväliseen jakeluun Amazonin kautta. Kaupallinen julkaisu alkaa, kun tarvittavat immateriaalioikeuksien rekisteröinnit ja hankkeen asiakirjaprosessit on saatu päätökseen.',
    flowHeading: 'Suunniteltu ostoprosessi',
    flowText: 'Verkkosivusto → Amazon → Tilaus ja maksu → Toimitus',
    flowNote: 'Julkaisun jälkeen tällä sivulla on suorat linkit virallisille Amazon-myyntisivuille.',
    policyHeading: 'Toimitus, palautukset ja hyvitykset',
    policyText: 'Painatus, maksujen käsittely, toimitus, palautukset ja hyvitykset on tarkoitus hoitaa Amazonin infrastruktuurin ja sovellettavien käytäntöjen mukaisesti. Käytännöt voivat vaihdella maan ja formaatin mukaan.',
    status: 'Tila: kaupallinen julkaisu on suunniteltu tarvittavien asiakirjojen valmistumisen jälkeen.'
  },
  sv: {
    nav: 'Köp boken',
    title: 'Köp boken',
    lead: 'Officiella köplänkar för Keriks filosofi kommer att publiceras här när nödvändiga registreringar av immateriella rättigheter och projektets dokumentationsprocesser har slutförts.',
    amazonHeading: 'Planerad distribution via Amazon',
    amazonText: 'Keriks filosofi planeras för internationell distribution via Amazon. Den kommersiella lanseringen börjar när nödvändiga registreringar av immateriella rättigheter och projektets dokumentationsprocesser har slutförts.',
    flowHeading: 'Planerad köpprocess',
    flowText: 'Webbplats → Amazon → Beställning och betalning → Leverans',
    flowNote: 'Efter lanseringen kommer den här sidan att innehålla direktlänkar till de officiella försäljningssidorna på Amazon.',
    policyHeading: 'Leverans, returer och återbetalningar',
    policyText: 'Tryckning, betalningshantering, leverans, returer och återbetalningar planeras att hanteras genom Amazons infrastruktur och tillämpliga policyer, som kan variera beroende på land och format.',
    status: 'Status: kommersiell lansering planeras efter att den nödvändiga dokumentationen har slutförts.'
  }
};

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const rootPath = lang => lang === 'uk' ? '/' : `/${lang}/`;
const routePath = (lang, route = '') => `${rootPath(lang)}${route ? `${route.replace(/^\/+|\/+$/g, '')}/` : ''}`;
const absolute = pathname => `${siteUrl}${pathname}`;
const outputDirFor = (lang, route = '') => path.join(dist, lang === 'uk' ? '' : lang, ...route.split('/').filter(Boolean));

function replaceTokens(html, tokens) {
  for (const [key, value] of Object.entries(tokens)) html = html.replaceAll(`{{${key}}}`, String(value ?? ''));
  const unresolved = html.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) throw new Error(`Unresolved purchase-page template tokens: ${[...new Set(unresolved)].join(', ')}`);
  return html;
}

function hreflang(currentLang) {
  return [
    ...langs.map(code => `<link rel="alternate" hreflang="${code}" href="${absolute(routePath(code, 'buy'))}">`),
    `<link rel="alternate" hreflang="x-default" href="${absolute(routePath('en', 'buy'))}">`,
    `<link rel="canonical" href="${absolute(routePath(currentLang, 'buy'))}">`
  ].join('\n  ');
}

function langLinks(currentLang) {
  return langs.map(code => `<a href="${routePath(code, 'buy')}" hreflang="${code}" lang="${code}"${code === currentLang ? ' aria-current="page"' : ''}>${content[code].label}</a>`).join('');
}

function commonUrls(lang) {
  return {
    HOME_URL: rootPath(lang),
    BOOK_URL: routePath(lang, 'book'),
    ARTICLES_URL: routePath(lang, 'articles'),
    CONCEPTS_URL: routePath(lang, 'concepts'),
    AUTHOR_URL: routePath(lang, 'author'),
    SEARCH_URL: routePath(lang, 'search'),
    CONTACT_URL: routePath(lang, 'contact'),
    PRIVACY_URL: routePath(lang, 'privacy'),
    TERMS_URL: routePath(lang, 'terms'),
    FEED_URL: routePath(lang, 'feed.xml').replace(/\/$/, '')
  };
}

for (const lang of langs) {
  const t = content[lang];
  const ui = extended.ui[lang];
  const p = purchase[lang];
  const urls = commonUrls(lang);
  const pathname = routePath(lang, 'buy');
  const description = p.lead;
  const body = [
    `<section class="prose-section"><h2>${esc(p.amazonHeading)}</h2><p>${esc(p.amazonText)}</p></section>`,
    `<section class="prose-section"><h2>${esc(p.flowHeading)}</h2><p><strong>${esc(p.flowText)}</strong></p><p>${esc(p.flowNote)}</p></section>`,
    `<section class="prose-section"><h2>${esc(p.policyHeading)}</h2><p>${esc(p.policyText)}</p></section>`,
    `<p class="quiet-note"><strong>${esc(p.status)}</strong></p>`
  ].join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description,
    inLanguage: lang,
    url: absolute(pathname),
    isPartOf: { '@type': 'WebSite', name: 'Philosophy of Kerik', url: absolute(rootPath(lang)) }
  };
  const urlMeta = [
    `<meta property="og:url" content="${absolute(pathname)}">`,
    `<meta property="og:image" content="${siteUrl}/assets/social-card.webp">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:image" content="${siteUrl}/assets/social-card.webp">`
  ].join('\n  ');
  let html = replaceTokens(pageTemplate, {
    ...urls,
    LANG: lang,
    LOCALE: t.locale,
    TITLE: esc(p.title),
    DESCRIPTION: esc(description),
    URL_META: urlMeta,
    HREFLANG: hreflang(lang),
    FEED_LINK: `<link rel="alternate" type="application/atom+xml" title="Philosophy of Kerik" href="${urls.FEED_URL}">`,
    STRUCTURED_DATA: JSON.stringify(schema).replaceAll('<', '\\u003c'),
    SKIP: esc(t.skip),
    MENU: esc(t.menu),
    LANGUAGE: esc(t.language),
    NAV_BOOK: esc(t.nav[0]),
    NAV_ARTICLES: esc(t.nav[1]),
    NAV_CONCEPTS: esc(t.nav[2]),
    NAV_AUTHOR: esc(t.nav[3]),
    NAV_SEARCH: esc(ui.search),
    LANG_LINKS: langLinks(lang),
    PAGE_TITLE: esc(p.title),
    PAGE_LEAD: esc(p.lead),
    PAGE_BODY: body,
    BODY_CLASS: 'purchase-page',
    FOOTER_RIGHTS: esc(t.footerRights),
    CONTACT_LABEL: esc(ui.contact),
    PRIVACY_LABEL: esc(ui.privacy),
    TERMS_LABEL: esc(ui.terms),
    BACK_HOME: esc(ui.backHome)
  });
  const out = outputDirFor(lang, 'buy');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
}

function languageForFile(file) {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel.startsWith('en/')) return 'en';
  if (rel.startsWith('fi/')) return 'fi';
  if (rel.startsWith('sv/')) return 'sv';
  if (rel.startsWith('books/short-en/')) return 'en';
  return 'uk';
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(dist).filter(file => file.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('id="mainNav"') || html.includes('data-purchase-nav="true"')) continue;
  const lang = languageForFile(file);
  const link = `<a href="${routePath(lang, 'buy')}" data-purchase-nav="true">${esc(purchase[lang].nav)}</a>`;
  html = html.replace(/(<a href="[^"]*\/author\/"[^>]*>.*?<\/a>)/s, `$1${link}`);
  fs.writeFileSync(file, html);
}

for (const lang of langs) {
  const indexFile = path.join(outputDirFor(lang, ''), 'search-index.json');
  if (fs.existsSync(indexFile)) {
    const records = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    if (!records.some(record => record.url === routePath(lang, 'buy'))) {
      records.push({
        type: lang === 'uk' ? 'Сторінка' : lang === 'en' ? 'Page' : lang === 'fi' ? 'Sivu' : 'Sida',
        title: purchase[lang].title,
        url: routePath(lang, 'buy'),
        excerpt: purchase[lang].lead,
        tags: []
      });
      fs.writeFileSync(indexFile, JSON.stringify(records));
    }
  }
}

const sitemapFile = path.join(dist, 'sitemap.xml');
if (fs.existsSync(sitemapFile)) {
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  const entries = langs
    .map(lang => `<url><loc>${absolute(routePath(lang, 'buy'))}</loc><lastmod>2026-09-14</lastmod></url>`)
    .filter(entry => !sitemap.includes(entry.match(/<loc>(.*?)<\/loc>/)[1]))
    .join('');
  sitemap = sitemap.replace('</urlset>', `${entries}</urlset>`);
  fs.writeFileSync(sitemapFile, sitemap);
}

console.log('Added localized Buy the Book pages and navigation for uk/en/fi/sv.');
