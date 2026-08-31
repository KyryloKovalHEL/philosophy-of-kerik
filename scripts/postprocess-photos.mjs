import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const localized = {
  uk: {
    chess: 'Кирило Ковальчук за шахівницею — автор «Філософії Кєріка»',
    library: 'Кирило Ковальчук працює з великою відкритою книгою в бібліотеці',
    author: 'Кирило Ковальчук — автор «Філософії Кєріка»'
  },
  en: {
    chess: 'Kyrylo Kovalchuk at a chessboard, author of Philosophy of Kerik',
    library: 'Kyrylo Kovalchuk working with a large open book in a library',
    author: 'Kyrylo Kovalchuk, author of Philosophy of Kerik'
  },
  fi: {
    chess: 'Kyrylo Kovalchuk shakkilaudan ääressä, Kerikin filosofian kirjoittaja',
    library: 'Kyrylo Kovalchuk työskentelee suuren avoimen kirjan äärellä kirjastossa',
    author: 'Kyrylo Kovalchuk, Kerikin filosofian kirjoittaja'
  },
  sv: {
    chess: 'Kyrylo Kovalchuk vid ett schackbräde, författare till Keriks filosofi',
    library: 'Kyrylo Kovalchuk arbetar med en stor uppslagen bok i ett bibliotek',
    author: 'Kyrylo Kovalchuk, författare till Keriks filosofi'
  }
};

const homes = { uk: 'index.html', en: 'en/index.html', fi: 'fi/index.html', sv: 'sv/index.html' };
const authors = { uk: 'author/index.html', en: 'en/author/index.html', fi: 'fi/author/index.html', sv: 'sv/author/index.html' };
const cssLink = '<link rel="stylesheet" href="/assets/editorial-photos.css?v=20260831-1">';
const preload = '<link rel="preload" as="image" href="/assets/kerik-chess.webp" fetchpriority="high">';

function read(relative) {
  const file = path.join(dist, relative);
  if (!fs.existsSync(file)) throw new Error(`Missing built page: ${relative}`);
  return { file, html: fs.readFileSync(file, 'utf8') };
}
function write(file, html) { fs.writeFileSync(file, html); }
function withCss(html) {
  if (html.includes(cssLink)) return html;
  if (!html.includes('</head>')) throw new Error('Cannot inject editorial photo stylesheet');
  return html.replace('</head>', `  ${cssLink}\n</head>`);
}
function withHomePreload(html) {
  if (html.includes(preload)) return html;
  return html.replace(cssLink, `${preload}\n  ${cssLink}`);
}

for (const [lang, relative] of Object.entries(homes)) {
  const { file, html: source } = read(relative);
  let html = withHomePreload(withCss(source));

  const heroPattern = /<section class="hero">\s*([\s\S]*?)\s*<\/section>/;
  const heroMatch = html.match(heroPattern);
  if (!heroMatch) throw new Error(`${relative}: hero section not found`);
  const heroInner = heroMatch[1].trim().replace(/^/gm, '      ');
  html = html.replace(heroPattern,
`<section class="hero hero-editorial">
    <div class="hero-copy">
${heroInner}
    </div>
    <figure class="hero-portrait">
      <img src="/assets/kerik-chess.webp" width="960" height="1441" alt="${localized[lang].chess}" decoding="async" fetchpriority="high">
    </figure>
  </section>`);

  const bookClass = '<div class="book-grid">';
  if (!html.includes(bookClass)) throw new Error(`${relative}: book grid not found`);
  html = html.replace(bookClass, '<div class="book-grid editorial-book-grid">');

  const bookCoverPattern = /(<figure class="book-cover"><img[^>]*?) loading="eager" fetchpriority="high"/;
  if (!bookCoverPattern.test(html)) throw new Error(`${relative}: book cover priority attributes not found`);
  html = html.replace(bookCoverPattern, '$1 loading="lazy" decoding="async"');

  const researchPhoto = `<figure class="research-photo"><img src="/assets/kerik-library.webp" width="720" height="1081" loading="lazy" decoding="async" alt="${localized[lang].library}"></figure>`;
  const bookEndPattern = /(<section class="section" id="book">[\s\S]*?<div class="book-grid editorial-book-grid">)([\s\S]*?)(<\/div>\s*<\/section>\s*<section class="section" id="articles">)/;
  if (!bookEndPattern.test(html)) throw new Error(`${relative}: book section end not found`);
  html = html.replace(bookEndPattern, `$1$2${researchPhoto}$3`);

  write(file, html);
}

for (const [lang, relative] of Object.entries(authors)) {
  const { file, html: source } = read(relative);
  let html = withCss(source);
  const current = '<div class="author-page-grid"><img src="/assets/1.jpeg" width="300" height="375" alt="Kyrylo Kovalchuk">';
  if (!html.includes(current)) throw new Error(`${relative}: current author portrait not found`);
  const replacement = `<div class="author-page-grid"><img src="/assets/kerik-author.webp" width="760" height="1140" loading="lazy" decoding="async" alt="${localized[lang].author}">`;
  html = html.replace(current, replacement);
  write(file, html);
}

fs.rmSync(path.join(dist, 'assets', 'photo-data'), { recursive: true, force: true });
console.log('Editorial photo integration applied to 4 home pages and 4 author pages.');
