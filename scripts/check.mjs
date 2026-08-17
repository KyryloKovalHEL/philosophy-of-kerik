import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const errors = [];
const langs = ['uk', 'en', 'fi', 'sv'];
const content = JSON.parse(fs.readFileSync(path.join(src, 'content.json'), 'utf8'));
const articles = JSON.parse(fs.readFileSync(path.join(src, 'articles', 'index.json'), 'utf8'));
const extended = JSON.parse(fs.readFileSync(path.join(src, 'extended-content.json'), 'utf8'));
const newArticles = JSON.parse(fs.readFileSync(path.join(src, 'new-articles.json'), 'utf8'));

const fileExists = relative => fs.existsSync(path.join(dist, relative));
const read = relative => fs.readFileSync(path.join(dist, relative), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const fail = message => errors.push(message);
const outputPrefix = lang => lang === 'uk' ? '' : `${lang}/`;
const htmlPath = (lang, route = '') => `${outputPrefix(lang)}${route ? `${route.replace(/^\/+|\/+$/g, '')}/` : ''}index.html`;

const requiredGlobal = [
  'index.html', 'en/index.html', 'fi/index.html', 'sv/index.html',
  'styles.css', 'script.js', 'favicon.svg', 'site.webmanifest',
  'assets/book-cover.webp', 'assets/social-card.webp', 'assets/books.css', 'assets/1.jpeg',
  'books/short-uk/index.html', 'books/short-en/index.html',
  'robots.txt', 'sitemap.xml', '_headers', '_redirects', '404.html'
];
requiredGlobal.forEach(file => { if (!fileExists(file)) fail(`Missing ${file}`); });

if (articles.items.length !== 10) fail(`Expected 10 articles, found ${articles.items.length}`);
if (extended.concepts.length !== 4) fail(`Expected 4 concepts, found ${extended.concepts.length}`);
if (extended.chapters.length !== 13) fail(`Expected 13 chapters, found ${extended.chapters.length}`);
for (const lang of langs) {
  if (!content[lang]) fail(`Missing content translation: ${lang}`);
  if (!extended.ui[lang]) fail(`Missing extended UI translation: ${lang}`);
  if (extended.principles[lang]?.items?.length !== 7) fail(`${lang}: expected 7 core principles`);
}

const routes = ['articles','concepts','principles','book','references','author','contact','privacy','terms','search'];
for (const lang of langs) {
  const prefix = outputPrefix(lang);
  const homeFile = htmlPath(lang);
  const home = read(homeFile);
  if (!home.includes(`<html lang="${lang}">`)) fail(`${homeFile}: wrong html lang`);
  if (home.includes('{{') || home.includes('}}')) fail(`${homeFile}: unresolved template token`);
  if (!home.includes('Philosophy of Kerik')) fail(`${homeFile}: missing brand`);
  if (!home.includes('Kyrylo Kovalchuk')) fail(`${homeFile}: missing author`);
  if (!home.includes('book-cover.webp')) fail(`${homeFile}: missing book cover`);
  if (count(home, 'class="card-link"') !== 10) fail(`${homeFile}: expected 10 article cards`);
  if (count(home, 'class="concept-row"') !== 4) fail(`${homeFile}: expected 4 concept links`);
  if (!home.includes(`${prefix}principles/`) && !home.includes(`/${lang}/principles/`) && lang !== 'uk') fail(`${homeFile}: missing principles link`);
  if (!home.includes('feed.xml')) fail(`${homeFile}: missing feed link`);
  if (!home.includes('search')) fail(`${homeFile}: missing search link`);
  if (/philosophical project|філософський проєкт|filosofinen projekti|filosofiska projekt/i.test(home)) fail(`${homeFile}: stale project wording`);

  for (const route of routes) {
    const file = htmlPath(lang, route);
    if (!fileExists(file)) { fail(`Missing ${file}`); continue; }
    const html = read(file);
    if (!html.includes(`<html lang="${lang}">`)) fail(`${file}: wrong html lang`);
    if (html.includes('{{') || html.includes('}}')) fail(`${file}: unresolved template token`);
    if (!html.includes('<link rel="canonical"')) fail(`${file}: missing canonical`);
    if (!html.includes('hreflang="en"')) fail(`${file}: missing hreflang`);
    if (!html.includes('application/ld+json')) fail(`${file}: missing structured data`);
  }

  const articleArchive = read(htmlPath(lang, 'articles'));
  if (count(articleArchive, 'class="archive-card"') !== 10) fail(`${lang}: article archive does not contain 10 articles`);
  if (!articleArchive.includes('id="articleFilter"')) fail(`${lang}: article archive missing filter`);

  const conceptsIndex = read(htmlPath(lang, 'concepts'));
  if (count(conceptsIndex, 'class="concept-card"') !== 4) fail(`${lang}: concept index does not contain 4 concepts`);

  const principles = read(htmlPath(lang, 'principles'));
  if (count(principles, '<li><span>') !== 7) fail(`${lang}: principles page does not render seven principles`);

  const book = read(htmlPath(lang, 'book'));
  if (count(book, 'class="chapter-list"') !== 1 || count(book, '<li><span>') < 13) fail(`${lang}: book structure missing chapters`);
  if (!book.includes('/books/short-uk/') || !book.includes('/books/short-en/')) fail(`${lang}: book page missing reader links`);

  const references = read(htmlPath(lang, 'references'));
  if (count(references, 'class="reference-group"') < 5) fail(`${lang}: references page missing source groups`);
  if (!references.includes('NASA') || !references.includes('World Health Organization')) fail(`${lang}: references page missing authoritative sources`);

  const author = read(htmlPath(lang, 'author'));
  if (!author.includes('Kyrylo Kovalchuk') || !author.includes('linkedin.com/in/kyrylo-kovalchuk-7276461bb')) fail(`${lang}: author page missing identity/profile`);

  const contact = read(htmlPath(lang, 'contact'));
  if (!contact.includes('LinkedIn') || !contact.includes('GitHub')) fail(`${lang}: contact page missing official profiles`);
  if (/@gmail\.com|@outlook\.com|@hotmail\.com/i.test(contact)) fail(`${lang}: private email exposed on contact page`);

  const privacy = read(htmlPath(lang, 'privacy'));
  if (!/cookie|eväste|cookies/i.test(privacy)) fail(`${lang}: privacy page does not address cookies`);

  const searchPage = read(htmlPath(lang, 'search'));
  if (!searchPage.includes('id="siteSearch"') || !searchPage.includes('search-index.json')) fail(`${lang}: search page not wired to local index`);

  const searchIndexFile = `${prefix}search-index.json`;
  if (!fileExists(searchIndexFile)) fail(`Missing ${searchIndexFile}`);
  else {
    const records = JSON.parse(read(searchIndexFile));
    if (records.length < 19) fail(`${searchIndexFile}: expected at least 19 indexed resources, got ${records.length}`);
    if (!records.some(r => r.url.includes('/concepts/'))) fail(`${searchIndexFile}: no concepts indexed`);
    if (!records.some(r => r.url.includes('/articles/'))) fail(`${searchIndexFile}: no articles indexed`);
  }

  const feedFile = `${prefix}feed.xml`;
  if (!fileExists(feedFile)) fail(`Missing ${feedFile}`);
  else {
    const feed = read(feedFile);
    if (!feed.includes('<feed xmlns="http://www.w3.org/2005/Atom">')) fail(`${feedFile}: invalid Atom root`);
    if (count(feed, '<entry>') !== 10) fail(`${feedFile}: expected 10 entries`);
  }

  for (const concept of extended.concepts) {
    const file = htmlPath(lang, `concepts/${concept.slug}`);
    if (!fileExists(file)) { fail(`Missing ${file}`); continue; }
    const html = read(file);
    if (!html.includes(`<html lang="${lang}">`)) fail(`${file}: wrong lang`);
    if (!html.includes('prose-section')) fail(`${file}: missing concept body`);
    if (!html.includes('related-section')) fail(`${file}: missing related reading`);
    if (!html.includes('DefinedTerm')) fail(`${file}: missing DefinedTerm schema`);
  }

  for (const item of articles.items) {
    const file = htmlPath(lang, `articles/${item.slug}`);
    if (!fileExists(file)) { fail(`Missing ${file}`); continue; }
    const html = read(file);
    if (!html.includes(`<html lang="${lang}">`)) fail(`${file}: wrong lang`);
    if (html.includes('{{') || html.includes('}}')) fail(`${file}: unresolved template token`);
    if (!html.includes('article-body')) fail(`${file}: missing article body`);
    if (!html.includes('tag-list')) fail(`${file}: missing tags`);
    if (!html.includes('related-section')) fail(`${file}: missing related content`);
    if (!html.includes('"@type":"Article"')) fail(`${file}: missing Article schema`);
    const legacyFile = path.join(src, 'articles', item.slug, `${lang}.json`);
    if (!fs.existsSync(legacyFile) && !newArticles[item.slug]?.[lang]) fail(`${lang}: missing content source for ${item.slug}`);
  }
}

const ukReader = read('books/short-uk/index.html');
const enReader = read('books/short-en/index.html');
for (const [file, html, lang] of [['books/short-uk/index.html',ukReader,'uk'],['books/short-en/index.html',enReader,'en']]) {
  if (!html.includes(`<html lang="${lang}">`)) fail(`${file}: wrong html lang`);
  if (html.includes('{{') || html.includes('}}')) fail(`${file}: unresolved template token`);
  if (!html.includes('reader-toc')) fail(`${file}: missing table of contents`);
  if (!html.includes('readingProgressBar')) fail(`${file}: missing reading progress`);
  if (!html.includes('readerPrev') || !html.includes('readerNext')) fail(`${file}: missing chapter navigation`);
  if (!html.includes('chapter-1') || !html.includes('chapter-13')) fail(`${file}: missing chapter anchors`);
}
if (!enReader.includes('I wrote this book based on my own experience')) fail('English Short Edition: corrected phrase missing');
if (enReader.includes('I wrote this book based on his own experience')) fail('English Short Edition: original typo remains');

const sitemap = read('sitemap.xml');
for (const required of ['/en/references/','/fi/concepts/control-of-reality/','/sv/articles/reality-as-a-model/','/books/short-en/']) {
  if (!sitemap.includes(required)) fail(`sitemap.xml missing ${required}`);
}
const robots = read('robots.txt');
if (!robots.includes('https://philosophyofkerik.com/sitemap.xml')) fail('robots.txt missing canonical sitemap URL');
const headers = read('_headers');
if (!headers.includes('Content-Security-Policy')) fail('_headers missing CSP');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('All complete-site checks passed: 4 languages, 10 articles, 4 concepts, 13 chapters, 7 principles, readers, search, feeds, legal pages and SEO.');
