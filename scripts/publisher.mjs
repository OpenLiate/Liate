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
const version = pkg.version;

// In CI (GitHub Actions), attach cryptographic provenance via OIDC
const provenanceFlag = process.env.CI ? ' --provenance' : '';

function safePublish(cmd, pkgName) {
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
  } catch (err) {
    // If the version is already published on npm, do not fail
    try {
      const remoteVer = execSync(`npm view ${pkgName} version`, { encoding: 'utf8' }).trim();
      if (remoteVer === version) {
        console.log(`\n[!] Package '${pkgName}@${version}' is already published on npm. Skipping gracefully.\n`);
        return;
      }
    } catch (_) {}
    throw err;
  }
}

try {
  // Swap in dedicated npm README
  if (fs.existsSync(npmReadmePath)) {
    fs.copyFileSync(npmReadmePath, readmePath);
    console.log('[+] Loaded dedicated npm README from README.npm.md');
  }

  // 1. Publish openliate (unscoped)
  pkg.name = 'openliate';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('\n========================================');
  console.log(` Publishing openliate (v${version}) to npm...`);
  console.log('========================================');
  safePublish(`npm publish${provenanceFlag}`, 'openliate');

  // 2. Publish @openliate/liate (org-scoped)
  pkg.name = '@openliate/liate';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('\n========================================');
  console.log(` Publishing @openliate/liate (v${version}) to npm...`);
  console.log('========================================');
  safePublish(`npm publish --access public${provenanceFlag}`, '@openliate/liate');

  console.log('\n[✓] NPM publishing completed successfully!\n');
} finally {
  fs.writeFileSync(pkgPath, originalPkg);
  fs.writeFileSync(readmePath, originalReadme);
  console.log('[+] Restored root package.json and README.md');
}
