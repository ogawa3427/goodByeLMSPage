(() => {
  const elem = document.querySelector('.btn-danger'); // 適宜変更
  if (elem) {
    elem.onclick = null;            // JS ハンドラ無効化
    elem.removeAttribute('onclick'); // インライン属性も削除
  }

  // 好きな a タグを追加
  const anchor = document.createElement('a');
  anchor.href = 'https://example.org/';
  anchor.textContent = '追加リンク';
  anchor.target = '_blank';
  document.body.append(anchor);
})(); 