# Good Bye LMS Page

金沢大学のクソみたいなLMSを少しでも使いやすくするためのChrome拡張機能です。

## 機能

- アカンサスのLMSリンクを直接開けるようにパッチ
- eduwebの時間割から授業情報を取得
- 授業情報をテーブル形式で表示

## インストール方法

1. このリポジトリをクローン
```bash
git clone https://github.com/ogawa3427/goodByeLMSPage.git
```

2. Chrome拡張機能の管理ページを開く
   - Chromeのアドレスバーに `chrome://extensions/` と入力
   - 右上の「デベロッパーモード」をオン

3. 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `goodByeLMSPage/app` ディレクトリを選択

## 使い方

1. eduwebの時間割ページにアクセス
   - データ取得の確認ダイアログが表示されたら「OK」をクリック
   - 授業情報が自動的に取得・保存されます

2. アカンサスのLMSページにアクセス
   - LMSリンクが自動的にパッチされ、直接開けるようになります

3. GitHub Pagesのページにアクセス
   - 保存された授業情報がテーブル形式で表示されます

## 注意事項

- データの有効期限は30日間です
- 多数のGETリクエストが発生する場合があります
- この拡張機能は非公式であり、金沢大学とは一切関係ありません

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev chrome
```

## ビルド

```bash
# Chrome用にビルド
npm run build chrome
```

## ライセンス

MIT

## Environment

The build tool also defines a variable named `process.env.NODE_ENV` in your scripts. 

## Docs

* [webextension-toolbox](https://github.com/HaNdTriX/webextension-toolbox)


金沢大学のLMS(講義サポートサービス)での各講義ごとのリンクを保持して一覧ページを作成する拡張機能です。
機能は3つ、
1 リンクを公式の見づらいサイトから一覧から取得
2 公式のトップページにリンクを追加
3 リンク先でその保存した一覧を表示
この過程でID/PWや履修講義情報を外部に送信しません。

This is an extension that keeps links for each lecture in Kanazawa University's LMS (Lecture Support Service) and creates a list page.
It has three functions:
1. Get links from the official, hard-to-see site.
2. Add a link to the official top page.
3. Display the saved list at the link destination.
In this process, ID/PW and course registration information are not sent externally.