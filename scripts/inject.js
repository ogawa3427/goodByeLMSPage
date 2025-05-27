(() => {
  // 重複実行防止
  if (window.lmsPatchInitialized) {
    console.log('既に初期化済みのためスキップ');
    return;
  }

  console.log('inject.js (readyState対応版) 読み込み開始');
  console.log('現在のreadyState:', document.readyState);

  // キャッシュの有効期限（30日）
  const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;
  console.log('キャッシュ有効期限:', CACHE_EXPIRY, 'ms');

  // データを保存する関数
  const saveToStorage = (courseInfo) => {
    try {
      chrome.storage.local.set({ courseInfo }, () => {
        if (chrome.runtime.lastError) {
          console.error('ストレージへの保存に失敗:', chrome.runtime.lastError);
          return;
        }
        console.log('授業情報をストレージに保存しました');
      });
    } catch (error) {
      console.error('ストレージ操作でエラーが発生:', error);
    }
  };

  // 実際の置換処理
  const patchLmsLink = () => {
    console.log('LMSリンクのパッチ処理開始');
    // ヘッダーメニューのリンクも含める
    const links = document.querySelectorAll('a[onclick*="openMenuFunc"][onclick*="lms-course"], .base-header__custom-menu a[onclick*="openMenuFunc"][onclick*="lms-course"]');
    console.log('対象リンク数:', links.length);

    links.forEach((link, index) => {
      console.log(`リンク ${index + 1} の処理開始:`, link.href);
      
      if (link.dataset.lmsPatched === '1') {
        console.log('既にパッチ済みのためスキップ:', link.href);
        return;
      }
      link.dataset.lmsPatched = '1';

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
      
      const [_, subject, teacher] = match;
      const courseInfo = {
        subject: subject.trim(),
        teacher: teacher.trim(),
        url: firstCell.querySelector('a')?.href || '',
        lmsLink: link.href,
        day: row.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
        period: row.querySelector('td:nth-child(3)')?.textContent?.trim() || ''
      };
      console.log('抽出した授業情報:', courseInfo);

      // データを保存
      saveToStorage(courseInfo);
      console.log('ストレージに保存完了');

      // ベースURLにJSONデータを追加
      const baseUrl = 'https://ogawa3427.github.io/goodByeLMSPage/';
      const params = new URLSearchParams();
      params.set('data', JSON.stringify(courseInfo));
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

      console.log('★ LMSリンクのパッチ適用完了:', link.href);
    });
  };

  // DOMの読み込みを待機してから実行
  const waitForDOM = () => {
    console.log('DOMの読み込み待機中...');
    const observer = new MutationObserver((muts, obs) => {
      const links = document.querySelectorAll('a[onclick*="openMenuFunc"][onclick*="lms-course"]');
      if (links.length > 0) {
        console.log('対象リンクを検出:', links.length);
        obs.disconnect();
        patchLmsLink();
        
        // 動的追加の監視を開始
        console.log('MutationObserverの設定開始');
        new MutationObserver(muts => {
          console.log('DOM変更を検出:', muts.length, '件');
          muts.forEach(m => {
            m.addedNodes.forEach(node => {
              if (node.nodeType === 1 && node.querySelectorAll) {
                const newLinks = node.querySelectorAll('a[onclick*="openMenuFunc"][onclick*="lms-course"]');
                if (newLinks.length > 0) {
                  console.log('新規追加されたリンク数:', newLinks.length);
                  patchLmsLink();
                }
              }
            });
          });
        }).observe(document.body, { childList: true, subtree: true });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // 初期化処理を実行
  const initialize = () => {
    try {
      // 即時実行のパッチ処理
      const immediateLinks = document.querySelectorAll('a[onclick*="openMenuFunc"][onclick*="lms-course"]');
      if (immediateLinks.length > 0) {
        console.log('即時実行: 対象リンクを検出:', immediateLinks.length);
        patchLmsLink();
      }

      // readyStateに応じた処理
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('document.readyState=' + document.readyState + ': 待機開始');
        waitForDOM();
      } else {
        console.log('window.onload待機中...');
        window.addEventListener('load', () => {
          console.log('window.onload: 待機開始');
          waitForDOM();
        });
      }
    } catch (error) {
      console.error('初期化処理でエラーが発生:', error);
    }
  };

  // 初期化処理を実行
  initialize();
  
  // 初期化完了フラグを設定
  window.lmsPatchInitialized = true;
})(); 