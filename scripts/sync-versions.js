import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

for (const directory of workspace.workspaces) {
  const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
  const sourcePath = join(root, directory, 'src/index.js');
  const source = await readFile(sourcePath, 'utf8');
  const pattern = /export const VERSION = (['"])([^'"]+)\1;/u;
  if (!pattern.test(source)) continue;

  const updated = source.replace(pattern, `export const VERSION = '${manifest.version}';`);
  if (updated !== source) {
    await writeFile(sourcePath, updated);
    console.log(`${manifest.name}: synchronized runtime version ${manifest.version}`);
  }
}
