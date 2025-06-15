#!/bin/bash

# 現在のバージョンを取得する関数
get_current_version() {
    version=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "現在のバージョン: $version"
}

# 引数チェック
if [ $# -eq 0 ]; then
    get_current_version
    exit 0
elif [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "使用方法: $0 [バージョン] [コミットメッセージ]"
    echo "例: $0 0.0.2 \"新機能追加\""
    echo "バージョンを指定しない場合は現在のバージョンが表示されます"
    echo "コミットメッセージを省略した場合はデフォルトメッセージが使用されます"
    exit 1
fi

NEW_VERSION=$1
COMMIT_MESSAGE=${2:-"chore: bump version to $NEW_VERSION"}

# package.jsonの更新
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json

# manifest.jsonの更新
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" app/manifest.json

# popup.htmlの更新
sed -i '' "s/<p class=\"version\">v.*<\/p>/<p class=\"version\">v$NEW_VERSION<\/p>/" app/pages/popup.html

# 変更をコミット
git add -A
git add package.json app/manifest.json app/pages/popup.html
git commit -m "$COMMIT_MESSAGE"

# タグの作成とプッシュ
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "バージョン $NEW_VERSION への更新が完了しました" 