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

// popup.jsのバックアップと復元関数
function backupPopup() {
  const popupPath = path.join(__dirname, '..', 'app', 'scripts', 'popup.js');
  const backupPath = path.join(__dirname, '..', 'app', 'scripts', 'popup.js.bak');
  if (fs.existsSync(popupPath)) {
    fs.copyFileSync(popupPath, backupPath);
  }
}

function restorePopup() {
  const popupPath = path.join(__dirname, '..', 'app', 'scripts', 'popup.js');
  const backupPath = path.join(__dirname, '..', 'app', 'scripts', 'popup.js.bak');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, popupPath);
    fs.unlinkSync(backupPath);
  }
}

function modifyPopupForBrowser(browser) {
  const popupPath = path.join(__dirname, '..', 'app', 'scripts', 'popup.js');
  
  if (!fs.existsSync(popupPath)) {
    console.error('❌ popup.js not found!');
    return;
  }

  let content = fs.readFileSync(popupPath, 'utf8');
  
  if (browser === 'chrome') {
    // Chrome用：Firefox部分のeval使用コードをコメントアウト
    content = content.replace(
      /\/\* FIREFOX_EVAL_START \*\/([\s\S]*?)\/\* FIREFOX_EVAL_END \*\//g, 
      '/* FIREFOX_EVAL_START (commented out for Chrome) $1 FIREFOX_EVAL_END */'
    );
    content = content.replace(
      /\/\* FIREFOX_FALLBACK_START \*\/([\s\S]*?)\/\* FIREFOX_FALLBACK_END \*\//g, 
      '/* FIREFOX_FALLBACK_START (commented out for Chrome) $1 FIREFOX_FALLBACK_END */'
    );
    console.log('📝 Modified popup.js for Chrome (Firefox eval code commented out)');
  } else if (browser === 'firefox') {
    // Firefox用：特に変更しない（デフォルトでFirefox用になっている）
    console.log('📝 Using popup.js for Firefox (no modifications needed)');
  }
  
  fs.writeFileSync(popupPath, content, 'utf8');
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
  
  // ファイルをバックアップ
  backupManifest();
  backupPopup();
  
  // Chromeの場合はmanifestを切り替え
  if (browser === 'chrome') {
    useChromeManifest();
  }
  
  // popup.jsをブラウザ用に修正
  modifyPopupForBrowser(browser);
  
  // 設定ファイルを更新
  const config = {
    webpackConfig: {
      devtool: 'hidden-source-map',
      optimization: {
        minimize: true
      }
    },
    vendor: browser
  };
  
  fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
  
  // ビルド実行
  try {
    execSync(`NODE_OPTIONS=--openssl-legacy-provider webextension-toolbox build --config webextension-toolbox.config.js ${browser}`, {
      stdio: 'inherit'
    });
    
    // パッケージファイル名を出力
    const packageName = require('../package.json').name;
    const version = require('../package.json').version;
    const extension = browser === 'chrome' ? 'zip' : 'xpi';
    console.log(`\n📦 パッケージファイル: ${packageName}.v${version}.${browser}.${extension}`);
    
    console.log(`✅ ${browser} build completed successfully!`);
  } catch (error) {
    console.error(`❌ ${browser} build failed:`, error.message);
    process.exit(1);
  } finally {
    // ファイルを復元
    restoreManifest();
    restorePopup();
    console.log('🔄 Restored original files');
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