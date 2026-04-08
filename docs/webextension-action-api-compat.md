# WebExtension: `action` / `browserAction` 互換メモ

## 何が起きるか

- **Firefox（特に Manifest V2 相当）では `chrome.action` が `undefined` になり得る**
  - その場合 `chrome.action.openPopup()` のような呼び出しで `Error: can't access property "openPopup", chrome.action is undefined` が出る。

## ざっくり整理

- **Manifest V3**: `chrome.action` / `browser.action`
- **Manifest V2**: `chrome.browserAction` / `browser.browserAction`

同じ「ツールバーの拡張機能アイコン」系でも、API名が世代で割れている。

## `openPopup` について

`openPopup` は環境によって存在しない（または制約が強い）ので、**存在チェックして無理に呼ばない**のが安全。

## このリポジトリでの対応

`entrypoints/background.ts` では以下の優先順で “actionっぽいAPI” を拾って使う。

- `chrome.action` → `chrome.browserAction` → `browser.action` → `browser.browserAction`

見つからない / メソッドが無い場合は no-op で落ちないようにしている。

