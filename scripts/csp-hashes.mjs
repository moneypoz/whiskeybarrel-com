// Regenerate the sha256 hashes for the CSP script-src in _headers.
//
// Run:  node scripts/csp-hashes.mjs
// Then paste the printed 'sha256-...' tokens into the script-src directive
// in _headers (replacing the existing 'sha256-...' tokens).
//
// Why: our Content-Security-Policy allows inline <script> blocks by hash
// instead of 'unsafe-inline'. Editing any inline script changes its hash, so
// it must be re-pinned here or the browser will block it.

import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// All .html on disk (skip VCS/dependency dirs), portable across OSes.
const files = readdirSync('.', { recursive: true })
  .map((p) => String(p).replace(/\\/g, '/'))
  .filter((p) => p.endsWith('.html') && !/(^|\/)(\.git|node_modules)\//.test(p));

const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const hashes = new Map(); // hash -> Set(files)

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, attrs, body] = m;
    if (/\bsrc\s*=/.test(attrs)) continue;                              // external script
    if (/type\s*=\s*["']application\/ld\+json/i.test(attrs)) continue;  // JSON-LD data, not executed
    if (body.trim() === '') continue;
    const h = 'sha256-' + createHash('sha256').update(body, 'utf8').digest('base64');
    if (!hashes.has(h)) hashes.set(h, new Set());
    hashes.get(h).add(f);
  }
}

const tokens = [...hashes.keys()].sort();
console.log(`Found ${tokens.length} unique inline scripts across ${files.length} HTML files.\n`);
console.log('Paste these into script-src in _headers:\n');
console.log(tokens.map((t) => `'${t}'`).join(' '));
