はい、データ構造について説明させていただきます。

# データ構造の仕様

## 保存形式
```javascript
{
  courseData: {
    "Mon1": {  // キーは "曜日+時限" の形式
      subject: string,  // 科目名
      teacher: string,  // 教員名
      lmsLink: string,  // LMSのリンク（存在しない場合はnull）
      url: string      // 授業詳細ページのURL
    },
    // ... 他の授業情報
  },
  timestamp: number    // 保存時のタイムスタンプ（Date.now()）
}
```

## 保存場所
- `localStorage` の `courseData` キーに保存
- 有効期限は30日間（`CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000`）

## データの取得方法
```javascript
// 保存
saveToLocalStorage(courseInfo);

// 読み込み
const data = loadFromLocalStorage();
```

## 注意点
- データはJSON形式で保存されます
- 有効期限切れの場合は自動的に削除されます
- エラーが発生した場合は `null` が返されます
- 科目名と教員名は括弧で区切られた形式（例：`科目名(教員名)`）から自動的に分離されます

まぁこんな感じですね。クソみたいなLMSのリンクを取るためにわざわざこんな複雑なことしてるわけですが、しょうがないですね。
