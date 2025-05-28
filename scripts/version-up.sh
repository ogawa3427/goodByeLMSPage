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
elif [ $# -ne 1 ]; then
    echo "使用方法: $0 [バージョン]"
    echo "例: $0 0.0.2"
    echo "バージョンを指定しない場合は現在のバージョンが表示されます"
    exit 1
fi

NEW_VERSION=$1

# package.jsonの更新
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json

# manifest.jsonの更新
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" app/manifest.json

# 変更をコミット
git add package.json app/manifest.json
git commit -m "chore: bump version to $NEW_VERSION"

# タグの作成とプッシュ
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "バージョン $NEW_VERSION への更新が完了しました" 