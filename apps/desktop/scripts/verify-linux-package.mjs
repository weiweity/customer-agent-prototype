import {
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LINUX_LOCAL_UNSIGNED_OUTPUT = path.join(
  'release',
  'local-unsigned',
  'linux',
);

export function verifyLinuxPackage(options = {}) {
  const repositoryRoot = options.repositoryRoot
    ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const outputDirectory = path.join(repositoryRoot, LINUX_LOCAL_UNSIGNED_OUTPUT);
  if (!existsSync(outputDirectory) || !statSync(outputDirectory).isDirectory()) {
    throw new Error(`Missing Linux package output: ${outputDirectory}`);
  }
  const names = readdirSync(outputDirectory);
  if (names.some((name) => /\.blockmap$/i.test(name) || /^latest/i.test(name))) {
    throw new Error('Linux local-unsigned output must not include update metadata');
  }
  const unsigned = names.filter((name) => name.includes('UNSIGNED'));
  if (unsigned.length < 1) {
    throw new Error('Linux local-unsigned output must include an UNSIGNED artifact');
  }
}

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  verifyLinuxPackage();
}
