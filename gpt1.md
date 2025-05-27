以下の手順で進めれば、UI改善系の Chrome/Firefox 両対応拡張がサクッと作れます。まあ、「そんなの当たり前だろ？」という話も混ざりますが、鵜呑みにして進めてください。

---

## 1. 環境構築と CI/CD（GitHub Actions）

1. **ローカル開発環境**

   * Node.js（LTS 推奨）＋npm/Yarn
   * 好きなエディタ（VSCode＋拡張推奨）
   * Linter（ESLint）／Formatter（Prettier）
   * Babel や TypeScript、あるいは esbuild/Webpack の導入もお好みで

2. **GitHub リポジトリ準備**

   * `main` ブランチを保護
   * Pull Request→自動ビルド＋Lint 通過が必須に

3. **GitHub Actions サンプル（`.github/workflows/ci.yml`）**

   ```yaml
   name: CI

   on:
     pull_request:
       branches: [ main ]
     push:
       branches: [ main ]

   jobs:
     build-and-lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run lint
         - run: npm run build
     publish-chrome:
       needs: build-and-lint
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: npm ci
         - run: npm run build
         - name: Upload to Chrome Web Store
           uses: r1c1ch/chrome-webstore-upload-action@v1
           with:
             client_id: ${{ secrets.CWS_ID }}
             client_secret: ${{ secrets.CWS_SECRET }}
             refresh_token: ${{ secrets.CWS_TOKEN }}
             extension_id: ${{ secrets.CWS_EXT_ID }}
             zip: './dist/extension.zip'
     publish-firefox:
       needs: build-and-lint
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: npm ci
         - run: npm run build
         - name: Publish to Mozilla Add-ons
           uses: firefox-webext-browser-action@v2
           with:
             api-key: ${{ secrets.MOZ_API_KEY }}
             api-secret: ${{ secrets.MOZ_API_SECRET }}
             web-ext_artifact: './dist/extension.zip'
   ```

   ※ シークレットは GitHub 側でセットしておくこと。

---

## 2. ファイル間の関係性（アーキテクチャ）

```
extension/
├── manifest.json
├── background/        ← 常駐スクリプト（MV3 の service_worker）
│   └── background.js
├── content/           ← ページ改変用スクリプト
│   └── content.js
├── popup/             ← ブラウザアクションの UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/           ← 設定画面
│   ├── options.html
│   ├── options.js
│   └── options.css
└── assets/            ← アイコンや静的ファイル
```

* **`manifest.json`** で各スクリプト・ページを宣言
* **`background.js`** ⇄ **`content.js`** はメッセージパッシング
* **`popup.html`** は表示用、必要なら background や storage と連携
* Firefox も同じ構成。ただし `"browser_action"` → `"action"` の互換や、`web-ext/polyfill` を使って API 名を揃えるとラク

---

## 3. データフロー

1. ユーザーがブラウザ右上の拡張アイコンをクリック → **popup** 表示
2. **popup.js** で設定読み込み（`chrome.storage.local.get`）
3. **popup** 内で「そのページで UI 改善」を実行すると、`chrome.tabs.sendMessage` で **content.js** にコマンド送信
4. **content.js** が DOM を読んで必要な改変（テキスト差し替え / CSS injection）
5. 改変結果や設定を再度 **storage** に保存 → 次回以降同じ設定を継続

```
[popup UI] --get/set--> [storage]
    │
    └--sendMessage--> [content script] --DOM操作--> [ウェブページ]
```

---

## 4. 主な機能と実装サンプル

### 4-1. HTML の読み書き（DOM 改変）

```js
// content/content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'highlight') {
    document.querySelectorAll(msg.selector).forEach(el => {
      el.style.backgroundColor = msg.color;
    });
    sendResponse({ status: 'done' });
  }
});
```

### 4-2. ブラウザの storage 読み書き

```js
// popup/popup.js
// 設定読み込み
chrome.storage.local.get({ selector: 'p', color: '#ff0' }, prefs => {
  document.querySelector('#selector').value = prefs.selector;
  document.querySelector('#color').value = prefs.color;
});

// 設定保存＆実行
document.querySelector('#apply').addEventListener('click', () => {
  const selector = document.querySelector('#selector').value;
  const color = document.querySelector('#color').value;
  chrome.storage.local.set({ selector, color }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'highlight', selector, color });
    });
  });
});
```

### 4-3. Firefox 対応のポイント

* `chrome.*` ではなく `browser.*` もしくは `webextension-polyfill` を導入
* `manifest.json` の `"applications"` で Firefox 向け情報を追加

```json5
"applications": {
  "gecko": { "id": "your-addon@example.com", "strict_min_version": "91.0" }
}
```

---

## 5. その他オススメ＆落とし穴

* **TypeScript 化** すれば定義でミス減る
* **ビルド時に Manifest バージョン切り替え**（Chrome/Firefox 用）
* **Permission 最小化**：勝手に権限盛ると審査で蹴られる
* **Lint＋Prettier**：チーム開発なら必須
* **自動テスト**：Puppeteer や web-ext コマンドで簡易 E2E
* **CSP（Content Security Policy）**：`manifest.json` に `content_security_policy` を設定
* **Polyfill／Browser API**：共通化してコード重複なし
* **自動公開**：Semantic Release＋GitHub Actions でタグ打ち→自動アップロード
* **ユーザー設定バックアップ**：オプション画面でエクスポート機能

---

こんなもんです。技術的には大したことないのでサクッとコード書いて、CI でビルド→公開、を回すだけ。テストと権限周りだけは地味に面倒なので、あとで「こんなはずじゃ…」ってならないよう最初に詰めておくのが吉です。
