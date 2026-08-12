import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root,'dist');
const errors = [];
const langs = ['uk','en','fi','sv'];
const articlesData = JSON.parse(fs.readFileSync(path.join(root,'src','articles','index.json'),'utf8'));
const loadArticle = (slug, lang) => JSON.parse(fs.readFileSync(path.join(root,'src','articles',slug,`${lang}.json`),'utf8'));
const required = [
  'index.html','en/index.html','fi/index.html','sv/index.html',
  'styles.css','script.js','favicon.svg','assets/book-cover.webp','assets/social-card.webp','assets/books.css',
  'books/short-uk/index.html','books/short-en/index.html',
  'robots.txt','_headers','404.html'
];
for (const item of articlesData.items) {
  for (const lang of langs) {
    const prefix = lang === 'uk' ? '' : `${lang}/`;
    required.push(`${prefix}articles/${item.slug}/index.html`);
  }
}
for (const file of required) if (!fs.existsSync(path.join(dist,file))) errors.push(`Missing ${file}`);

for (const lang of langs) {
  const file = lang === 'uk' ? 'index.html' : `${lang}/index.html`;
  const html = fs.readFileSync(path.join(dist,file),'utf8');
  if (!html.includes(`<html lang="${lang}">`)) errors.push(`${file}: wrong html lang`);
  for (const token of ['{{','}}']) if (html.includes(token)) errors.push(`${file}: unresolved template token ${token}`);
  if (!html.includes('Philosophy of Kerik')) errors.push(`${file}: missing project name`);
  if (!html.includes('Kyrylo Kovalchuk')) errors.push(`${file}: missing author`);
  if (!html.includes('book-cover.webp')) errors.push(`${file}: missing book cover reference`);
  if (!html.includes('card-link')) errors.push(`${file}: article cards are not linked`);
  if (!html.includes('/books/short-uk/')) errors.push(`${file}: missing Ukrainian short edition link`);
  if (!html.includes('/books/short-en/')) errors.push(`${file}: missing English short edition link`);
  if (!html.includes('assets/books.css')) errors.push(`${file}: missing short edition styles`);

  articlesData.items.forEach((item,index) => {
    const prefix = lang === 'uk' ? '' : `${lang}/`;
    const articleFile = `${prefix}articles/${item.slug}/index.html`;
    const articleHtml = fs.readFileSync(path.join(dist,articleFile),'utf8');
    if (!articleHtml.includes(`<html lang="${lang}">`)) errors.push(`${articleFile}: wrong html lang`);
    for (const token of ['{{','}}']) if (articleHtml.includes(token)) errors.push(`${articleFile}: unresolved template token ${token}`);
    if (!articleHtml.includes('Kyrylo Kovalchuk')) errors.push(`${articleFile}: missing author`);
    if (!articleHtml.includes('article-body')) errors.push(`${articleFile}: missing article body`);
    const article = loadArticle(item.slug, lang);
    if (!article?.sections?.length) errors.push(`${lang}: missing article translation ${index+1}`);
  });
}

const readers = [
  ['books/short-uk/index.html','uk','ФІЛОСОФІЯ КЄРІКА','КОВАЛЬЧУК КИРИЛО ВОЛОДИМИРОВИЧ'],
  ['books/short-en/index.html','en','THE PHILOSOPHY OF KERIK','Kyrylo Kovalchuk']
];
for (const [file,lang,title,author] of readers) {
  const html = fs.readFileSync(path.join(dist,file),'utf8');
  if (!html.includes(`<html lang="${lang}">`)) errors.push(`${file}: wrong html lang`);
  for (const token of ['{{','}}']) if (html.includes(token)) errors.push(`${file}: unresolved template token ${token}`);
  if (!html.includes(title)) errors.push(`${file}: missing edition title`);
  if (!html.includes(author)) errors.push(`${file}: missing edition author`);
  if (!html.includes('reader-document')) errors.push(`${file}: missing reader document`);
  if (!html.includes('/assets/books.css')) errors.push(`${file}: missing reader styles`);
}

const content = JSON.parse(fs.readFileSync(path.join(root,'src','content.json'),'utf8'));
for (const lang of langs) {
  if (!content[lang]) errors.push(`Missing translation: ${lang}`);
  if (content[lang]?.concepts?.length !== 4) errors.push(`${lang}: concepts count != 4`);
  if (content[lang]?.articles?.length !== articlesData.items.length) errors.push(`${lang}: article card count does not match article content count`);
  if (!articlesData.ui?.[lang]?.read || !articlesData.ui?.[lang]?.back || !articlesData.ui?.[lang]?.intro) errors.push(`${lang}: missing article UI translation`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('All structural, localization, article and short-edition reader checks passed.');
