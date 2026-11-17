#!/usr/bin/env node
/**
 * OpenLiate Unified Version Synchronizer
 * Bumps the version across all TypeScript, Python, and Documentation configs.
 *
 * Usage:
 *   node scripts/bump.mjs 0.1.5
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targetVersion = process.argv[2]?.trim().replace(/^v/, '');

if (!targetVersion || !/^\d+\.\d+\.\d+.*$/.test(targetVersion)) {
  console.error('[Error] Please specify a valid version (e.g. node scripts/bump.mjs 0.1.5)');
  process.exit(1);
}

console.log(`\n========================================`);
console.log(` Bumping OpenLiate to version: v${targetVersion}`);
console.log(`========================================\n`);

function updateFile(relPath, pattern, replacement) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const updated = content.replace(pattern, replacement);
  if (content !== updated) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`[✓] Updated ${relPath}`);
  } else {
    console.log(`[-] Already up to date: ${relPath}`);
  }
}

// 1. Root package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = targetVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[✓] Updated package.json (${oldVersion} -> ${targetVersion})`);

// 2. src/core/version.ts
updateFile('src/core/version.ts', /export const VERSION = ".*?";/, `export const VERSION = "${targetVersion}";`);

// 3. Python SDK tomls
updateFile('sdk/python/pyproject.liate.toml', /version = ".*?"/, `version = "${targetVersion}"`);
updateFile('sdk/python/pyproject.openliate.toml', /version = ".*?"/, `version = "${targetVersion}"`);
updateFile('sdk/python/pyproject.toml', /version = ".*?"/, `version = "${targetVersion}"`);

// 4. Badges in READMEs
updateFile('README.md', /badge\/version-v\d+\.\d+\.\d+/g, `badge/version-v${targetVersion}`);
updateFile('README.md', /alt="v\d+\.\d+\.\d+"/g, `alt="v${targetVersion}"`);

updateFile('README.npm.md', /badge\/npm-v\d+\.\d+\.\d+/g, `badge/npm-v${targetVersion}`);
updateFile('README.npm.md', /alt="npm: v\d+\.\d+\.\d+"/g, `alt="npm: v${targetVersion}"`);

updateFile('sdk/python/README.md', /badge\/pypi-v\d+\.\d+\.\d+/g, `badge/pypi-v${targetVersion}`);
updateFile('sdk/python/README.md', /alt="PyPI: v\d+\.\d+\.\d+"/g, `alt="PyPI: v${targetVersion}"`);

console.log(`\n[✓] Successfully synchronized all files to v${targetVersion}!\n`);
