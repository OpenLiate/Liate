import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const readmePath = path.join(root, 'README.md');
const npmReadmePath = path.join(root, 'README.npm.md');

const originalPkg = fs.readFileSync(pkgPath, 'utf8');
const originalReadme = fs.readFileSync(readmePath, 'utf8');
const pkg = JSON.parse(originalPkg);

try {
  // Swap in dedicated npm README
  if (fs.existsSync(npmReadmePath)) {
    fs.copyFileSync(npmReadmePath, readmePath);
    console.log('[+] Loaded dedicated npm README from README.npm.md');
  }

  // 1. Pack @openliate/liate
  pkg.name = '@openliate/liate';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('\n========================================');
  console.log(' Packing @openliate/liate (v0.1.4)...');
  console.log('========================================');
  execSync('npm pack', { cwd: root, stdio: 'inherit' });

  // 2. Pack openliate
  pkg.name = 'openliate';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('\n========================================');
  console.log(' Packing openliate (v0.1.4)...');
  console.log('========================================');
  execSync('npm pack', { cwd: root, stdio: 'inherit' });

  console.log('\n[✓] Both npm packages packed successfully!\n');
} finally {
  fs.writeFileSync(pkgPath, originalPkg);
  fs.writeFileSync(readmePath, originalReadme);
  console.log('[+] Restored root package.json and README.md');
}
