import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2018',
  external: ['@chin0102/mp-adapter'],
  outfile: 'dist/index.js',
});
