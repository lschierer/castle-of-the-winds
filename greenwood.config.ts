/**
 * Greenwood configuration.
 *
 * useTsc: true
 *   Lit uses TC39 decorators (@customElement, @state). Greenwood's default
 *   type-stripping (amaro strip-only) preserves decorator syntax verbatim;
 *   Terser then fails to parse the @ tokens. Setting useTsc: true makes
 *   Greenwood call tsc.transpileModule(), which transforms decorators into
 *   plain JS before bundling.
 *
 * plugin-loglevel-esm-shim (resource plugin)
 *   loglevel ships only a CJS/UMD bundle — it has no ESM exports. Greenwood's
 *   dev server serves node_modules files directly to the browser, so the browser
 *   would receive CJS source and throw "module is not defined". This plugin
 *   intercepts requests for the loglevel bundle and wraps the UMD source in an
 *   IIFE that injects a fake `module` object, causing the UMD's CJS branch to
 *   execute and store the result on a local variable that is then re-exported
 *   as an ES default. The same plugin runs during `greenwood build` via the
 *   greenwoodResourceLoader Rollup hook, so no separate Rollup CJS plugin is
 *   needed.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * plugin-binary-maps-json
 *   The binary map JSON files live in data/binary-maps/ (outside src/).
 *   Greenwood's dev server only resolves files within the workspace (src/),
 *   so the browser's `import … with { type: 'json' }` requests 404.
 *   This plugin intercepts those requests and serves the files from disk.
 */
const binaryMapsJson = {
  type: 'resource',
  name: 'plugin-binary-maps-json',
  provider: () => ({
    extensions: ['json'],
    contentType: 'application/json',

    shouldResolve(url: URL) {
      return url.pathname.includes('binary-maps/') && url.pathname.endsWith('_map.json');
    },

    async resolve(url: URL) {
      const filename = url.pathname.split('/').pop();
      const resolved = new URL(`./data/binary-maps/${filename}`, new URL(`file://${process.cwd()}/`));
      if (existsSync(resolved)) {
        return new Request(resolved);
      }
      return new Request(url);
    },

    shouldServe(url: URL) {
      return url.protocol === 'file:' && url.pathname.includes('binary-maps/') && url.pathname.endsWith('_map.json');
    },

    async serve(url: URL) {
      const source = await readFile(url, 'utf-8');
      return new Response(source, {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  }),
};

const loglevelEsmShim = {
  type: 'resource',
  name: 'plugin-loglevel-esm-shim',
  provider: () => ({
    extensions: ['js'],
    contentType: 'text/javascript',

    shouldServe(url: URL) {
      const { pathname } = url;
      return (
        pathname.includes('/loglevel/') &&
        (pathname.endsWith('/loglevel.js') || pathname.endsWith('/loglevel.min.js'))
      );
    },

    async serve(url: URL) {
      const source = await readFile(url, 'utf-8');
      const esm =
        '// ESM shim: loglevel (CJS/UMD → ESM)\n' +
        'const __mod = { exports: {} };\n' +
        '(function (module, exports) {\n' +
        source +
        '\n})(__mod, __mod.exports);\n' +
        'export default __mod.exports;\n';

      return new Response(esm, {
        headers: { 'Content-Type': 'text/javascript' },
      });
    },
  }),
};

export default {
  port: 8080,
  devServer: {
    port: 5000,
  },
  useTsc: true,
  plugins: [binaryMapsJson, loglevelEsmShim],
};
