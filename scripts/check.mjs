import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root,'dist');
const errors = [];
const required = ['index.html','en/index.html','fi/index.html','sv/index.html','styles.css','script.js','favicon.svg','assets/book-cover.webp','assets/social-card.webp','robots.txt','_headers','404.html'];
for (const file of required) if (!fs.existsSync(path.join(dist,file))) errors.push(`Missing ${file}`);
for (const lang of ['uk','en','fi','sv']) {
  const file = lang === 'uk' ? 'index.html' : `${lang}/index.html`;
  const html = fs.readFileSync(path.join(dist,file),'utf8');
  if (!html.includes(`<html lang="${lang}">`)) errors.push(`${file}: wrong html lang`);
  for (const token of ['{{','}}']) if (html.includes(token)) errors.push(`${file}: unresolved template token ${token}`);
  if (!html.includes('Philosophy of Kerik')) errors.push(`${file}: missing project name`);
  if (!html.includes('Kyrylo Kovalchuk')) errors.push(`${file}: missing author`);
  if (!html.includes('book-cover.webp')) errors.push(`${file}: missing book cover reference`);
}
const content = JSON.parse(fs.readFileSync(path.join(root,'src','content.json'),'utf8'));
for (const lang of ['uk','en','fi','sv']) {
  if (!content[lang]) errors.push(`Missing translation: ${lang}`);
  if (content[lang]?.concepts?.length !== 4) errors.push(`${lang}: concepts count != 4`);
  if (content[lang]?.articles?.length !== 3) errors.push(`${lang}: articles count != 3`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('All structural, localization and output checks passed.');
