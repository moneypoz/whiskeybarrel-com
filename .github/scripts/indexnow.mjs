// Submit changed pages to IndexNow (Bing, Yandex, and other participating engines).
//
// Usage:
//   node .github/scripts/indexnow.mjs <file ...>   submit pages for the given changed HTML files
//   node .github/scripts/indexnow.mjs --all        submit every URL in sitemap.xml
//
// Changed files are resolved to canonical URLs via sitemap.xml, so any file that
// isn't a listed, indexable page (e.g. disclaimer.html, media-kit.html, or a brand
// new page not yet added to the sitemap) is simply skipped.

import { readFileSync } from 'node:fs';

const HOST = 'whiskeybarrel.com';
const KEY = '5455933ad335175959df481f421993ac';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// Normalize a file path or URL path to a comparable key:
//   index.html              -> ""
//   about.html              -> "about"
//   invest/foo/index.html   -> "invest/foo"
//   /invest/foo/  (sitemap) -> "invest/foo"
const norm = (p) =>
  p.replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/(^|\/)index\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');

// Build a map of normalized-path -> canonical URL from the sitemap.
const sitemap = readFileSync(new URL('../../sitemap.xml', import.meta.url), 'utf8');
const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
const byKey = new Map();
for (const loc of locs) {
  byKey.set(norm(new URL(loc).pathname), loc);
}

const args = process.argv.slice(2);
let urls;
if (args.includes('--all')) {
  urls = locs;
} else {
  const keys = args.filter((a) => a && a !== '--all').map(norm);
  urls = [...new Set(keys.map((k) => byKey.get(k)).filter(Boolean))];
}

if (urls.length === 0) {
  console.log('IndexNow: no sitemap-listed pages changed; nothing to submit.');
  process.exit(0);
}

console.log(`Submitting ${urls.length} URL(s) to IndexNow:`);
urls.forEach((u) => console.log('  ' + u));

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
});

console.log(`HTTP ${res.status} ${res.statusText}`);
// 200 = accepted, 202 = accepted/pending verification. Both are success.
if (res.status !== 200 && res.status !== 202) {
  console.error('Unexpected response:', await res.text());
  process.exit(1);
}
