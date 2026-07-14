import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const entries = {
  index: 'src/index.js',
  'mp-navigation/index': 'src/mp-navigation/index.js',
  'mp-navigation/opacity-with-scroll': 'src/mp-navigation/opacity-with-scroll.js',
  'mp-countdown/index': 'src/mp-countdown/index.js',
  'mp-page-bottom/index': 'src/mp-page-bottom/index.js',
  'mp-overlay/index': 'src/mp-overlay/index.js',
  'mp-popup/index': 'src/mp-popup/index.js',
  'mp-dialog/index': 'src/mp-dialog/index.js',
};

const assets = [
  'mp-countdown/index.json',
  'mp-countdown/index.wxml',
  'mp-countdown/index.wxss',
  'mp-navigation/index.json',
  'mp-navigation/index.wxml',
  'mp-navigation/index.wxss',
  'mp-page-bottom/index.json',
  'mp-page-bottom/index.wxml',
  'mp-page-bottom/index.wxss',
  'mp-overlay/index.json',
  'mp-overlay/index.wxml',
  'mp-overlay/index.wxss',
  'mp-popup/index.json',
  'mp-popup/index.wxml',
  'mp-popup/index.wxss',
  'mp-dialog/index.json',
  'mp-dialog/index.wxml',
  'mp-dialog/index.wxss',
];

await rm('dist', { force: true, recursive: true });
await mkdir('dist', { recursive: true });

await build({
  entryPoints: entries,
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2018',
  outdir: 'dist',
  external: ['@chin0102/mp-adapter'],
});

await Promise.all(
  assets.map(async (asset) => {
    await mkdir(`dist/${asset.slice(0, asset.lastIndexOf('/'))}`, { recursive: true });
    await cp(`src/${asset}`, `dist/${asset}`);
  }),
);

await writeFile('dist/package.json', `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
