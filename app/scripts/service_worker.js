// バックグラウンドスクリプト - Firefox/Chrome互換版

// ブラウザ互換性のための統一されたAPI取得
const browserAPI = (() => {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox, Safari
  }
  if (typeof chrome !== 'undefined') {
    return chrome; // Chrome
  }
  throw new Error('Browser API not found');
})();

browserAPI.runtime.onInstalled.addListener(() => {
  console.log('拡張機能がインストールされました');
});

// URL 判定 → 対象ページに該当スクリプトを注入
browserAPI.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;

  const url = new URL(tab.url);

  // スクリプト実行の互換性関数
  const executeScriptCompatible = (tabId, files) => {
    // Manifest V3 scripting API が使えるかチェック
    if (browserAPI.scripting && browserAPI.scripting.executeScript) {
      return browserAPI.scripting.executeScript({
        target: { tabId },
        files: files
      });
    }
    // Manifest V2 tabs.executeScript へのフォールバック
    else if (browserAPI.tabs && browserAPI.tabs.executeScript) {
      files.forEach(file => {
        browserAPI.tabs.executeScript(tabId, { file: file });
      });
    }
    else {
      console.error('No compatible script execution API found');
    }
  };

  // 金沢大学のLMS
  if (url.hostname === 'acanthus.cis.kanazawa-u.ac.jp') {
    executeScriptCompatible(tabId, ['scripts/inject.js']);
  }

  // 金沢大学のポータル
  else if (url.hostname === 'eduweb.sta.kanazawa-u.ac.jp') {
    executeScriptCompatible(tabId, ['scripts/makeTable.js']);
  }

  // 設定ページ
  else if (url.hostname === 'ogawa3427.github.io') {
    executeScriptCompatible(tabId, ['scripts/showTable.js']);
  }
}); 