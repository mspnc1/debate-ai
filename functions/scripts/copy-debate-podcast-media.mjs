import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(functionsDir, '..');
const sourceDir = path.join(repoRoot, 'media');
const targetDir = path.join(functionsDir, 'lib', 'debate-podcast-media');
const requiredFiles = [
  'Arena Opening.mp3',
  'Symposium Converge.mp3',
];

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const fileName of requiredFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  const targetPath = path.join(targetDir, fileName);
  const sourceStats = await stat(sourcePath).catch(() => undefined);

  if (!sourceStats?.isFile()) {
    throw new Error(`Required debate podcast media file is missing: ${sourcePath}`);
  }

  await copyFile(sourcePath, targetPath);
}
