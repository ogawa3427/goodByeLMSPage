(() => {
  console.log('inject.js (readyState対応版) 読み込み');

  // 実際の置換処理
  const patchLmsLink = () => {
    document.querySelectorAll('a[onclick*="lms-course"]').forEach(link => {
      if (link.dataset.lmsPatched) return;
      link.dataset.lmsPatched = '1';

      link.href = 'https://ogawa3427.github.io/goodByeLMSPage/';
      link.target = '_blank';
      const span = link.querySelector('span');
      if (span) span.textContent = 'LMS';

      link.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(link.href, '_blank');
      }, true);

      console.log('★ LMSリンクをパッチ適用:', link);
    });
  };

  // 1) ページがすでに読み込み完了してるなら即実行
  if (document.readyState === 'complete') {
    console.log('document.readyState=complete: 直接パッチ');
    patchLmsLink();
    // 動的追加も監視
    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.querySelectorAll) {
            node.querySelectorAll('a[onclick*="lms-course"]').forEach(_=>patchLmsLink());
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  } else {
    // 2) まだ読み込み中なら load 後に実行
    window.addEventListener('load', () => {
      console.log('window.onload: パッチ実行');
      patchLmsLink();
      new MutationObserver(muts => {
        muts.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.querySelectorAll) {
              node.querySelectorAll('a[onclick*="lms-course"]').forEach(_=>patchLmsLink());
            }
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    });
  }
})(); 