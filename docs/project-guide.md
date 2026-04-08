# Good Bye LMS Page - プロジェクトガイド

記憶なくした自分用。このファイルを読めば全体像がわかる。

---

## フレームワーク

- **WXT v0.20.x** — WebExtension 開発フレームワーク（内部で Vite/Rollup を使用）
- `entrypoints/` にファイルを置くだけで manifest の background / content_scripts / popup に自動登録される
- `manifest.json` は手書き不要。`wxt.config.ts` から自動生成
- `browser.*` API のポリフィルを提供してくれるので、Chrome/Firefox 共通で `browser.*` を使えばいい（**`chrome.*` は使うな**、Firefoxで壊れる。詳細 → `docs/firefox-compat-memo-2026-04-08.md`）

### ビルド出力先

| ターゲット | ディレクトリ | Manifest |
|---|---|---|
| Chrome | `.output/chrome-mv3/` | MV3 |
| Firefox | `.output/firefox-mv2/` | MV2 |

---

## ファイル構成と役割

### 人が書き換えるファイル（ソース）

```
entrypoints/
  background.ts        ← バックグラウンド Service Worker
  content.ts           ← コンテンツスクリプト（対象ページに注入される）
  popup/
    index.html         ← ポップアップのHTML+CSS（スタイルもここにインライン）
    main.ts            ← ポップアップのロジック

wxt.config.ts          ← WXT設定 / manifest情報（権限・アイコン等）
package.json           ← バージョン番号・npm scripts

public/
  images/              ← 拡張機能アイコン（icon-16/19/38/128.png）
  _locales/            ← i18n（ja/en の messages.json）

README.md              ← ユーザー向けドキュメント
```

### 触らなくていいファイル（自動生成 / 設定）

```
.output/               ← ビルド成果物（gitignore済み）
.wxt/                  ← WXT内部キャッシュ（gitignore済み）
node_modules/          ← 依存関係（gitignore済み）
.github/workflows/     ← CI/CD（基本いじらない）
scripts/build.js       ← 旧ビルドスクリプト（もう使ってない、残骸）
docs/                  ← メモ類
```

---

## 各 TypeScript ファイルの処理概要

### `entrypoints/background.ts`

バックグラウンドで常駐する処理。

- **更新確認**: GitHub API (`api.github.com`) で最新リリースを取得 → `browser.storage.local` に保存 → 新バージョンがあればバッジに `NEW` 表示
- **アラーム**: 24時間ごとに更新チェック
- **メッセージハンドラ**:
  - `TABLE_DETECTED` → ポップアップを開く
  - `GLOW_ICON` → バッジに星マーク
  - `CHECK_UPDATE` → 更新確認を実行（popup から委譲される）
  - `FETCH_URL` → 指定URLをfetchしてHTMLを返す（content script が直接fetchできないクロスオリジンリクエストを代行）
- **Chrome/Firefox互換**: `actionApi` で `chrome.action` / `chrome.browserAction` / `browser.action` / `browser.browserAction` を自動検出

### `entrypoints/content.ts`

対象ページ（`acanthus.cis.kanazawa-u.ac.jp`, `eduweb.sta.kanazawa-u.ac.jp`）に注入される。

- **DOM監視**: `tblLecture` テーブルの出現を検知 → background に `TABLE_DETECTED` を送信
- **notice div 検知**: `lms-course-list-lms-notice` クラスの div を見つけたら背景色変更 + `GLOW_ICON` 送信 + 保存済み講義一覧を注入
- **テーブルパース**: 履修時間割テーブル（通常講義 + 集中講義）から講義情報を抽出
- **LMSリンク取得**: 各講義の acting ページを background 経由で fetch → SSOリンクを抽出
- **データ保存**: `browser.storage.local` に `allLectureData`（年度・Q単位）として蓄積
- **進捗通知**: `PROGRESS_UPDATE` メッセージでポップアップに進捗を送る

### `entrypoints/popup/main.ts`

ツールバーアイコンクリック時のポップアップUI。

- **講義ミニ一覧**: `allLectureData` から現在Q（なければ直近のQ）のデータを読んで表示
- **バージョン表示**: `browser.runtime.getManifest().version` で現在バージョン表示
- **更新確認**: ボタン押下 → `CHECK_UPDATE` メッセージで background に委譲 → 結果を `updateCheck` から読んで表示
- **登録セクション**: 対象ページにいるとき「Yes」で `REGISTER_DATA` を content script に送信
- **進捗UI**: content script からの `PROGRESS_UPDATE` でステップ表示を更新
- **データ設定**: 削除 / エクスポート(JSON) / インポート(JSON)

### `entrypoints/popup/index.html`

ポップアップのHTML。CSSもここに `<style>` タグでインライン記述。

---

## npm scripts

| コマンド | 内容 |
|---|---|
| `npm run dev` | Chrome 開発サーバー（HMR） |
| `npm run dev:firefox` | Firefox 開発サーバー |
| `npm run build` | Chrome プロダクションビルド |
| `npm run build:firefox` | Firefox プロダクションビルド |
| `npm run build:all` | **Chrome + Firefox 両方ビルド** |
| `npm run zip` | Chrome ビルド + ZIP |
| `npm run zip:firefox` | Firefox ビルド + ZIP + ソースZIP |
| `npm run zip:all` | **Chrome + Firefox 両方の ZIP 生成** |

---

## リリース方法

AIに以下を伝えるだけでいい:

> 「x.y.z でリリースして」

AIがやること:

1. `package.json` の `version` を `x.y.z` に変更
2. `npm run build:all` でビルド確認
3. `git add . && git commit -m "chore: bump version to x.y.z"`
4. `git tag vx.y.z`
5. `git push origin main && git push origin vx.y.z`

タグ `v*` の push をトリガーに GitHub Actions が走り、Chrome/Firefox 両方の ZIP をビルドして GitHub Release に添付する。

### CI/CD の仕組み (`.github/workflows/build.yml`)

- トリガー: `v*` タグの push、または手動実行（workflow_dispatch）
- 処理: `npm ci` → `npm run zip:all` → `softprops/action-gh-release` でリリース作成 + ZIP 添付
- 手動実行で既存タグを指定すれば、そのリリースに assets を追加/更新できる

### AMO（Firefox アドオンストア）

- 別途手動で https://addons.mozilla.org にアップロード
- `.output/goodbyelmspage-x.y.z-firefox.zip` をアップロード
- ソース提出が必要な場合は `.output/goodbyelmspage-x.y.z-sources.zip` を添付

---

## ストレージ構造 (`browser.storage.local`)

| キー | 型 | 内容 |
|---|---|---|
| `allLectureData` | `QuarterData[]` | 年度・Q単位の講義データ（メイン） |
| `lectureData` | `LectureEntry[]` | 旧形式（後方互換、マイグレーション対象） |
| `updateCheck` | `UpdateCheck` | 最新バージョン情報・確認日時 |

---

## メッセージング（content ↔ background ↔ popup）

| type | 方向 | 内容 |
|---|---|---|
| `TABLE_DETECTED` | content → background | 時間割テーブル検出 |
| `GLOW_ICON` | content → background | バッジに星マーク表示 |
| `GET_STATUS` | popup → content | テーブル検出済みか確認 |
| `REGISTER_DATA` | popup → content | データ登録開始 |
| `PROGRESS_UPDATE` | content → popup | 進捗通知（step, status, detail） |
| `FETCH_ERROR` | content → popup | fetchエラー件数通知 |
| `FETCH_URL` | content → background | クロスオリジンfetch代行 |
| `CHECK_UPDATE` | popup → background | 更新確認実行 |

---

## 注意事項

- **`chrome.*` は絶対使うな** → `browser.*` に統一（WXTのポリフィルで両ブラウザ動く）
- `wxt.config.ts` の `host_permissions` を変えたらビルドし直すこと（manifest に反映される）
- `.DS_Store` は `.gitignore` 済み、コミットしないこと
