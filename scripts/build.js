const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'webextension-toolbox.config.js');
const browsers = ['chrome', 'firefox'];
const targetBrowser = process.argv[2];

function buildForBrowser(browser) {
  console.log(`\n🚀 Building for ${browser}...`);
  
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
    process.exit(1);
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