// バックグラウンドスクリプト
chrome.runtime.onInstalled.addListener(() => {
  console.log('拡張機能がインストールされました');
});

// URL 判定 → 対象ページに該当スクリプトを注入
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;

  const url = new URL(tab.url);

  // 金沢大学のLMS
  if (url.hostname === 'acanthus.cis.kanazawa-u.ac.jp') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/inject.js']
    });
  }

  // 金沢大学のポータル
  else if (url.hostname === 'eduweb.sta.kanazawa-u.ac.jp') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/makeTable.js']
    });
  }

  // 設定ページ
  else if (url.hostname === 'ogawa3427.github.io') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/showTable.js']
    });
  }
}); 