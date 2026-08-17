import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'src');
const dist=path.join(root,'dist');
const errors=[];
const langs=['uk','en','fi','sv'];
const content=JSON.parse(fs.readFileSync(path.join(src,'content.json'),'utf8'));
const articles=JSON.parse(fs.readFileSync(path.join(src,'articles','index.json'),'utf8'));
const extended=JSON.parse(fs.readFileSync(path.join(src,'extended-content.json'),'utf8'));
const newArticles=JSON.parse(fs.readFileSync(path.join(src,'new-articles.json'),'utf8'));
const exists=f=>fs.existsSync(path.join(dist,f));
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const count=(s,n)=>s.split(n).length-1;
const fail=m=>errors.push(m);
const unresolved=s=>/{{[A-Z0-9_]+}}/.test(s);
const prefix=lang=>lang==='uk'?'':`${lang}/`;
const htmlPath=(lang,route='')=>`${prefix(lang)}${route?`${route.replace(/^\/+|\/+$/g,'')}/`:''}index.html`;

[
  'index.html','en/index.html','fi/index.html','sv/index.html','styles.css','script.js','favicon.svg','site.webmanifest',
  'assets/book-cover.webp','assets/social-card.webp','assets/books.css','assets/1.jpeg','books/short-uk/index.html','books/short-en/index.html',
  'robots.txt','sitemap.xml','_headers','_redirects','404.html'
].forEach(f=>{if(!exists(f))fail(`Missing ${f}`)});

if(articles.items.length!==10)fail(`Expected 10 articles, found ${articles.items.length}`);
if(extended.concepts.length!==4)fail(`Expected 4 concepts, found ${extended.concepts.length}`);
if(extended.chapters.length!==13)fail(`Expected 13 chapters, found ${extended.chapters.length}`);
for(const lang of langs){
  if(!content[lang])fail(`Missing translation: ${lang}`);
  if(!extended.ui[lang])fail(`Missing extended UI: ${lang}`);
  if(extended.principles[lang]?.items?.length!==7)fail(`${lang}: expected 7 principles`);
}

const routes=['articles','concepts','principles','book','references','author','contact','privacy','terms','search'];
for(const lang of langs){
  const homeFile=htmlPath(lang), home=read(homeFile), p=prefix(lang);
  if(!home.includes(`<html lang="${lang}">`))fail(`${homeFile}: wrong html lang`);
  if(unresolved(home))fail(`${homeFile}: unresolved template token`);
  if(!home.includes('Philosophy of Kerik')||!home.includes('Kyrylo Kovalchuk'))fail(`${homeFile}: missing brand/author`);
  if(!home.includes('book-cover.webp'))fail(`${homeFile}: missing book cover`);
  if(count(home,'class="card-link"')!==10)fail(`${homeFile}: expected 10 article cards`);
  if(count(home,'class="concept-row"')!==4)fail(`${homeFile}: expected 4 concept links`);
  if(!home.includes('principles/')||!home.includes('feed.xml')||!home.includes('search'))fail(`${homeFile}: missing discovery links`);
  if(/philosophical project|філософський проєкт|filosofinen projekti|filosofiska projekt/i.test(home))fail(`${homeFile}: stale project wording`);

  for(const route of routes){
    const file=htmlPath(lang,route);
    if(!exists(file)){fail(`Missing ${file}`);continue}
    const html=read(file);
    if(!html.includes(`<html lang="${lang}">`))fail(`${file}: wrong html lang`);
    if(unresolved(html))fail(`${file}: unresolved template token`);
    if(!html.includes('<link rel="canonical"'))fail(`${file}: missing canonical`);
    if(!html.includes('hreflang="en"'))fail(`${file}: missing hreflang`);
    if(!html.includes('application/ld+json'))fail(`${file}: missing structured data`);
  }

  const archive=read(htmlPath(lang,'articles'));
  if(count(archive,'class="archive-card"')!==10||!archive.includes('id="articleFilter"'))fail(`${lang}: incomplete article archive/filter`);
  const concepts=read(htmlPath(lang,'concepts'));
  if(count(concepts,'class="concept-card"')!==4)fail(`${lang}: incomplete concept index`);
  const principles=read(htmlPath(lang,'principles'));
  if(count(principles,'<li><span>')!==7)fail(`${lang}: principles count mismatch`);
  const book=read(htmlPath(lang,'book'));
  if(count(book,'<li><span>')<13||!book.includes('/books/short-uk/')||!book.includes('/books/short-en/'))fail(`${lang}: book structure/readers incomplete`);
  const refs=read(htmlPath(lang,'references'));
  if(count(refs,'class="reference-group"')<5||!refs.includes('NASA')||!refs.includes('World Health Organization'))fail(`${lang}: references incomplete`);
  const author=read(htmlPath(lang,'author'));
  if(!author.includes('Kyrylo Kovalchuk')||!author.includes('linkedin.com/in/kyrylo-kovalchuk-7276461bb'))fail(`${lang}: author profile incomplete`);
  const contact=read(htmlPath(lang,'contact'));
  if(!contact.includes('LinkedIn')||!contact.includes('GitHub'))fail(`${lang}: contact links incomplete`);
  if(/@gmail\.com|@outlook\.com|@hotmail\.com/i.test(contact))fail(`${lang}: private email exposed`);
  if(!/cookie|eväste|cookies/i.test(read(htmlPath(lang,'privacy'))))fail(`${lang}: privacy page does not address cookies`);
  const search=read(htmlPath(lang,'search'));
  if(!search.includes('id="siteSearch"')||!search.includes('search-index.json'))fail(`${lang}: search not wired`);

  const searchFile=`${p}search-index.json`;
  if(!exists(searchFile))fail(`Missing ${searchFile}`);else{
    const records=JSON.parse(read(searchFile));
    if(records.length<19||!records.some(r=>r.url.includes('/concepts/'))||!records.some(r=>r.url.includes('/articles/')))fail(`${searchFile}: incomplete search data`);
  }
  const feedFile=`${p}feed.xml`;
  if(!exists(feedFile))fail(`Missing ${feedFile}`);else{
    const feed=read(feedFile);
    if(!feed.includes('<feed xmlns="http://www.w3.org/2005/Atom">')||count(feed,'<entry>')!==10)fail(`${feedFile}: invalid/incomplete Atom feed`);
  }

  for(const concept of extended.concepts){
    const file=htmlPath(lang,`concepts/${concept.slug}`);
    if(!exists(file)){fail(`Missing ${file}`);continue}
    const html=read(file);
    if(!html.includes(`<html lang="${lang}">`)||!html.includes('prose-section')||!html.includes('related-section')||!html.includes('DefinedTerm'))fail(`${file}: incomplete concept page`);
  }
  for(const item of articles.items){
    const file=htmlPath(lang,`articles/${item.slug}`);
    if(!exists(file)){fail(`Missing ${file}`);continue}
    const html=read(file);
    if(!html.includes(`<html lang="${lang}">`)||unresolved(html)||!html.includes('article-body')||!html.includes('tag-list')||!html.includes('related-section')||!html.includes('"@type":"Article"'))fail(`${file}: incomplete article page`);
    const legacy=path.join(src,'articles',item.slug,`${lang}.json`);
    if(!fs.existsSync(legacy)&&!newArticles[item.slug]?.[lang])fail(`${lang}: missing source for ${item.slug}`);
  }
}

const readers=[['books/short-uk/index.html','uk'],['books/short-en/index.html','en']];
for(const [file,lang] of readers){
  const html=read(file);
  if(!html.includes(`<html lang="${lang}">`)||unresolved(html)||!html.includes('reader-toc')||!html.includes('readingProgressBar')||!html.includes('readerPrev')||!html.includes('readerNext')||!html.includes('chapter-1')||!html.includes('chapter-13'))fail(`${file}: reader navigation incomplete`);
}
const enReader=read('books/short-en/index.html');
if(!enReader.includes('I wrote this book based on my own experience'))fail('English Short Edition: corrected phrase missing');
if(enReader.includes('I wrote this book based on his own experience'))fail('English Short Edition: original typo remains');

const sitemap=read('sitemap.xml');
for(const required of ['/en/references/','/fi/concepts/control-of-reality/','/sv/articles/reality-as-a-model/','/books/short-en/'])if(!sitemap.includes(required))fail(`sitemap.xml missing ${required}`);
if(!read('robots.txt').includes('https://philosophyofkerik.com/sitemap.xml'))fail('robots.txt missing canonical sitemap URL');
if(!read('_headers').includes('Content-Security-Policy'))fail('_headers missing CSP');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('All complete-site checks passed: 4 languages, 10 articles, 4 concepts, 13 chapters, 7 principles, readers, search, feeds, legal pages and SEO.');
