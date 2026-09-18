import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import Icons from 'unplugin-icons/vite';

/**
 * `public/sw.js` is copied verbatim by Vite (it's a static file, never
 * processed for hashing), so the cache-busting version and the precache
 * asset list can't be known until after the rest of the build has run.
 * This plugin patches `dist/sw.js` in place once `writeBundle` fires
 * (i.e. after every other output file, including the hashed `dist/assets/*`
 * files, already exists on disk).
 *
 * Version = a short content hash of the concatenated `dist/assets/*` files,
 * not `Date.now()`: a timestamp would bump the cache (and force every
 * client to redownload everything) on every rebuild even when nothing
 * actually changed, which defeats the point of cache-first `/assets/*`.
 * A content hash only changes when the built output actually changes.
 */
function serviceWorkerVersionPlugin(): Plugin {
  return {
    name: 'homebase-sw-version',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? 'dist';
      const swPath = path.join(outDir, 'sw.js');
      const assetsDir = path.join(outDir, 'assets');

      let assetFiles: string[] = [];
      try {
        assetFiles = readdirSync(assetsDir)
          .filter((name) => statSync(path.join(assetsDir, name)).isFile())
          .sort();
      } catch {
        // No assets directory (e.g. an empty build): fall back to an empty list.
      }

      const hash = createHash('sha256');
      for (const file of assetFiles) {
        hash.update(file);
        hash.update(readFileSync(path.join(assetsDir, file)));
      }
      const version = hash.digest('hex').slice(0, 10);

      const precacheAssets = assetFiles.map((name) => `./assets/${name}`);

      let sw: string;
      try {
        sw = readFileSync(swPath, 'utf8');
      } catch {
        // No public/sw.js in this build: nothing to patch.
        return;
      }

      sw = sw
        .replaceAll('__CACHE_VERSION__', version)
        .replaceAll('__PRECACHE_MANIFEST__', JSON.stringify(precacheAssets));

      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './', // REQUIRED: relative paths so it works from any subdirectory
  plugins: [
    svelte(),
    Icons({
      compiler: 'svelte',
    }),
    serviceWorkerVersionPlugin(),
  ],
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
  },
});
