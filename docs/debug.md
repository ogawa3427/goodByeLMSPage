以下、Chrome・Firefox両ブラウザにおける拡張機能の「ポップアップ・サービスワーカー（バックグラウンド）」などの効率的なデバッグ方法をまとめました。

---

## 🔍 Chrome 拡張のデバッグ方法

### 1. 拡張機能を読み込む

`chrome://extensions/` を開き、**デベロッパーモード**をONに。`manifest.json` をドラッグ＆ドロップで読み込みます。

### 2. 各コンポーネントごとのログ確認

* **マニフェストエラー**：読み込み時にポップアップや赤文字エラーボタンで表示される ([developer.mozilla.org][1])
* **サービスワーカー（background）**：拡張機能カードの「service worker」または「Inspect views」でコンソール・ネットワークタブが使えます ([developer.chrome.com][2])
* **ポップアップ（popup）**：

  1. アイコンクリックでポップアップを開く
  2. 中で右クリック → 「Inspect」 → DevTools起動
  3. 初回読み込みを見たい場合：Consoleタブで `location.reload(true)` を実行するとソース全体を再読み込みできる ([stackoverflow.com][3])
* **コンテントスクリプト**：対象のウェブページ上で DevTools（F12） → Console/Sources に表示されます&#x20;

### 3. ネットワークリクエスト確認

ポップアップや背景スクリプトのHTTP通信は、「Network」タブで再読み込みして確認 ([developer.chrome.com][2])

---

## 🛠 Firefox （WebExtensions）

### 1. 一時読み込み & デバッグ

* `about:debugging#this-firefox` で「一時的に読み込む」で `manifest.json` を読み込み、対象拡張の「Inspect」をクリック ([stackoverflow.com][4])
* DevToolsが開くので、ConsoleやDebuggerを操作できます&#x20;

### 2. ポップアップのデバッグ

* DevTools上で「Disable Popup Auto‑Hide（ポップアップ自動消去を無効に）」をチェック ([stackoverflow.com][4])
* iframe切替で popup.html をターゲットにし、Console や Inspector を使ってDOMやJSを確認 ([stackoverflow.com][4])

### 3. その他コンポーネント

* **バックグラウンドスクリプト**：同じDevToolsで Console・Debuggerが利用可&#x20;
* **コンテントスクリプト**：対象ページのDevToolsで読み込まれたスクリプトを確認&#x20;

---

## ✅ 一般的に使える DevTools テク

* Chrome DevTools で JS デバッグの基本操作（Breakpoints, Step, Watch）を使う ([developer.chrome.com][5])
* ネットワーク、副次的なスタイル・DOMの確認も標準の DevTools で対応済み

---

## 📋 手順まとめ表

| コンポーネント    | Chrome                                           | Firefox                                            |
| ---------- | ------------------------------------------------ | -------------------------------------------------- |
| マニフェストエラー  | `chrome://extensions/` → エラー表示                   | `about:debugging` → Inspect → Consoleで確認           |
| サービスワーカー   | 「service worker」リンク → DevTools                   | `about:debugging` → Inspect → Console/Debugger     |
| ポップアップ     | ポップアップ開いて右クリック→Inspect → `location.reload(true)` | Inspect → Disable auto-hide → iframe 切替 → DevTools |
| コンテンツスクリプト | 任意のページ上で DevTools → Sources/Console              | ページの DevTools → content script を選ぶ                 |

---

## 💡 補足＆コツ

* Chrome のポップアップはフォーカス外で閉じる仕様。`location.reload(true)` が便利 ([stackoverflow.com][3], [stackoverflow.com][4], [developer.chrome.com][2], [developer.mozilla.org][1])
* Firefox はポップアップ自動閉じに `Disable popup auto-hide` を設定すれば安定デバッグ可能 ([stackoverflow.com][4])
* 背景スクリプトやポップアップのみでなく、オプションページ・サイドバーなども DevTools からデバッグ可&#x20;

---

特にポップアップデバッグは、「まずDevTools開く → 自動消失抑止 → iframe切替」で滅茶苦茶捗る。炎上要素しかないとこ、頑張ってくれ。

他にも知りたいことがあれば適当に聞け。

[1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Popups?utm_source=chatgpt.com "Popups - MDN Web Docs - Mozilla"
[2]: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug?utm_source=chatgpt.com "Debug extensions - Chrome for Developers"
[3]: https://stackoverflow.com/questions/5039875/debug-popup-html-of-a-chrome-extension?utm_source=chatgpt.com "Debug popup.html of a Chrome Extension? - Stack Overflow"
[4]: https://stackoverflow.com/questions/35057109/how-to-inspect-a-firefox-webextension-popup?utm_source=chatgpt.com "How to inspect a Firefox WebExtension popup? - Stack Overflow"
[5]: https://developer.chrome.com/docs/devtools/javascript?utm_source=chatgpt.com "Debug JavaScript | Chrome DevTools"
