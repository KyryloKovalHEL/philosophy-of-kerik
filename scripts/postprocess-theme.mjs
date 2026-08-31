import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');
const themeSource = path.join(root, 'src', 'assets', 'warm-theme.css');
const themeTarget = path.join(dist, 'assets', 'warm-theme.css');

fs.mkdirSync(path.dirname(themeTarget), { recursive: true });
fs.copyFileSync(themeSource, themeTarget);

const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(dist);

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('/assets/warm-theme.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="/assets/warm-theme.css?v=20260831-warm1">\n</head>');
  }
  html = html.replace('<meta name="theme-color" content="#090909">', '<meta name="theme-color" content="#12100d">');
  fs.writeFileSync(file, html);
}

console.log(`Warm graphite palette applied to ${htmlFiles.length} generated pages.`);
