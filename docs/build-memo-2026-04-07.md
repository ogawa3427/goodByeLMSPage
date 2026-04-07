# ビルド調査メモ (2026-04-07)

## 1) webextension-toolbox の問題 (解決済み・捨てた)

- `webextension-toolbox build <browser>` はマニフェスト検証が MV2 前提のため、  
  Chrome MV3 の `background.service_worker` を使うとビルドが失敗する。
- `process.exit(1)` を try/catch の catch ブロックから呼ぶと finally が動かず  
  manifest.json が Chrome 版のまま放置されるバグもあった。
- → **webextension-toolbox を廃止、WXT に移行することで解決。**

## 2) WXT への移行 (2026-04-07)

- **WXT v0.20.x** を採用。`npm install -D wxt` で導入。
- ビルドコマンド:
  - `npm run build` → Chrome MV3 (`.output/chrome-mv3/`)
  - `npm run build:firefox` → Firefox MV2 (`.output/firefox-mv2/`)
  - `npm run zip` → Chrome 用 ZIP
- manifest.json は `wxt.config.ts` の定義からビルド時に自動生成。手書き不要。
- `browser.*` API は WXT がポリフィルを提供するのでそのまま使える。
- `entrypoints/` にスクリプトを置くだけで manifest の content_scripts / background に自動登録される。

## 3) プロジェクト構成

```
entrypoints/
  background.ts   ← バックグラウンド Service Worker
  content.ts      ← コンテンツスクリプト
public/
  images/         ← 拡張機能アイコン
  _locales/       ← ローカライゼーション
wxt.config.ts     ← WXT 設定 (manifest 情報もここ)
```

## 4) 環境情報

- node v24.2.0 (WXT は >=18.0.0 で動作)
- WXT 0.20.20 / Vite 8.0.5
