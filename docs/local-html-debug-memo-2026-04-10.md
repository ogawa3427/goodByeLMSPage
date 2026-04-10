# ローカル保存HTMLでの ERR_FILE_NOT_FOUND メモ（2026-04-10）

`file:///.../時間割Q1.html` を直接開くと、元ページが参照している CSS/JS/画像（`/Portal/...` や `/Users/...`）が `file://` 基準で解決されるため、ほぼ確実に `ERR_FILE_NOT_FOUND` になる。

`Sys is not defined` は `ScriptResource.axd` などの ASP.NET 側スクリプトが読み込めなかった副作用。

拡張側でローカルHTMLを試しやすくするため、以下を実施。

- `wxt.config.ts` の `host_permissions` に `file:///*` を追加
- `entrypoints/content.ts` の `matches` に `file:///*` を追加
- テーブル探索の fallback を追加（`table[id*="tblLecture"]` ベース）

## ucCourseSchedule パスの両対応（2026-04-10追記）

`rrMain` と `ucCourseSchedule` でテーブル内のIDパターンが異なる。

- `rrMain`: `_lct{Day}{Period}_ctl00_lblLctCd`（1スロット1エントリ）
- `ucCourseSchedule`: `_lct{Day}{Period}_ctl{nn}_lblLctCd`（1スロット複数エントリあり、空セルは `_ctl00`）

`parseTable` を固定 `_ctl00` から全 `_lblLctCd` を拾うIDパース方式に変更。

科目名も `rrMain` は `lblStaffName`、`ucCourseSchedule` は `lblLctName` フォールバックで両対応。

Qドロップダウン ID も両対応:
- `rrMain`: `ctl00_phContents_ucRegistSearchList_ddlTerm`
- `ucCourseSchedule`: `ctl00_phContents_ucCourseSchedule_ddlTerm`

注意:

- Chrome の場合は拡張詳細で「ファイルのURLへのアクセスを許可」をONにしないと `file://` で content script が動かない。
