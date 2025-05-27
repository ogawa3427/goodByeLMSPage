// URL 判定 → 対象ページに該当スクリプトを注入
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;

  const url = new URL(tab.url);

  // ① onClick を空にして <a> 追加
  if (url.hostname === 'foo.example.com') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/inject.js']
    });
  }

  // ② a タグ情報を保存
  else if (url.hostname === 'bar.example.com') {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const target = document.getElementById('target-id');
        const a = target?.querySelector('a');
        if (a) {
          chrome.storage.local.set({ savedLink: { href: a.href, text: a.textContent } });
        }
      }
    });
  }

  // ③ 保存済みデータを読み込んで <table> 生成
  else if (url.hostname === 'baz.example.com') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/table.js']
    });
  }
}); 