#!/usr/bin/env node
// Copies each package's CHANGELOG.md straight from its own repository
// checkout (sibling folders of this site, same machine layout as
// ../ts-typed/system/*) into public/changelogs/<package>.md, so the
// changelog page renders the real source file instead of a hand-maintained
// copy that can drift. Run after pulling the latest changes in each repo.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const monorepoRoot = join(siteRoot, '..', 'ts-typed');

const PACKAGES = [
  { id: 'core', name: '@ts-typed/core', repo: 'ts-typed/ts-typed', source: join(monorepoRoot, 'system', 'base', 'CHANGELOG.md') },
  { id: 'nestjs', name: '@ts-typed/nestjs', repo: 'ts-typed/nestjs', source: join(monorepoRoot, 'system', 'frameworks', 'nestjs', 'CHANGELOG.md') },
  { id: 'express', name: '@ts-typed/express', repo: 'ts-typed/express', source: join(monorepoRoot, 'system', 'frameworks', 'express', 'CHANGELOG.md') },
  { id: 'validators', name: '@ts-typed/validators', repo: 'ts-typed/validators', source: join(monorepoRoot, 'system', 'validators', 'CHANGELOG.md') },
];

const outDir = join(siteRoot, 'public', 'changelogs');
mkdirSync(outDir, { recursive: true });

for (const pkg of PACKAGES) {
  const content = readFileSync(pkg.source, 'utf8');
  writeFileSync(join(outDir, `${pkg.id}.md`), content);
  console.log(`synced ${pkg.name} <- ${pkg.source}`);
}
