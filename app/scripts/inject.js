// アカンサスのページに注入されるスクリプト
console.log('アカンサスのトップページに注入されました');

// ここに必要なDOM操作を追加
// document.addEventListener('DOMContentLoaded', () => {
  // ページの読み込み完了時の処理

// });

(() => {
  // 重複実行防止
  // if (window.lmsPatchInitialized) {
  //   console.log('既に初期化済みのためスキップ');
  //   return;
  // }

  console.log('inject.js (readyState対応版) 読み込み開始');
  console.log('現在のreadyState:', document.readyState);

  const patchLmsLink = () => {
    console.log('patchLmsLink開始');
    
    // 複数のセレクタでLMSリンクを取得
    const selectors = [
      // 従来のhref指定
      'a[href*="acanthus.cis.kanazawa-u.ac.jp/base/lms-course/list"]',
      // javascript:void(0)でonclick属性にlms-course/listが含まれるもの
      'a[href="javascript:void(0);"][onclick*="/base/lms-course/list"]',
      // spanにLMSコース（WebClass）が含まれるリンク
      'a[href="javascript:void(0);"] span:contains("LMSコース（WebClass）")',
      // より広範囲でLMSコースを含むspan要素の親リンク
      'a:has(span:contains("LMSコース"))',
      // onclick属性でlms-courseを含むリンク
      'a[onclick*="lms-course"]'
    ];
    
    let links = [];
    selectors.forEach(selector => {
      try {
        const foundLinks = document.querySelectorAll(selector);
        foundLinks.forEach(link => {
          if (!links.includes(link)) {
            links.push(link);
          }
        });
      } catch (e) {
        console.log(`セレクタエラー (${selector}):`, e);
      }
    });
    
    // 手動でspan要素のテキストをチェック（:containsが使えない場合の代替）
    if (links.length === 0) {
      const allLinks = document.querySelectorAll('a[href="javascript:void(0);"]');
      allLinks.forEach(link => {
        const span = link.querySelector('span');
        if (span && (span.textContent.includes('LMSコース') || span.textContent.includes('WebClass'))) {
          links.push(link);
        }
        // onclick属性もチェック
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes('/base/lms-course/list')) {
          if (!links.includes(link)) {
            links.push(link);
          }
        }
      });
    }
    
    console.log('LMSリンク数:', links.length);
    console.log('見つかったリンク:', links);

    links.forEach((link, index) => {
      console.log(`リンク ${index + 1} の処理開始:`, link.href);

      // ヘッダーメニューの場合は特別な処理
      if (link.closest('.base-header__custom-menu')) {
        console.log('ヘッダーメニューのリンクを処理中');
        const baseUrl = 'https://ogawa3427.github.io/goodByeLMSPage/';
        const params = new URLSearchParams();
        params.set('data', JSON.stringify({
          subject: '',
          teacher: '',
          url: '',
          lmsLink: link.href,
          day: '',
          period: ''
        }));
        const newHref = `${baseUrl}?${params.toString()}`;
        console.log('新しいURL:', newHref);
        
        link.href = newHref;
        link.target = '_blank';
        const span = link.querySelector('span');
        if (span) {
          console.log('span要素のテキストを変更:', span.textContent, '→ LMS');
          span.textContent = 'LMS';
        }

        // onclick属性を削除
        console.log('onclick属性を削除');
        link.removeAttribute('onclick');

        link.addEventListener('click', e => {
          console.log('リンククリックイベント発生');
          e.preventDefault();
          e.stopImmediatePropagation();
          window.open(link.href, '_blank');
        }, true);

        console.log('★ ヘッダーメニューのLMSリンクのパッチ適用完了:', link.href);
        return;
      }

      // 授業情報を取得
      const row = link.closest('tr');
      if (!row) {
        console.log('行要素が見つかりません:', link);
        return;
      }

      const firstCell = row.querySelector('td:first-child');
      if (!firstCell) {
        console.log('最初のセルが見つかりません:', row);
        return;
      }

      const fullText = firstCell.textContent?.trim() || '';
      console.log('取得したテキスト:', fullText);
      
      if (!fullText) {
        console.log('テキストが空です。DOMの読み込みを待機します。');
        return;
      }
      
      const match = fullText.match(/(.*?)\((.*?)\)/);
      console.log('正規表現マッチ結果:', match);
      
      if (!match) {
        console.log('授業情報の抽出に失敗:', fullText);
        return;
      }

      // ベースURLにJSONデータを追加
      const newHref = 'https://ogawa3427.github.io/goodByeLMSPage/';

      console.log('新しいURL:', newHref);
      
      link.href = newHref;  
      link.target = '_blank';
      const span = link.querySelector('span');
      if (span) {
        console.log('span要素のテキストを変更:', span.textContent, '→ LMS');
        span.textContent = 'LMS';
      }

      // onclick属性を削除
      console.log('onclick属性を削除');
      link.removeAttribute('onclick');

      link.addEventListener('click', e => {
        console.log('リンククリックイベント発生');
        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(link.href, '_blank');
      }, true);

      console.log('★ LMSリンクのパッチ適用完了:', link.href);
    });
  };

  // // 1) ページがすでに読み込み完了してるなら即実行
  // if (document.readyState === 'complete') {
  //   console.log('document.readyState=complete: 直接パッチ');
  //   patchLmsLink();
  // } else {
  //   // 2) まだ読み込み中なら load 後に実行
  //   window.addEventListener('load', () => {
  //     console.log('window.onload: パッチ実行');
  //     patchLmsLink();
  //   });
  // }

  patchLmsLink();
})(); 