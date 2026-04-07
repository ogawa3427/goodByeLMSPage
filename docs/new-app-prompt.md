# 新しい構造指示

- これまでのコードベースは全部消していいのでこれを実装してください
- chrome拡張機能であることには変わりないです

## 1.検知部分
- idがctl00_phContents_rrMain_ttTable_tblLectureまたはctl00_phContents_ucCourseSchedule_ttTable_tblLectureなtableがあるとき、ポップアップ(というかアイコンからメッセージ)を出して「データを登録できます！しますかYes/後で/もうだすなチェックボックス」を出してください
- lms-course-list-lms-noticeがclassになっているdivがあるページにきたら、アイコンがちょっと光った上に、そのdivを黄色く塗りつぶして

## 2. ポップアップ (アイコンクリック時に開くやつ)
- 拡張機能アイコンをクリックしたときに開くポップアップを作る
- 一番上に「登録しますか？」セクションを出す。ただし対象ページ（テーブル検知済みのページ）でないときは出さない
- その下にタイトル「Good Bye LMS Page」を表示する
- 一旦これだけ

https://acanthus.cis.kanazawa-u.ac.jp/base/lms-course/sso-link/?courseId=26010073H00130&systemType=1
