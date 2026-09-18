#!/usr/bin/env node
/**
 * Bundle budget check.
 *
 * Reads every file directly under `dist/assets/`, buckets it by extension
 * (`.js` vs `.css`; everything else — source maps, fonts, images — is
 * ignored), gzips each file's contents, and sums gzip bytes per bucket.
 *
 * `dist/sw.js` is deliberately NOT under `dist/assets/` and is never read
 * by this script: it's a hand-written, plain-JS service worker copied
 * verbatim from `public/sw.js`, not an app bundle output, and must not
 * count toward the JS budget.
 *
 * Wallpapers are excluded per spec — they're IndexedDB-sourced (or live in
 * the currently-empty `public/wallpapers/`), never emitted into
 * `dist/assets/`.
 *
 * Budgets: JS gzip total < 100 KiB, CSS gzip total < 20 KiB. (RNF-01
 * originally set the JS budget at 60 KiB; raised once the icon/theme
 * feature set outgrew it — see the project history for that call.)
 * KiB (1024-based) is used consistently for both the check logic and the
 * printed labels — the stricter of the two possible KB interpretations.
 *
 * Always prints a full table, pass or fail, so the remaining headroom is
 * visible on every build. Exits non-zero if either bucket is over budget.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSETS_DIR = path.join(__dirname, '..', 'dist', 'assets');

const KIB = 1024;
export const BUDGETS = {
  js: 100 * KIB,
  css: 20 * KIB,
};

function formatKiB(bytes) {
  return `${(bytes / KIB).toFixed(2)} KiB`;
}

/**
 * Reads `dist/assets/`, gzips each `.js`/`.css` file, and returns per-file
 * results plus per-bucket totals. Exported so the failure path can be
 * sanity-checked against a synthetic buffer without touching the real
 * budget constants.
 */
export function collectAssets(assetsDir) {
  let entries;
  try {
    entries = readdirSync(assetsDir);
  } catch {
    return { files: [], totals: { js: 0, css: 0 } };
  }

  const files = [];
  const totals = { js: 0, css: 0 };

  for (const name of entries.sort()) {
    const fullPath = path.join(assetsDir, name);
    if (!statSync(fullPath).isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    const bucket = ext === '.js' ? 'js' : ext === '.css' ? 'css' : null;
    if (bucket === null) continue;

    const raw = readFileSync(fullPath);
    const gzip = gzipSync(raw, { level: 9 });

    files.push({
      name,
      bucket,
      rawBytes: raw.length,
      gzipBytes: gzip.length,
    });
    totals[bucket] += gzip.length;
  }

  return { files, totals };
}

function printTable(files, totals, budgets) {
  const rows = [];
  for (const bucket of ['js', 'css']) {
    const bucketFiles = files.filter((f) => f.bucket === bucket);
    for (const f of bucketFiles) {
      rows.push([f.name, formatKiB(f.rawBytes), formatKiB(f.gzipBytes)]);
    }
    rows.push([
      `  ${bucket.toUpperCase()} total`,
      '',
      formatKiB(totals[bucket]),
    ]);
    const remaining = budgets[bucket] - totals[bucket];
    rows.push([
      `  ${bucket.toUpperCase()} budget (${formatKiB(budgets[bucket])})`,
      '',
      `${remaining >= 0 ? 'headroom' : 'OVER by'} ${formatKiB(Math.abs(remaining))}`,
    ]);
  }

  const headers = ['asset', 'raw', 'gzip'];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );

  const formatRow = (r) => r.map((c, i) => c.padEnd(widths[i])).join('  ');

  console.log(formatRow(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) {
    console.log(formatRow(r));
  }
}

function main() {
  const { files, totals } = collectAssets(ASSETS_DIR);

  printTable(files, totals, BUDGETS);

  const overJs = totals.js > BUDGETS.js;
  const overCss = totals.css > BUDGETS.css;

  if (overJs || overCss) {
    console.error('');
    if (overJs) {
      console.error(
        `Bundle budget FAILED: JS gzip total ${formatKiB(totals.js)} exceeds budget of ${formatKiB(BUDGETS.js)}.`,
      );
    }
    if (overCss) {
      console.error(
        `Bundle budget FAILED: CSS gzip total ${formatKiB(totals.css)} exceeds budget of ${formatKiB(BUDGETS.css)}.`,
      );
    }
    process.exit(1);
  }

  console.log('');
  console.log('Bundle budget OK.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
