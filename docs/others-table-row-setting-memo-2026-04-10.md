# 集中講義テーブル行数の可変化メモ（2026-04-10）

一部環境で `集中講義` 側テーブルの `tbody > tr` 行数が 5 固定ではなく 4 になる事例があるため、探索行数を可変にした。

## 変更点

- `entrypoints/content.ts`
  - `othersTableRowCount` を `storage.local` から読む（未設定時は 5）
  - `findOthersTable(othersRowCount)` で `tbody>tr=<設定値>` を探索
  - エラーメッセージも `tbody>tr=<設定値>` 表示に変更

- `entrypoints/popup/index.html`
  - エラーセクション内に探索行数設定UIを追加（通常は非表示）

- `entrypoints/popup/main.ts`
  - Step1エラー時、`tbody>tr=` を含むメッセージなら設定UIを表示
  - 値保存ボタンで `othersTableRowCount` を保存

## 意図

「デフォルトは 5。4 の人は 4」をユーザー側で切り替え可能にして、ローカルHTML・本番差異の吸収を容易にする。
