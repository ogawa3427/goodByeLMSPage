# 「登録できます」表示条件メモ（2026-04-10）

`entrypoints/popup/main.ts` の `init()` で、`GET_STATUS` を content script に送って `tableDetected` が `true` のときだけ `#register-section` を表示する。

`tableDetected` は `entrypoints/content.ts` の `runChecks()` で判定され、以下が 1 件以上あると `true` になる。

- `document.querySelectorAll('table[id*="tblLecture"]').length > 0`

つまり、対象ページ上に `id` に `tblLecture` を含む `table` が存在することが条件。

補足:

- `entrypoints/content.ts` の `matches` は以下のみ。
  - `https://acanthus.cis.kanazawa-u.ac.jp/*`
  - `https://eduweb.sta.kanazawa-u.ac.jp/*`
- したがって `file://...` のローカルHTMLは content script が注入されず、`GET_STATUS` に応答できないため登録UIは表示されない。
