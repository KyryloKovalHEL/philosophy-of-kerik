import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');
const siteUrl = 'https://philosophyofkerik.com';
const authorId = `${siteUrl}/#author`;
const philosophyId = `${siteUrl}/#philosophy-of-kerik`;
const profileUrls = [
  'https://www.linkedin.com/in/kyrylo-kovalchuk-7276461bb/',
  'https://github.com/KyryloKovalHEL'
];

const pages = [
  {
    lang: 'uk',
    file: path.join(dist, 'index.html'),
    url: `${siteUrl}/`,
    authorUrl: `${siteUrl}/author/`,
    name: 'Філософія Кєріка',
    description: 'Філософія Кєріка — авторська філософська система Кирила Ковальчука про індивідуальність, вибір, свободу, технології, багатство та контроль власної реальності.'
  },
  {
    lang: 'en',
    file: path.join(dist, 'en', 'index.html'),
    url: `${siteUrl}/en/`,
    authorUrl: `${siteUrl}/en/author/`,
    name: 'Philosophy of Kerik',
    description: 'Philosophy of Kerik is Kyrylo Kovalchuk’s philosophical system about individuality, choice, freedom, technology, wealth and control of one’s own reality.'
  },
  {
    lang: 'fi',
    file: path.join(dist, 'fi', 'index.html'),
    url: `${siteUrl}/fi/`,
    authorUrl: `${siteUrl}/fi/author/`,
    name: 'Kerikin filosofia',
    description: 'Kerikin filosofia on Kyrylo Kovalchukin filosofinen järjestelmä yksilöllisyydestä, valinnoista, vapaudesta, teknologiasta, vauraudesta ja oman todellisuuden hallinnasta.'
  },
  {
    lang: 'sv',
    file: path.join(dist, 'sv', 'index.html'),
    url: `${siteUrl}/sv/`,
    authorUrl: `${siteUrl}/sv/author/`,
    name: 'Keriks filosofi',
    description: 'Keriks filosofi är Kyrylo Kovalchuks filosofiska system om individualitet, val, frihet, teknik, välstånd och kontroll över den egna verkligheten.'
  }
];

const alternateNames = ['Філософія Кєріка', 'Philosophy of Kerik', 'Kerikin filosofia', 'Keriks filosofi'];
const topics = ['individuality', 'choice', 'personal autonomy', 'technology', 'wealth', 'systems', 'reality'];
const scriptPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;

for (const page of pages) {
  if (!fs.existsSync(page.file)) throw new Error(`Missing generated homepage: ${page.file}`);
  let html = fs.readFileSync(page.file, 'utf8');
  const match = html.match(scriptPattern);
  if (!match) throw new Error(`Missing JSON-LD on ${page.file}`);

  const data = JSON.parse(match[1]);
  const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];

  const website = graph.find(node => node['@type'] === 'WebSite') || {};
  website['@type'] = 'WebSite';
  website['@id'] = website['@id'] || `${page.url}#website`;
  website.name = page.name;
  website.alternateName = alternateNames;
  website.url = page.url;
  website.inLanguage = page.lang;
  website.creator = { '@id': authorId };
  website.publisher = { '@id': authorId };
  website.about = { '@id': philosophyId };

  const person = graph.find(node => node['@id'] === authorId || node['@type'] === 'Person') || {};
  person['@type'] = 'Person';
  person['@id'] = authorId;
  person.name = 'Kyrylo Kovalchuk';
  person.url = page.authorUrl;
  person.sameAs = profileUrls;
  person.knowsAbout = topics;

  const book = graph.find(node => node['@type'] === 'Book');
  if (book) {
    book.author = { '@id': authorId };
    book.creator = { '@id': authorId };
    book.isPartOf = { '@id': philosophyId };
  }

  const philosophy = {
    '@type': 'CreativeWork',
    '@id': philosophyId,
    name: page.name,
    alternateName: alternateNames,
    url: page.url,
    description: page.description,
    inLanguage: ['uk', 'en', 'fi', 'sv'],
    creator: { '@id': authorId },
    author: { '@id': authorId },
    about: topics.map(name => ({ '@type': 'Thing', name }))
  };

  const webpage = {
    '@type': 'WebPage',
    '@id': `${page.url}#webpage`,
    url: page.url,
    name: page.name,
    description: page.description,
    inLanguage: page.lang,
    isPartOf: { '@id': website['@id'] },
    about: { '@id': philosophyId },
    mainEntity: { '@id': philosophyId },
    author: { '@id': authorId }
  };

  const nextGraph = graph.filter(node => node['@id'] !== philosophyId && node['@id'] !== `${page.url}#webpage`);
  if (!nextGraph.includes(website)) nextGraph.unshift(website);
  if (!nextGraph.includes(person)) nextGraph.push(person);
  nextGraph.push(philosophy, webpage);

  const output = { '@context': 'https://schema.org', '@graph': nextGraph };
  const json = JSON.stringify(output).replaceAll('<', '\\u003c');
  html = html.replace(scriptPattern, `<script type="application/ld+json">${json}</script>`);
  fs.writeFileSync(page.file, html);

  const verify = JSON.parse(html.match(scriptPattern)[1]);
  const verifyGraph = verify['@graph'];
  if (!verifyGraph.some(node => node['@id'] === philosophyId)) throw new Error(`Philosophy entity missing after write: ${page.file}`);
  if (!verifyGraph.some(node => node['@id'] === authorId && Array.isArray(node.sameAs) && node.sameAs.length === 2)) throw new Error(`Author entity links missing after write: ${page.file}`);
}

console.log('SEO entity graph strengthened on 4 localized homepages.');
