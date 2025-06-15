以下、Chrome と Firefox（WebExtensions 互換）両対応で「ツールバーアイコン＋クリックで小さなメニュー（ポップアップ）」を実装する手順マニュアルを提示します。なお、Manifest V3 対応済みです。

---

## 1. フォルダ構成 🧩

```
my-extension/
├─ manifest.json
├─ icons/
│   ├ icon16.png
│   ├ icon32.png
│   └ icon48.png
├─ popup/
│   ├ popup.html
│   ├ popup.css
│   └ popup.js
└─ background.js（必要なら）
```

---

## 2. `manifest.json` 設定

### Chrome（Manifest V3）共通例：

```json
{
  "manifest_version": 3,
  "name": "My Toolbar Popup",
  "version": "1.0",
  "description": "Toolbar icon + popup menu",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon48.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png"
    },
    "default_title": "Open menu",
    "default_popup": "popup/popup.html"
  },
  "permissions": ["activeTab"],
  "background": {
    "service_worker": "background.js"
  }
}
```

※ Firefox でも `action` は利用可。`browser_action` の代替として動作 ([developer.mozilla.org][1])。

---

## 3. アイコン準備

* PNG形式で16×16, 32×32, 48×48 を用意 ([developer.chrome.com][2])。
* `manifest.json` の `icons` と `action.default_icon` に指定。

---

## 4. ポップアップ構成

### popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
  <title>Menu</title>
</head>
<body>
  <ul id="menu">
    <li><button id="btn1">ボタン1</button></li>
    <li><button id="btn2">ボタン2</button></li>
  </ul>
  <script src="popup.js"></script>
</body>
</html>
```

### popup.css

```css
body {
  width: 200px;
  font-family: sans-serif;
}
#menu {
  list-style: none;
  padding: 0;
  margin: 0;
}
#menu li {
  margin: 8px 0;
}
```

### popup.js

```js
document.getElementById('btn1').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => alert('ボタン1 が押された')
    });
  });
});
document.getElementById('btn2').addEventListener('click', () => window.close());
```

---

## 5. 背景スクリプト（必要なら）

背景処理が要るなら `background.js` を用意。たとえば初回インストール時に何か処理する場合：

```js
chrome.runtime.onInstalled.addListener(details => {
  console.log('Installed', details);
});
```

---

## 6. デバッグ方法

* **Chrome**：`chrome://extensions/` → デベロッパーモード → ロードでマニフェスト選択。
* **Firefox**：`about:debugging#/runtime/this-firefox` → 「一時的にアドオンを読み込む」から `manifest.json` を選択 ([developer.mozilla.org][3], [developer.mozilla.org][4])。
* ポップアップの内容を確認するには、デベロッガーを開き「Disable popup auto-hide」設定を利用 ([stackoverflow.com][5])。

---

## 7. 動作イメージとヒント

* ツールバーにアイコンが出現。
* クリックすると `popup.html` が開き、軽量なメニューUIを表示。
* 外部クリックで自動的に閉じる（仕様）。
* JS 内で `chrome.scripting.executeScript(...)` や `browser.tabs` 等を使えばタブやDOM操作も可能。

---

## 🔧まとめ

1. マニフェストにアイコンと `action.default_popup` を設定。
2. `popup.html/css/js` を作成し、UI とロジックを書く。
3. **Chrome / Firefox** の拡張ローダーでテスト。
4. 必要なら background や content script を追加。

この構成なら「メニューバーにアイコン＋ちっちゃいメニュー」っぽい挙動を両ブラウザに対応させられます。コードそのまま擬似的なスケルトンなので、自分の機能に合わせて拡張していけばOK。

[1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action?utm_source=chatgpt.com "browser_action - MDN Web Docs - Mozilla"
[2]: https://developer.chrome.com/docs/extensions/develop/ui/configure-icons?utm_source=chatgpt.com "Configure extension icons - Chrome for Developers"
[3]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension?utm_source=chatgpt.com "Your second extension - Mozilla - MDN Web Docs"
[4]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension?utm_source=chatgpt.com "Your first extension - Mozilla - MDN Web Docs"
[5]: https://stackoverflow.com/questions/35057109/how-to-inspect-a-firefox-webextension-popup?utm_source=chatgpt.com "How to inspect a Firefox WebExtension popup? - Stack Overflow"
