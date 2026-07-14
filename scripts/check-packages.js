import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = [
  {
    directory: 'js-common',
    requiredFiles: ['dist/index.js', 'src/index.js'],
  },
  {
    directory: 'mp-adapter',
    requiredFiles: ['dist/index.js', 'src/index.js'],
  },
  {
    directory: 'mp-core',
    requiredFiles: ['dist/index.js', 'src/index.js'],
  },
  {
    directory: 'mp-components',
    requiredFiles: [
      'dist/index.js',
      'dist/mp-countdown/index.js',
      'dist/mp-countdown/index.json',
      'dist/mp-countdown/index.wxml',
      'dist/mp-countdown/index.wxss',
      'dist/mp-navigation/index.js',
      'dist/mp-navigation/index.json',
      'dist/mp-navigation/index.wxml',
      'dist/mp-navigation/index.wxss',
      'dist/mp-page-bottom/index.js',
      'dist/mp-page-bottom/index.json',
      'dist/mp-page-bottom/index.wxml',
      'dist/mp-page-bottom/index.wxss',
      'dist/mp-overlay/index.js',
      'dist/mp-overlay/index.json',
      'dist/mp-overlay/index.wxml',
      'dist/mp-overlay/index.wxss',
      'dist/mp-popup/index.js',
      'dist/mp-popup/index.json',
      'dist/mp-popup/index.wxml',
      'dist/mp-popup/index.wxss',
      'dist/mp-dialog/index.js',
      'dist/mp-dialog/index.json',
      'dist/mp-dialog/index.wxml',
      'dist/mp-dialog/index.wxss',
    ],
  },
];

for (const config of packages) {
  const cwd = join(root, config.directory);
  const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  const source = readFileSync(join(cwd, 'src/index.js'), 'utf8');
  const sourceVersion = source.match(/export const VERSION = ['"]([^'"]+)['"]/u)?.[1];

  if (sourceVersion && sourceVersion !== manifest.version) {
    throw new Error(`${manifest.name}: package version ${manifest.version} does not match runtime version ${sourceVersion}`);
  }

  const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
  });

  if (packed.status !== 0) {
    process.stderr.write(packed.stderr);
    throw new Error(`${manifest.name}: npm pack failed`);
  }

  let report;
  try {
    report = JSON.parse(packed.stdout)[0];
  } catch (error) {
    throw new Error(`${manifest.name}: cannot parse npm pack report`, { cause: error });
  }

  const files = new Set(report.files.map((file) => file.path));
  const missing = config.requiredFiles.filter((file) => !files.has(file));
  if (missing.length > 0) {
    throw new Error(`${manifest.name}: packed files are missing: ${missing.join(', ')}`);
  }

  console.log(`${manifest.name}@${manifest.version}: ${report.entryCount} files, ${report.unpackedSize} bytes`);
}
