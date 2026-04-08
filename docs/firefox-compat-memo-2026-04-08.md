# Firefox対応メモ (2026-04-08)

## 症状

- Chromeでは動くのに、Firefoxでは以下が起きることがある
  - LMSリンク取得のバックグラウンドfetchが `TypeError: NetworkError when attempting to fetch resource.`
  - 更新確認が「確認中…」のまま進まない
  - 登録処理で「データ保存 ✓」まで出ているのに、ポップアップのミニ一覧が「未登録」表示になる

## 原因と対策

### 1) MV2 背景スクリプトのクロスオリジン fetch にはホスト権限が必要

- Firefox MV2では、バックグラウンドスクリプトからの `fetch()` は **対象ホストの権限** が manifest に無いと失敗する。
- 対策: `wxt.config.ts` の `manifest.host_permissions` に対象を追加する。
  - `https://eduweb.sta.kanazawa-u.ac.jp/*`
  - `https://acanthus.cis.kanazawa-u.ac.jp/*`
  - `https://api.github.com/*`（更新確認）
- WXTは MV2 ビルド時に `host_permissions` を `permissions` にマージして出力してくれる。

### 2) `chrome.storage.*` を Promise として await すると Firefox でコケやすい

- Firefoxでは `chrome.*` API が **コールバック式** になりがちで、`await chrome.storage.local.get(...)` のつもりが Promise ではなくなり、
  取得結果が空扱いになってUIが「未登録」になることがある。
- 対策: WXTのポリフィル前提で **`browser.*` に統一** する（`browser.storage.local.get/set/remove` など）。

### 3) popupからの更新確認は background に委譲するのが堅い

- popup側は実行コンテキストや権限差の影響を受けやすい。
- 対策: popup → `browser.runtime.sendMessage({ type: 'CHECK_UPDATE' })` で background にやらせる。

