const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const DIST = path.join(ROOT, 'dist', 'chrome');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// dist/chrome をリセット
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// スクリプトをビルド
console.log('Building scripts with webpack...');
execSync('npx webpack --config webpack.config.js', { stdio: 'inherit', cwd: ROOT });

// manifest.json をコピー
fs.copyFileSync(path.join(APP, 'manifest.json'), path.join(DIST, 'manifest.json'));

// images, _locales をコピー
copyDir(path.join(APP, 'images'), path.join(DIST, 'images'));
copyDir(path.join(APP, '_locales'), path.join(DIST, '_locales'));

// zip パッケージ
const { name, version } = require('../package.json');
const zipName = `${name}.v${version}.chrome.zip`;
const packagesDir = path.join(ROOT, 'packages');
fs.mkdirSync(packagesDir, { recursive: true });
const zipPath = path.join(packagesDir, zipName);
execSync(`cd "${DIST}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });

console.log(`\nPackage: packages/${zipName}`);
console.log('Chrome build completed!');
