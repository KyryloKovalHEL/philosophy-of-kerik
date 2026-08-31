import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'src', 'assets');

const photos = [
  { key: 'chess', parts: 5, output: 'kerik-chess.webp' },
  { key: 'author', parts: 6, output: 'kerik-author.webp' },
  { key: 'library', parts: 4, output: 'kerik-library.webp' }
];

function decodePhoto({ key, parts, output }) {
  const inputDir = path.join(assets, 'photo-data', key);
  const encoded = Array.from({ length: parts }, (_, index) => {
    const file = path.join(inputDir, `part-${String(index + 1).padStart(2, '0')}.txt`);
    if (!fs.existsSync(file)) throw new Error(`Missing photo data: ${file}`);
    return fs.readFileSync(file, 'utf8');
  }).join('').replace(/\s+/g, '');

  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`Invalid WebP payload for ${key}`);
  }
  const declaredLength = buffer.readUInt32LE(4) + 8;
  if (declaredLength !== buffer.length) {
    throw new Error(`Incomplete WebP payload for ${key}: RIFF declares ${declaredLength} bytes, decoded ${buffer.length}`);
  }

  const target = path.join(assets, output);
  fs.writeFileSync(target, buffer);
  const digest = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  console.log(`Prepared ${output}: ${buffer.length} bytes (${digest})`);
}

photos.forEach(decodePhoto);
