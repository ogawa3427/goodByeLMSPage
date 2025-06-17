const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'webextension-toolbox.config.js');
const browsers = ['chrome', 'firefox'];
const targetBrowser = process.argv[2];

// manifest.jsonのバックアップと復元関数
function backupManifest() {
  const manifestPath = path.join(__dirname, '..', 'app', 'manifest.json');
  const backupPath = path.join(__dirname, '..', 'app', 'manifest.json.bak');
  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, backupPath);
  }
}

function restoreManifest() {
  const manifestPath = path.join(__dirname, '..', 'app', 'manifest.json');
  const backupPath = path.join(__dirname, '..', 'app', 'manifest.json.bak');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, manifestPath);
    fs.unlinkSync(backupPath);
  }
}

function useChromeManifest() {
  const chromeManifestPath = path.join(__dirname, '..', 'app', 'manifest-chrome.json');
  const manifestPath = path.join(__dirname, '..', 'app', 'manifest.json');
  if (fs.existsSync(chromeManifestPath)) {
    fs.copyFileSync(chromeManifestPath, manifestPath);
    console.log('📋 Using Chrome manifest (manifest v3)');
  } else {
    console.error('❌ Chrome manifest file not found!');
    process.exit(1);
  }
}

function buildForBrowser(browser) {
  console.log(`\n🚀 Building for ${browser}...`);
  
  // Chromeの場合はmanifestを切り替え
  if (browser === 'chrome') {
    backupManifest();
    useChromeManifest();
  }
  
  // 設定ファイルを更新
  const config = {
    webpackConfig: {
      devtool: 'source-map',
    },
    vendor: browser
  };
  
  fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
  
  // ビルド実行
  try {
    execSync(`NODE_OPTIONS=--openssl-legacy-provider webextension-toolbox build --config webextension-toolbox.config.js ${browser}`, {
      stdio: 'inherit'
    });
    console.log(`✅ ${browser} build completed successfully!`);
  } catch (error) {
    console.error(`❌ ${browser} build failed:`, error.message);
    // Chromeの場合は必ずmanifestを復元
    if (browser === 'chrome') {
      restoreManifest();
    }
    process.exit(1);
  } finally {
    // Chromeの場合はmanifestを復元
    if (browser === 'chrome') {
      restoreManifest();
      console.log('🔄 Restored Firefox manifest');
    }
  }
}

// 引数に応じてビルド対象を決定
if (targetBrowser && browsers.includes(targetBrowser)) {
  buildForBrowser(targetBrowser);
} else if (targetBrowser) {
  console.error(`❌ Invalid browser: ${targetBrowser}`);
  console.error(`Valid options are: ${browsers.join(', ')}`);
  process.exit(1);
} else {
  // 引数がない場合は両方ビルド
  browsers.forEach(buildForBrowser);
} 