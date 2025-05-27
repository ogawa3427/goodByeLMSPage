以下、Manifest V3 前提で「URL に応じて DOM をいじり、データを保持し、あとで表にして吐き出す」最小実装例だけまとめます。**余計な礼儀も褒め言葉も抜き**で書くので、そのままコピペして動作確認してください。

---

## 0. ディレクトリ構成

```
extension/
├── manifest.json
├── service_worker.js      ← URL 判定してスクリプト注入
└── scripts/
    ├── inject.js          ← 共通 DOM 操作ロジック
    └── table.js           ← テーブル生成用
```

---

## 1. manifest.json

```jsonc
{
  "manifest_version": 3,
  "name": "URL-Specific DOM Tweaker",
  "version": "0.0.1",
  "permissions": [
    "scripting",
    "storage",           // chrome.storage.local 用
    "activeTab"
  ],
  "host_permissions": [
    "https://foo.example.com/*",
    "https://bar.example.com/*",
    "https://baz.example.com/*"
  ],
  "background": { "service_worker": "service_worker.js" },
  "action": { "default_title": "Tweaker" }
}
```

---

## 2. service\_worker.js

```js
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
```

---

## 3-1. scripts/inject.js

1 ページ目（foo.example.com）用：onclick を殺してアンカー追加。

```js
(() => {
  const elem = document.querySelector('.btn-danger'); // 適宜変更
  if (elem) {
    elem.onclick = null;            // JS ハンドラ無効化
    elem.removeAttribute('onclick'); // インライン属性も削除
  }

  // 好きな a タグを追加
  const anchor = document.createElement('a');
  anchor.href = 'https://example.org/';
  anchor.textContent = '追加リンク';
  anchor.target = '_blank';
  document.body.append(anchor);
})();
```

---

## 3-2. scripts/table.js

3 ページ目（baz.example.com）用：保存済みリンクを表で表示。

```js
(async () => {
  const { savedLink } = await chrome.storage.local.get('savedLink');
  if (!savedLink) return;

  const table = document.createElement('table');
  table.style.border = '1px solid #000';
  table.style.margin = '1rem';

  const tr = document.createElement('tr');
  ['リンクテキスト', 'URL'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.border = '1px solid #000';
    th.style.padding = '4px';
    tr.append(th);
  });
  table.append(tr);

  const tr2 = document.createElement('tr');
  [savedLink.text, savedLink.href].forEach(val => {
    const td = document.createElement('td');
    td.textContent = val;
    td.style.border = '1px solid #000';
    td.style.padding = '4px';
    tr2.append(td);
  });
  table.append(tr2);

  document.body.prepend(table);
})();
```

---

## 4. 使い方

1. `npm init -y && npm i --save-dev web-ext`（Firefox 梱包用）
2. Chrome：`chrome://extensions` → デベロッパーモード → 「パッケージ化されていない拡張を読み込む」で `extension/` を選択。
3. Firefox：`npx web-ext run -s extension --firefox=/path/to/firefox`。
4. 対象 URL にアクセスして動作確認。

---

## 5. よくある躓きポイント

| 症状                               | 原因と対処                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| onclick 消えない                     | その要素が Shadow DOM 内 or SPA で動的生成→MutationObserver で監視してから消せ                                           |
| storage に入らない                    | content script 内で `localStorage` 触ってる → **拡張の隔離ストレージ**なら `chrome.storage.*` を使う                      |
| Firefox で `chrome.*` が undefined | `webextension-polyfill` を inject して `browser.*` に置き換えるか、Manifest に `"browser_specific_settings"` を追加 |
| テーブルが二重挿入                        | `querySelector('table[data-tweaker]')` など自前の属性を付けて二重挿入防止                                             |

---

最低限これだけで動く。凝った設計（TypeScript, React, bundler, i18n など）は好きに後追いしてくれ。
