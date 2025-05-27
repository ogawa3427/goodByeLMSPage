// クソみたいなLMSのデータを読み込む
chrome.storage.local.get(['courseData'], (result) => {
  if (chrome.runtime.lastError) {
    console.error('データの読み込みに失敗:', chrome.runtime.lastError);
    return;
  }

  const data = result.courseData;
  if (!data) {
    console.log('データが存在しません。クソみたいなLMSからデータを取得してください。');
    return;
  }

  // ネストされたクソみたいな構造から実際のデータを取り出す
  const courseData = data.courseData;
  console.log('取得した授業データ:', courseData);

  // タイムスタンプの確認
  const timestamp = data.timestamp;
  const now = Date.now();
  const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30日

  if (now - timestamp > CACHE_EXPIRY) {
    console.log('データの有効期限が切れています。クソみたいなLMSから再取得してください。');
  } else {
    console.log('データは有効です。最終更新:', new Date(timestamp).toLocaleString());
  }

  // テーブルを作成
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.style.marginTop = '20px';

  // ヘッダー行を作成
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['時限', '科目名', '教員名', 'LMSリンク'].forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    th.style.border = '1px solid #ddd';
    th.style.padding = '8px';
    th.style.backgroundColor = '#f2f2f2';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // データ行を作成
  const tbody = document.createElement('tbody');
  Object.entries(courseData).forEach(([timeSlot, course]) => {
    const row = document.createElement('tr');
    
    // 時限
    const tdTime = document.createElement('td');
    tdTime.textContent = timeSlot;
    tdTime.style.border = '1px solid #ddd';
    tdTime.style.padding = '8px';
    row.appendChild(tdTime);

    // 科目名
    const tdSubject = document.createElement('td');
    tdSubject.textContent = course.subject;
    tdSubject.style.border = '1px solid #ddd';
    tdSubject.style.padding = '8px';
    row.appendChild(tdSubject);

    // 教員名
    const tdTeacher = document.createElement('td');
    tdTeacher.textContent = course.teacher;
    tdTeacher.style.border = '1px solid #ddd';
    tdTeacher.style.padding = '8px';
    row.appendChild(tdTeacher);

    // LMSリンク
    const tdLink = document.createElement('td');
    const link = document.createElement('a');
    link.href = course.lmsLink;
    link.textContent = 'LMSへ';
    link.target = '_blank';
    tdLink.appendChild(link);
    tdLink.style.border = '1px solid #ddd';
    tdLink.style.padding = '8px';
    row.appendChild(tdLink);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // テーブルをbodyに追加
  document.body.appendChild(table);
});
