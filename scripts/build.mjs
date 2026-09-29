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
const extended = JSON.parse(fs.readFileSync(path.join(src, 'extended-content.json'), 'utf8'));
const newArticles = JSON.parse(fs.readFileSync(path.join(src, 'new-articles.json'), 'utf8'));
const booksData = JSON.parse(fs.readFileSync(path.join(src, 'books', 'index.json'), 'utf8'));
const template = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
const articleTemplate = fs.readFileSync(path.join(src, 'article-template.html'), 'utf8');
const pageTemplate = fs.readFileSync(path.join(src, 'page-template.html'), 'utf8');
const readerTemplate = fs.readFileSync(path.join(src, 'book-reader-template.html'), 'utf8');
const bookPageTemplate = fs.readFileSync(path.join(src, 'book-page-template.html'), 'utf8');
const siteUrl = (process.env.SITE_URL || 'https://philosophyofkerik.com').replace(/\/$/, '');
const langs = ['uk', 'en', 'fi', 'sv'];

const readerEditions = [
  { lang:'uk', dir:'reader-uk', parts:4, sha256:'0bb5e5bea24501ca7dd220e0b40b71e32e92cb6487b9a04d41d5a70bbedced92', path:'/books/short-uk/', title:'Філософія Кєріка — скорочене видання', heading:'ФІЛОСОФІЯ КЄРІКА', edition:'Скорочене видання', author:'Автор КОВАЛЬЧУК КИРИЛО ВОЛОДИМИРОВИЧ', description:'Скорочене українське видання книги «Філософія Кєріка». Онлайн-читання на офіційному сайті автора.', back:'← До структури книги', note:'Онлайн-версія скороченого видання.', pageLabel:'Сторінка', skip:'Перейти до тексту книги', footerRights:'Усі права захищено.', contents:'Зміст', previous:'Попередня глава', next:'Наступна глава' },
  { lang:'en', dir:'reader-en', parts:3, sha256:'9d01d5850e4f5f672f573ec6e9b0572658ad0c08edbfe499a73af0d7e259baaf', path:'/books/short-en/', title:'The Philosophy of Kerik — Short Edition', heading:'THE PHILOSOPHY OF KERIK', edition:'Short Edition', author:'Kyrylo Kovalchuk', description:'The English Short Edition of The Philosophy of Kerik, available to read online on the author’s official website.', back:'← Back to book structure', note:'Online version of the Short Edition.', pageLabel:'Page', skip:'Skip to the book text', footerRights:'All rights reserved.', contents:'Contents', previous:'Previous chapter', next:'Next chapter' }
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
const themeLabels = { uk:'ТЕМА', en:'THEME', fi:'TEEMA', sv:'TEMA' };
const typeLabels = {
  uk:{article:'Стаття', concept:'Концепція', book:'Книга', page:'Сторінка'},
  en:{article:'Article', concept:'Concept', book:'Book', page:'Page'},
  fi:{article:'Artikkeli', concept:'Käsite', book:'Kirja', page:'Sivu'},
  sv:{article:'Artikel', concept:'Begrepp', book:'Bok', page:'Sida'}
};

fs.rmSync(dist, { recursive:true, force:true });
fs.mkdirSync(dist, { recursive:true });
for (const file of ['styles.css','script.js','favicon.svg','site.webmanifest']) fs.copyFileSync(path.join(src,file), path.join(dist,file));
fs.cpSync(path.join(src,'assets'), path.join(dist,'assets'), { recursive:true });

const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const attr = esc;
const strip = value => String(value ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const rootPath = lang => lang === 'uk' ? '/' : `/${lang}/`;
const routePath = (lang, route='') => `${rootPath(lang)}${route ? `${route.replace(/^\/+|\/+$/g,'')}/` : ''}`;
const articlePath = (lang, slug) => routePath(lang, `articles/${slug}`);
const conceptPath = (lang, slug) => routePath(lang, `concepts/${slug}`);
const absolute = pathname => `${siteUrl}${pathname}`;
const outputDirFor = (lang, route='') => path.join(dist, lang === 'uk' ? '' : lang, ...route.split('/').filter(Boolean));

function replaceTokens(html, tokens) {
  for (const [key,value] of Object.entries(tokens)) html = html.replaceAll(`{{${key}}}`, String(value ?? ''));
  const unresolved = html.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) throw new Error(`Unresolved template tokens: ${[...new Set(unresolved)].join(', ')}`);
  return html;
}
function writeLocalized(lang, route, html) {
  const out = outputDirFor(lang, route);
  fs.mkdirSync(out, { recursive:true });
  fs.writeFileSync(path.join(out,'index.html'), html);
}
function hreflang(routeFn, currentLang) {
  return [
    ...langs.map(code => `<link rel="alternate" hreflang="${code}" href="${absolute(routeFn(code))}">`),
    `<link rel="alternate" hreflang="x-default" href="${absolute(routeFn('en'))}">`,
    `<link rel="canonical" href="${absolute(routeFn(currentLang))}">`
  ].join('\n  ');
}
function urlMeta(pathname, type='website') {
  return [
    `<meta property="og:url" content="${absolute(pathname)}">`,
    `<meta property="og:image" content="${siteUrl}/assets/social-card.webp">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:image" content="${siteUrl}/assets/social-card.webp">`,
    type === 'article' ? `<meta property="article:author" content="Kyrylo Kovalchuk">` : ''
  ].filter(Boolean).join('\n  ');
}
function langLinks(routeFn, currentLang) {
  return langs.map(code => `<a href="${routeFn(code)}" hreflang="${code}" lang="${code}"${code===currentLang?' aria-current="page"':''}>${content[code].label}</a>`).join('');
}
function commonUrls(lang) {
  return {
    HOME_URL:rootPath(lang), BOOK_URL:routePath(lang,'books'), ARTICLES_URL:routePath(lang,'articles'), CONCEPTS_URL:routePath(lang,'concepts'), AUTHOR_URL:routePath(lang,'author'), SEARCH_URL:routePath(lang,'search'),
    CONTACT_URL:routePath(lang,'contact'), PRIVACY_URL:routePath(lang,'privacy'), TERMS_URL:routePath(lang,'terms'), FEED_URL:routePath(lang,'feed.xml').replace(/\/$/,'')
  };
}
function commonTokens(lang) {
  const t=content[lang], ui=extended.ui[lang], urls=commonUrls(lang);
  return {
    ...urls, LANG:lang, LOCALE:t.locale, SKIP:esc(t.skip), MENU:esc(t.menu), LANGUAGE:esc(t.language), NAV_BOOK:esc(t.nav[0]), NAV_ARTICLES:esc(t.nav[1]), NAV_CONCEPTS:esc(t.nav[2]), NAV_AUTHOR:esc(t.nav[3]), NAV_SEARCH:esc(ui.search),
    FOOTER_RIGHTS:esc(t.footerRights), CONTACT_LABEL:esc(ui.contact), PRIVACY_LABEL:esc(ui.privacy), TERMS_LABEL:esc(ui.terms), BACK_HOME:esc(ui.backHome),
    FEED_LINK:`<link rel="alternate" type="application/atom+xml" title="Philosophy of Kerik" href="${urls.FEED_URL}">`
  };
}
function loadArticle(slug, lang) {
  const legacy = path.join(src,'articles',slug,`${lang}.json`);
  if (fs.existsSync(legacy)) return JSON.parse(fs.readFileSync(legacy,'utf8'));
  const article = newArticles[slug]?.[lang];
  if (!article) throw new Error(`Missing article: ${slug}/${lang}`);
  return article;
}
function articleMeta(slug) {
  const meta = articlesData.items.find(item => item.slug === slug);
  if (!meta) throw new Error(`Missing article metadata: ${slug}`);
  return meta;
}
function articleTitle(slug, lang) { return articleMeta(slug).titles[lang]; }
function articleTags(slug, lang) { return articleMeta(slug).tags[lang] || []; }
function renderArticleBody(article) {
  return article.sections.map(section => `<section class="article-section"><h2>${esc(section.heading)}</h2>${section.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
}
function articleCard(slug, lang, compact=false) {
  const title=articleTitle(slug,lang), tags=articleTags(slug,lang), url=articlePath(lang,slug), read=articlesData.ui[lang].read;
  return `<article class="${compact?'related-card':'archive-card'}" data-title="${attr(title.toLowerCase())}" data-tags="${attr(tags.join(' ').toLowerCase())}"><a href="${url}"><div class="tag-list">${tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><h3>${esc(title)}</h3>${compact?'':`<span class="coming">${esc(read)} →</span>`}</a></article>`;
}
function conceptMeta(slug) { const c=extended.concepts.find(x=>x.slug===slug); if(!c) throw new Error(`Missing concept ${slug}`); return c; }
function relatedConceptSlugs(slug) {
  const map={
    'individuality-and-system-pressure':['individuality','systems-and-autonomy'],
    'money-resources-and-freedom':['systems-and-autonomy','control-of-reality'],
    'technology-attention-and-autonomy':['control-of-reality','systems-and-autonomy'],
    'conscious-choice-and-automatic-reaction':['conscious-decision','control-of-reality'],
    'attention-as-a-limited-resource':['control-of-reality','conscious-decision'],
    'technology-as-an-amplifier':['systems-and-autonomy','control-of-reality'],
    'wealth-as-a-system-not-a-number':['systems-and-autonomy','control-of-reality'],
    'observer-position-and-group-influence':['systems-and-autonomy','individuality'],
    'time-as-a-nonrenewable-resource':['conscious-decision','control-of-reality'],
    'reality-as-a-model':['control-of-reality','conscious-decision']
  };
  return map[slug] || ['control-of-reality'];
}
function relatedArticles(slug, lang, count=2) {
  const own=new Set(articleTags(slug,lang));
  return articlesData.items.filter(x=>x.slug!==slug).map(x=>({slug:x.slug, score:articleTags(x.slug,lang).filter(t=>own.has(t)).length})).sort((a,b)=>b.score-a.score).slice(0,count).map(x=>x.slug);
}
function basePageSchema(type, lang, pathname, title, description, extra={}) {
  return {'@context':'https://schema.org','@type':type,name:title,description,inLanguage:lang,url:absolute(pathname),isPartOf:{'@type':'WebSite',name:'Philosophy of Kerik',url:absolute(rootPath(lang))},...extra};
}
function renderPage(lang, route, title, lead, body, {bodyClass='standard-page', schemaType='WebPage', schemaExtra={}}={}) {
  const common=commonTokens(lang), pathname=routePath(lang,route), routeFn=code=>routePath(code,route);
  const schema=basePageSchema(schemaType,lang,pathname,title,lead,schemaExtra);
  const html=replaceTokens(pageTemplate,{
    ...common, TITLE:esc(title), DESCRIPTION:esc(strip(lead).slice(0,260)), OG_TYPE:'website', URL_META:urlMeta(pathname), HREFLANG:hreflang(routeFn,lang), STRUCTURED_DATA:JSON.stringify(schema).replaceAll('<','\\u003c'), LANG_LINKS:langLinks(routeFn,lang), PAGE_TITLE:esc(title), PAGE_LEAD:esc(lead), PAGE_BODY:body, BODY_CLASS:bodyClass
  });
  writeLocalized(lang,route,html);
}
function renderSections(sections) { return sections.map(s=>`<section class="prose-section"><h2>${esc(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join(''); }

function bookBySlug(slug) {
  const book=booksData.books.find(item=>item.slug===slug);
  if(!book) throw new Error(`Missing book data: ${slug}`);
  return book;
}
function bookPath(lang,slug){ return routePath(lang,`books/${slug}`); }
function bookCoverFor(book,lang){ return book.cover?.[lang] || book.cover?.en || book.cover?.uk || '/assets/book-cover.webp'; }
function renderBookCard(book,lang,{compact=false}={}){
  const b=book[lang], ui=booksData.ui[lang], label=book.kind==='primary'?ui.primaryLabel:ui.secondaryLabel;
  const level=compact?'h3':'h2';
  return `<a class="book-catalog-card ${book.kind==='primary'?'is-primary':'is-secondary'}${compact?' is-compact':''}" href="${bookPath(lang,book.slug)}"><figure class="book-catalog-cover"><img src="${attr(bookCoverFor(book,lang))}" alt="${attr(b.title)}" loading="lazy" decoding="async"></figure><div class="book-catalog-copy"><p class="kicker">${esc(label)}</p><${level}>${esc(b.title)}</${level}><p class="book-catalog-subtitle">${esc(b.subtitle)}</p><p class="book-catalog-description">${esc(b.description)}</p><div class="book-language-line"><span>${esc(ui.ukEdition)}</span><span>${esc(ui.enEdition)}</span></div><b class="book-catalog-action">${esc(ui.explore)} →</b></div></a>`;
}
function renderBookPage(lang,book,body){
  const t=content[lang], ui=booksData.ui[lang], common=commonTokens(lang), b=book[lang], pathname=bookPath(lang,book.slug), routeFn=code=>bookPath(code,book.slug);
  const cover=bookCoverFor(book,lang);
  const bookSchema={'@context':'https://schema.org','@type':'Book','@id':`${absolute(pathname)}#book`,name:b.title,alternateName:book.slug==='the-tenth-kilometer'?['Десятий кілометр','The Tenth Kilometer']:['Філософія Кєріка','The Philosophy of Kerik','Philosophy of Kerik'],description:b.description,inLanguage:book.availableLanguages,url:absolute(pathname),image:absolute(cover),copyrightYear:2026,author:{'@type':'Person','@id':`${siteUrl}/#author`,name:'Kyrylo Kovalchuk',alternateName:'Kerik'}};
  const editions=`<span>${esc(ui.ukEdition)}</span><span>${esc(ui.enEdition)}</span>`;
  const heroActions=book.slug==='philosophy-of-kerik'
    ? `<div class="reader-links"><a class="primary" href="/books/short-uk/">${esc(editionLabels[lang][1])}</a><a class="secondary" href="/books/short-en/">${esc(editionLabels[lang][2])}</a></div>`
    : `<p class="quiet-note">${esc(ui.purchaseNote)}</p>`;
  const html=replaceTokens(bookPageTemplate,{
    ...common,LANG:lang,LOCALE:t.locale,TITLE:esc(`${b.title} — ${b.subtitle}`),DESCRIPTION:esc(b.description),URL_META:urlMeta(pathname),HREFLANG:hreflang(routeFn,lang),STRUCTURED_DATA:JSON.stringify(bookSchema).replaceAll('<','\\u003c'),LANG_LINKS:langLinks(routeFn,lang),
    BOOKS_URL:routePath(lang,'books'),BACK_TO_BOOKS:esc(ui.backToBooks),BOOK_KICKER:esc(book.kind==='primary'?ui.primaryLabel:ui.secondaryLabel),BOOK_TITLE:esc(b.title),BOOK_SUBTITLE:esc(b.subtitle),BOOK_DESCRIPTION:esc(b.description),AUTHOR_LABEL:esc(ui.authorLabel),BOOK_AUTHOR:'Kerik',AVAILABLE_EDITIONS_LABEL:esc(ui.availableEditions),EDITION_BADGES:editions,BOOK_COVER_SRC:attr(cover),BOOK_COVER_ALT:attr(`${b.title} — ${b.subtitle}`),BOOK_HERO_ACTIONS:heroActions,BOOK_BODY:body
  });
  writeLocalized(lang,`books/${book.slug}`,html);
}

for (const lang of langs) {
  const t=content[lang], ui=extended.ui[lang], common=commonTokens(lang), pathname=rootPath(lang), routeFn=code=>rootPath(code);
  const homeArticleCards=articlesData.items.map((item,index)=>`<article><a class="card-link" href="${articlePath(lang,item.slug)}"><p>${esc(themeLabels[lang])} ${String(index+1).padStart(2,'0')}</p><h3>${esc(item.titles[lang])}</h3><div class="tag-list">${item.tags[lang].slice(0,2).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><span class="coming">${esc(articlesData.ui[lang].read)} →</span></a></article>`).join('');
  const conceptRows=extended.concepts.map((c,i)=>`<a class="concept-row" href="${conceptPath(lang,c.slug)}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(c[lang].title)}</span><em>→</em></a>`).join('');
  const editions=t.editions.map((item,index)=>{ const href=editionLinks[index]; const label=editionLabels[lang]?.[index]||item; return href?`<li class="edition-link"><a href="${href}"><span>${esc(label)}</span><b>${esc(editionActions[lang])}</b></a></li>`:`<li>${esc(label)}</li>`; }).join('');
  const author=extended.author[lang];
  const philosophyBook=bookBySlug('philosophy-of-kerik'), tenthBook=bookBySlug('the-tenth-kilometer');
  const otherBookCard=renderBookCard(tenthBook,lang,{compact:true});
  const structured={'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':`${absolute(pathname)}#website`,name:'Philosophy of Kerik',url:absolute(pathname),inLanguage:lang,potentialAction:{'@type':'SearchAction',target:`${absolute(routePath(lang,'search'))}?q={search_term_string}`,'query-input':'required name=search_term_string'}},
    {'@type':'Book','@id':`${siteUrl}/#philosophy-book`,name:philosophyBook[lang].title,alternateName:['Філософія Кєріка','The Philosophy of Kerik','Philosophy of Kerik'],author:{'@id':`${siteUrl}/#author`},image:absolute(bookCoverFor(philosophyBook,lang)),url:absolute(bookPath(lang,philosophyBook.slug)),inLanguage:['uk','en'],copyrightYear:2026},
    {'@type':'Book','@id':`${siteUrl}/#tenth-kilometer-book`,name:tenthBook[lang].title,alternateName:['Десятий кілометр','The Tenth Kilometer'],author:{'@id':`${siteUrl}/#author`},image:absolute(bookCoverFor(tenthBook,lang)),url:absolute(bookPath(lang,tenthBook.slug)),inLanguage:['uk','en'],copyrightYear:2026},
    {'@type':'Person','@id':`${siteUrl}/#author`,name:'Kyrylo Kovalchuk',alternateName:'Kerik',url:absolute(routePath(lang,'author')),sameAs:[extended.social.linkedin,extended.social.github]}
  ]};
  const homeTokens={
    ...common, TITLE:esc(t.title), DESCRIPTION:esc(t.description), URL_META:urlMeta(pathname), HREFLANG:hreflang(routeFn,lang), ASSET_PREFIX:lang==='uk'?'':'../', LANG_LINKS:langLinks(routeFn,lang), STRUCTURED_DATA:JSON.stringify(structured).replaceAll('<','\\u003c'),
    BOOKS_PAGE_URL:common.BOOK_URL, BOOK_PAGE_URL:bookPath(lang,'philosophy-of-kerik'), ARTICLES_PAGE_URL:common.ARTICLES_URL, CONCEPTS_PAGE_URL:common.CONCEPTS_URL, AUTHOR_PAGE_URL:common.AUTHOR_URL,
    HERO_TITLE:esc(t.heroTitle), HERO_LEAD:esc(t.heroLead), HERO_BOOK:esc(t.heroBook), PRINCIPLES_URL:routePath(lang,'principles'), PRINCIPLES_LABEL:esc(ui.principles),
    BOOK_HEADING:esc(t.bookHeading), BOOK_KICKER:esc(t.bookKicker), BOOK_TITLE:esc(t.bookTitle), BOOK_TEXT:esc(t.bookText), BOOK_COVER_ALT:esc(`${t.bookHeading}: ${t.bookTitle}`), EDITION_ITEMS:editions, BOOK_NOTE:esc(bookNotes[lang]), BOOK_STRUCTURE_LABEL:esc(ui.bookStructure), REFERENCES_URL:routePath(lang,'references'), REFERENCES_LABEL:esc(ui.references),
    OTHER_BOOKS_HEADING:esc(booksData.ui[lang].otherBooks), OTHER_BOOKS_CARD:otherBookCard, ALL_BOOKS_LABEL:esc(booksData.ui[lang].allBooks),
    ARTICLES_HEADING:esc(t.articlesHeading), ARTICLES_INTRO:esc(articlesData.ui[lang].intro), ARTICLE_CARDS:homeArticleCards, ALL_ARTICLES_LABEL:esc(ui.allArticles),
    CONCEPTS_HEADING:esc(t.conceptsHeading), CONCEPTS_INTRO:esc(t.conceptsIntro), CONCEPT_ROWS:conceptRows, ALL_CONCEPTS_LABEL:esc(ui.allConcepts),
    EXPLORE_LABEL:esc(ui.navMore), PRINCIPLES_TEASER:esc(extended.principles[lang].lead), BOOK_STRUCTURE_TEASER:esc(extended.bookPage[lang].lead), REFERENCES_TEASER:esc(extended.references[lang].lead),
    AUTHOR_HEADING:esc(t.authorHeading), AUTHOR_KICKER:esc(lang==='uk'?'АВТОР':lang==='en'?'AUTHOR':lang==='fi'?'KIRJOITTAJA':'FÖRFATTARE'), AUTHOR_NAME:'Kyrylo Kovalchuk', AUTHOR_TEXT:esc(author.lead), AUTHOR_PAGE_LABEL:esc(ui.authorPage),
    SUBSCRIBE_TITLE:esc(ui.subscribeTitle), SUBSCRIBE_TEXT:esc(ui.subscribeText), SUBSCRIBE_ACTION:esc(ui.subscribeAction)
  };
  writeLocalized(lang,'',replaceTokens(template,homeTokens));
}

for (const lang of langs) {
  const ui=extended.ui[lang], t=content[lang];
  const articleArchive=`<div class="filter-bar"><label for="articleFilter">${esc(ui.search)}</label><input id="articleFilter" type="search" placeholder="${attr(ui.searchPlaceholder)}" autocomplete="off"></div><div class="archive-grid" id="articleArchive">${articlesData.items.map(item=>articleCard(item.slug,lang)).join('')}</div>`;
  renderPage(lang,'articles',articlesData.ui[lang].all,articlesData.ui[lang].intro,articleArchive,{bodyClass:'archive-page',schemaType:'CollectionPage'});

  const conceptIndex=`<div class="concept-card-grid">${extended.concepts.map(c=>`<a class="concept-card" href="${conceptPath(lang,c.slug)}"><h2>${esc(c[lang].title)}</h2><p>${esc(c[lang].lead)}</p><span>${esc(ui.readMore)} →</span></a>`).join('')}</div>`;
  renderPage(lang,'concepts',t.conceptsHeading,t.conceptsIntro,conceptIndex,{bodyClass:'concept-index',schemaType:'CollectionPage'});

  const p=extended.principles[lang];
  const principlesBody=`<ol class="principles-list">${p.items.map((item,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><p>${esc(item)}</p></li>`).join('')}</ol><div class="page-callout"><a class="secondary" href="${bookPath(lang,'philosophy-of-kerik')}">${esc(ui.bookStructure)} →</a></div>`;
  renderPage(lang,'principles',p.title,p.lead,principlesBody,{bodyClass:'principles-page'});

  const booksUi=booksData.ui[lang];
  const philosophyBook=bookBySlug('philosophy-of-kerik');
  const tenthBook=bookBySlug('the-tenth-kilometer'), tenth=tenthBook[lang];
  const booksIndexBody=`<div class="book-catalog">${booksData.books.map(book=>renderBookCard(book,lang)).join('')}</div>`;
  const itemList={'@type':'ItemList',itemListElement:booksData.books.map((book,index)=>({'@type':'ListItem',position:index+1,url:absolute(bookPath(lang,book.slug)),name:book[lang].title}))};
  renderPage(lang,'books',booksUi.indexTitle,booksUi.indexLead,booksIndexBody,{bodyClass:'books-index-page',schemaType:'CollectionPage',schemaExtra:{mainEntity:itemList}});

  const bp=extended.bookPage[lang];
  const philosophyBody=`<section class="book-detail-section"><h2>${esc(booksUi.structureHeading)}</h2><ol class="chapter-list">${extended.chapters.map(ch=>`<li><span>${String(ch.n).padStart(2,'0')}</span><div><h2>${esc(ch[lang].title)}</h2><p>${esc(ch[lang].summary)}</p></div></li>`).join('')}</ol><p class="book-note standalone-note">${esc(bp.note)}</p></section>`;
  renderBookPage(lang,philosophyBook,philosophyBody);

  const journeyUnits=lang==='uk'?'метрів':lang==='en'?'metres':lang==='fi'?'metriä':'meter';
  const journeyKm=lang==='uk'?'кілометрів':lang==='en'?'kilometres':lang==='fi'?'kilometriä':'kilometer';
  const tenthBody=`<section class="book-journey" aria-label="${attr(booksUi.journeyHeading)}"><div class="book-journey-point"><strong>500</strong><span>${esc(journeyUnits)}</span></div><div class="book-journey-arrow" aria-hidden="true">→</div><div class="book-journey-point"><strong>10</strong><span>${esc(journeyKm)}</span></div><p class="book-journey-text">${esc(tenth.journeyText)}</p></section><section class="book-detail-section"><h2>${esc(booksUi.aboutHeading)}</h2>${tenth.about.map(p=>`<p>${esc(p)}</p>`).join('')}</section><section class="book-detail-section"><h2>${esc(booksUi.contentsHeading)}</h2><ol class="book-toc">${tenth.chapters.map(title=>`<li>${esc(title)}</li>`).join('')}</ol></section><section class="book-detail-section"><h2>${esc(booksUi.medicalHeading)}</h2><p>${esc(tenth.medicalText)}</p><p class="quiet-note">${esc(booksUi.availabilityNote)}</p><aside class="book-disclaimer"><strong>${esc(booksUi.disclaimerHeading)}</strong><p>${esc(tenth.disclaimer)}</p></aside></section>`;
  renderBookPage(lang,tenthBook,tenthBody);

  const ref=extended.references[lang];
  const refsBody=Object.entries(ref.groups).map(([key,label])=>`<section class="reference-group"><h2>${esc(label)}</h2><ol>${extended.references.items.filter(x=>x.group===key).map(x=>`<li><a href="${attr(x.url)}" rel="noopener noreferrer"><strong>${esc(x.title)}</strong><span>${esc(x.source)}${x.year?` · ${esc(x.year)}`:''}</span></a></li>`).join('')}</ol></section>`).join('');
  renderPage(lang,'references',ref.title,ref.lead,refsBody,{bodyClass:'references-page',schemaType:'CollectionPage'});

  const a=extended.author[lang];
  const authorBookCards=booksData.books.map(book=>`<a class="author-book-card" href="${bookPath(lang,book.slug)}"><small>${esc(book.kind==='primary'?booksData.ui[lang].primaryLabel:booksData.ui[lang].secondaryLabel)}</small><h3>${esc(book[lang].title)}</h3><p>${esc(book[lang].description)}</p></a>`).join('');
  const authorBody=`<div class="author-page-grid"><img src="/assets/1.jpeg" width="300" height="375" alt="Kyrylo Kovalchuk"><div>${a.paragraphs.map(x=>`<p>${esc(x)}</p>`).join('')}<h2>${esc(a.links)}</h2><div class="profile-links"><a class="secondary" href="${attr(extended.social.linkedin)}" rel="me noopener noreferrer">LinkedIn ↗</a><a class="secondary" href="${attr(extended.social.github)}" rel="me noopener noreferrer">GitHub ↗</a></div></div></div><section class="author-books"><h2>${esc(booksData.ui[lang].indexTitle)}</h2><div class="author-books-grid">${authorBookCards}</div></section>`;
  const person={'@type':'Person','@id':`${siteUrl}/#author`,name:'Kyrylo Kovalchuk',description:a.lead,sameAs:[extended.social.linkedin,extended.social.github]};
  renderPage(lang,'author',a.title,a.lead,authorBody,{bodyClass:'author-page-detail',schemaType:'ProfilePage',schemaExtra:{mainEntity:person}});

  const c=extended.contact[lang];
  const contactBody=`<div class="contact-grid"><a class="contact-card" href="${attr(extended.social.linkedin)}" rel="me noopener noreferrer"><strong>${esc(c.linkedin)}</strong><span>${esc(extended.social.linkedin)}</span></a><a class="contact-card" href="${attr(extended.social.github)}" rel="me noopener noreferrer"><strong>${esc(c.github)}</strong><span>${esc(extended.social.github)}</span></a></div><p class="quiet-note">${esc(c.note)}</p>`;
  renderPage(lang,'contact',c.title,c.lead,contactBody,{bodyClass:'contact-page',schemaType:'ContactPage'});

  const priv=extended.privacy[lang];
  renderPage(lang,'privacy',priv.title,priv.lead,renderSections(priv.sections),{bodyClass:'legal-page'});
  const terms=extended.terms[lang];
  renderPage(lang,'terms',terms.title,terms.lead,renderSections(terms.sections),{bodyClass:'legal-page'});

  const searchBody=`<form class="search-form" id="siteSearchForm" role="search"><label for="siteSearch">${esc(ui.search)}</label><input id="siteSearch" name="q" type="search" placeholder="${attr(ui.searchPlaceholder)}" autocomplete="off" data-index="${routePath(lang,'search-index.json').replace(/\/$/,'')}"><button type="submit">${esc(ui.search)}</button></form><p class="search-status" id="searchStatus" data-empty="${attr(ui.searchEmpty)}" data-none="${attr(ui.searchNoResults)}">${esc(ui.searchEmpty)}</p><div class="search-results" id="searchResults" aria-live="polite"></div>`;
  renderPage(lang,'search',ui.search,ui.searchPlaceholder,searchBody,{bodyClass:'search-page',schemaType:'SearchResultsPage'});
}

for (const c of extended.concepts) {
  for (const lang of langs) {
    const ui=extended.ui[lang], data=c[lang];
    const candidate=articlesData.items.filter(item=>articleTags(item.slug,lang).some(tag=>data.title.toLowerCase().includes(tag.toLowerCase()) || item.tags.en.some(t=>['Autonomy','Choice','Systems','Individuality','Reality'].includes(t)))).slice(0,3);
    const related=candidate.length?candidate:articlesData.items.slice(0,3);
    const body=`${renderSections(data.sections)}<aside class="related-section inline-related"><h2>${esc(ui.related)}</h2><div class="related-grid">${related.map(item=>articleCard(item.slug,lang,true)).join('')}</div></aside>`;
    const route=`concepts/${c.slug}`, pathname=conceptPath(lang,c.slug);
    const schema={'@type':'DefinedTerm',name:data.title,description:data.lead,url:absolute(pathname),inDefinedTermSet:{'@type':'DefinedTermSet',name:'Philosophy of Kerik — Concepts',url:absolute(routePath(lang,'concepts'))}};
    renderPage(lang,route,data.title,data.lead,body,{bodyClass:'concept-page',schemaType:'WebPage',schemaExtra:{mainEntity:schema}});
  }
}

for (const item of articlesData.items) {
  for (const lang of langs) {
    const ui=extended.ui[lang], common=commonTokens(lang), article=loadArticle(item.slug,lang), title=item.titles[lang], pathname=articlePath(lang,item.slug), routeFn=code=>articlePath(code,item.slug);
    const tags=item.tags[lang];
    const relatedArticleHtml=relatedArticles(item.slug,lang).map(slug=>articleCard(slug,lang,true)).join('');
    const relatedConceptHtml=relatedConceptSlugs(item.slug).slice(0,1).map(slug=>{const c=conceptMeta(slug);return `<article class="related-card concept-related"><a href="${conceptPath(lang,slug)}"><span class="related-type">${esc(typeLabels[lang].concept)}</span><h3>${esc(c[lang].title)}</h3></a></article>`;}).join('');
    const schema={'@context':'https://schema.org','@type':'Article',headline:title,description:article.lead,inLanguage:lang,datePublished:articlesData.published,dateModified:articlesData.updated||articlesData.published,keywords:tags,about:tags.map(name=>({'@type':'Thing',name})),author:{'@type':'Person','@id':`${siteUrl}/#author`,name:'Kyrylo Kovalchuk'},publisher:{'@type':'Person','@id':`${siteUrl}/#author`,name:'Kyrylo Kovalchuk'},mainEntityOfPage:{'@type':'WebPage','@id':absolute(pathname)},image:`${siteUrl}/assets/social-card.webp`};
    const html=replaceTokens(articleTemplate,{
      ...common, LANG_LINKS:langLinks(routeFn,lang), TITLE:esc(title), DESCRIPTION:esc(article.lead), URL_META:urlMeta(pathname,'article')+`\n  <meta property="article:published_time" content="${articlesData.published}">`, HREFLANG:hreflang(routeFn,lang), STRUCTURED_DATA:JSON.stringify(schema).replaceAll('<','\\u003c'),
      ARTICLE_BACK:esc(articlesData.ui[lang].back), ARTICLE_KICKER:`${esc(themeLabels[lang])} ${String(articlesData.items.indexOf(item)+1).padStart(2,'0')}`, ARTICLE_TITLE:esc(title), ARTICLE_LEAD:esc(article.lead), ARTICLE_BODY:renderArticleBody(article), ARTICLE_TAGS:tags.map(tag=>`<span>${esc(tag)}</span>`).join(''), TOPICS_LABEL:esc(ui.topics), RELATED_LABEL:esc(ui.related), RELATED_ITEMS:relatedArticleHtml+relatedConceptHtml
    });
    writeLocalized(lang,`articles/${item.slug}`,html);
  }
}

function readBookText(reader) {
  const encoded=Array.from({length:reader.parts},(_,index)=>fs.readFileSync(path.join(src,'books',reader.dir,`part-${String(index+1).padStart(2,'0')}.b64gz`),'utf8')).join('').replace(/\s+/g,'');
  const raw=zlib.gunzipSync(Buffer.from(encoded,'base64'));
  const digest=crypto.createHash('sha256').update(raw).digest('hex');
  if(digest!==reader.sha256) throw new Error(`Book text integrity check failed for ${reader.path}: ${digest}`);
  let text=raw.toString('utf8');
  if(reader.lang==='en') text=text.replace('I wrote this book based on his own experience','I wrote this book based on my own experience');
  return text;
}
function renderReader(text, reader) {
  const pages=text.split('\f'); if(pages.at(-1)==='') pages.pop();
  const toc=[];
  const html=pages.map((page,index)=>{
    const match=page.match(reader.lang==='en'?/^Chapter\s+(\d+)\.\s*(.+)$/m:/^Глава\s+(\d+)\.\s*(.+)$/m);
    let id=`reader-page-${index+1}`, chapterAttr='';
    if(match){ const n=Number(match[1]); id=`chapter-${n}`; toc.push({n,title:match[2].trim(),id}); chapterAttr=` data-chapter="${n}"`; }
    return `<section class="reader-page" id="${id}"${chapterAttr} aria-label="${esc(reader.pageLabel)} ${index+1}"><pre>${esc(page)}</pre></section>`;
  }).join('\n');
  return {html,toc};
}
for(const reader of readerEditions){
  const text=readBookText(reader), rendered=renderReader(text,reader), pathname=reader.path, lang=reader.lang;
  const structured={'@context':'https://schema.org','@type':'Book',name:reader.heading,author:{'@type':'Person',name:'Kyrylo Kovalchuk'},inLanguage:lang,url:absolute(pathname),isAccessibleForFree:true};
  const readerHtml=replaceTokens(readerTemplate,{
    LANG:lang,TITLE:esc(reader.title),DESCRIPTION:esc(reader.description),URL_META:urlMeta(pathname),HREFLANG:`<link rel="canonical" href="${absolute(pathname)}">`,STRUCTURED_DATA:JSON.stringify(structured).replaceAll('<','\\u003c'),SKIP:esc(reader.skip),HOME_URL:rootPath(lang),BOOK_PAGE_URL:bookPath(lang,'philosophy-of-kerik'),BACK_LABEL:esc(reader.back),EDITION_LABEL:esc(reader.edition),TITLE_HEADING:esc(reader.heading),AUTHOR_LABEL:esc(reader.author),READER_NOTE:esc(reader.note),BOOK_PAGES:rendered.html,CONTENTS_LABEL:esc(reader.contents),TOC_ITEMS:rendered.toc.map(ch=>`<li><a href="#${ch.id}"><span>${String(ch.n).padStart(2,'0')}</span>${esc(ch.title)}</a></li>`).join(''),PREVIOUS_LABEL:esc(reader.previous),NEXT_LABEL:esc(reader.next),FOOTER_RIGHTS:esc(reader.footerRights)
  });
  const out=path.join(dist,...pathname.split('/').filter(Boolean)); fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,'index.html'),readerHtml);
}

for(const lang of langs){
  const records=[];
  for(const item of articlesData.items){const a=loadArticle(item.slug,lang);records.push({type:typeLabels[lang].article,title:item.titles[lang],url:articlePath(lang,item.slug),excerpt:a.lead,tags:item.tags[lang]});}
  for(const c of extended.concepts) records.push({type:typeLabels[lang].concept,title:c[lang].title,url:conceptPath(lang,c.slug),excerpt:c[lang].lead,tags:[]});
  records.push({type:typeLabels[lang].page,title:booksData.ui[lang].indexTitle,url:routePath(lang,'books'),excerpt:booksData.ui[lang].indexLead,tags:[]});
  for(const book of booksData.books) records.push({type:typeLabels[lang].book,title:`${book[lang].title} — ${book[lang].subtitle}`,url:bookPath(lang,book.slug),excerpt:book[lang].description,tags:book[lang].tags||[]});
  records.push({type:typeLabels[lang].page,title:extended.principles[lang].title,url:routePath(lang,'principles'),excerpt:extended.principles[lang].lead,tags:[]});
  records.push({type:typeLabels[lang].page,title:extended.references[lang].title,url:routePath(lang,'references'),excerpt:extended.references[lang].lead,tags:[]});
  records.push({type:typeLabels[lang].page,title:extended.author[lang].title,url:routePath(lang,'author'),excerpt:extended.author[lang].lead,tags:[]});
  records.push({type:typeLabels[lang].page,title:extended.contact[lang].title,url:routePath(lang,'contact'),excerpt:extended.contact[lang].lead,tags:[]});
  const dir=outputDirFor(lang,''); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'search-index.json'),JSON.stringify(records));
}

function atom(lang){
  const t=content[lang], feedUrl=absolute(routePath(lang,'feed.xml').replace(/\/$/,''));
  const entries=articlesData.items.map(item=>{const a=loadArticle(item.slug,lang), url=absolute(articlePath(lang,item.slug));return `<entry><title>${esc(item.titles[lang])}</title><id>${url}</id><link href="${url}"/><updated>${articlesData.updated || articlesData.published}T00:00:00Z</updated><summary>${esc(a.lead)}</summary></entry>`;}).join('');
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Philosophy of Kerik — ${esc(t.articlesHeading)}</title><id>${feedUrl}</id><link href="${feedUrl}" rel="self"/><link href="${absolute(rootPath(lang))}"/><updated>${articlesData.updated || articlesData.published}T00:00:00Z</updated><author><name>Kyrylo Kovalchuk</name></author>${entries}</feed>`;
}
for(const lang of langs){ const dir=outputDirFor(lang,''); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'feed.xml'),atom(lang)); }

fs.writeFileSync(path.join(dist,'404.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 — Philosophy of Kerik</title><link rel="stylesheet" href="/styles.css?v=20260817-complete1"></head><body><main class="error-page"><p class="eyebrow">404</p><h1>Page not found</h1><a class="primary" href="/en/">Back to Philosophy of Kerik</a></main></body></html>`);
fs.writeFileSync(path.join(dist,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'\n`);
fs.writeFileSync(path.join(dist,'_redirects'),`/ua/* /:splat 301\n/uk/* /:splat 301\n/book /books/philosophy-of-kerik/ 301\n/book/ /books/philosophy-of-kerik/ 301\n/en/book /en/books/philosophy-of-kerik/ 301\n/en/book/ /en/books/philosophy-of-kerik/ 301\n/fi/book /fi/books/philosophy-of-kerik/ 301\n/fi/book/ /fi/books/philosophy-of-kerik/ 301\n/sv/book /sv/books/philosophy-of-kerik/ 301\n/sv/book/ /sv/books/philosophy-of-kerik/ 301\n`);
const sitemapPaths=[];
for(const lang of langs){
  sitemapPaths.push(rootPath(lang));
  for(const route of ['articles','concepts','principles','books','references','author','contact','privacy','terms','search']) sitemapPaths.push(routePath(lang,route));
  for(const book of booksData.books) sitemapPaths.push(bookPath(lang,book.slug));
  for(const c of extended.concepts) sitemapPaths.push(conceptPath(lang,c.slug));
  for(const item of articlesData.items) sitemapPaths.push(articlePath(lang,item.slug));
}
for(const reader of readerEditions) sitemapPaths.push(reader.path);
const sitemap=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(sitemapPaths)].map(p=>`<url><loc>${absolute(p)}</loc><lastmod>${articlesData.updated || articlesData.published}</lastmod></url>`).join('')}</urlset>`;
fs.writeFileSync(path.join(dist,'sitemap.xml'),sitemap);
fs.writeFileSync(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);

console.log(`Built Philosophy of Kerik: ${articlesData.items.length} articles × ${langs.length} languages, ${extended.concepts.length} concept pages × ${langs.length}, ${booksData.books.length} books × ${langs.length}, core pages, search, feeds, readers and SEO files.`);
