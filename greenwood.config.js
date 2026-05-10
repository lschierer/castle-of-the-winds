import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const binaryMapsJson = {
  type: 'resource',
  name: 'plugin-binary-maps-json',
  provider: () => ({
    extensions: ['json'],
    contentType: 'application/json',

    shouldResolve(url) {
      return url.pathname.includes('binary-maps/') && url.pathname.endsWith('_map.json');
    },

    async resolve(url) {
      const filename = url.pathname.split('/').pop();
      const resolved = new URL(`./data/binary-maps/${filename}`, new URL(`file://${process.cwd()}/`));
      if (existsSync(resolved)) {
        return new Request(resolved);
      }
      return new Request(url);
    },

    shouldServe(url) {
      return url.protocol === 'file:' && url.pathname.includes('binary-maps/') && url.pathname.endsWith('_map.json');
    },

    async serve(url) {
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

    shouldServe(url) {
      const { pathname } = url;
      return (
        pathname.includes('/loglevel/') &&
        (pathname.endsWith('/loglevel.js') || pathname.endsWith('/loglevel.min.js'))
      );
    },

    async serve(url) {
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
