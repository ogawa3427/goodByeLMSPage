(() => {
  console.log('makeTable.js (readyState対応版) 読み込み');
  
  // データの有効期限（1ヶ月）
  const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;
  
  // データをchrome.storage.localに保存する関数
  const saveToStorage = (courseData) => {
    try {
      const data = {
        courseData,
        timestamp: Date.now()
      };
      chrome.storage.local.set({ courseData: data }, () => {
        if (chrome.runtime.lastError) {
          console.error('ストレージへの保存に失敗:', chrome.runtime.lastError);
          return;
        }
        console.log('授業データをストレージに保存しました');
      });
    } catch (error) {
      console.error('ストレージへの保存に失敗:', error);
    }
  };

  // chrome.storage.localからデータを読み込む関数
  const loadFromStorage = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['courseData'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('ストレージからの読み込みに失敗:', chrome.runtime.lastError);
          resolve(null);
          return;
        }

        const data = result.courseData;
        if (!data) {
          resolve(null);
          return;
        }

        const now = Date.now();
        
        // データの有効期限をチェック
        if (now - data.timestamp > CACHE_EXPIRY) {
          console.log('キャッシュの有効期限が切れています');
          chrome.storage.local.remove('courseData');
          resolve(null);
          return;
        }

        console.log('キャッシュされた授業データを使用します');
        resolve(data.courseData);
      });
    });
  };

  // URLに対してGETリクエストを送信する関数
  const fetchUrl = async (url) => {
    try {
      // 0.5秒待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(url);
      const text = await response.text();
      
      // LMSリンクを抽出
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const lmsLink = doc.querySelector('a[href*="acanthus.cis.kanazawa-u.ac.jp/base/lms-course/sso-link/"]');
      
      if (lmsLink) {
        console.log(`LMSリンク発見: ${lmsLink.href}`);
        return lmsLink.href;
      }
      
      return null;
    } catch (error) {
      console.error(`URL: ${url} のリクエストに失敗:`, error);
      return null;
    }
  };

  // 教員名とURLを取得する関数
  const getStaffInfo = async () => {
    // まずストレージからデータを確認
    const cachedData = await loadFromStorage();
    if (cachedData) {
      return cachedData;
    }

    // ユーザーに確認
    const shouldFetch = confirm('新しいデータを取得しますか？\n※多数のGETリクエストが発生します');
    if (!shouldFetch) {
      console.log('ユーザーがデータ取得をキャンセルしました');
      return {};
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const periods = ['1', '2', '3', '4', '5'];
    const courseData = {};
    
    for (const day of days) {
      for (const period of periods) {
        const id = `#ctl00_phContents_rrMain_ttTable_lct${day}${period}_ctl00_lblStaffName`;
        const staffElement = document.querySelector(id);
        if (staffElement) {
          const linkElement = staffElement.querySelector('a');
          if (linkElement) {
            const fullText = linkElement.textContent.trim();
            const url = linkElement.href;
            
            // 科目名と教員名を分離
            const match = fullText.match(/(.*?)\((.*?)\)/);
            if (match) {
              const [_, subject, teacher] = match;
              const lmsLink = await fetchUrl(url);
              
              courseData[`${day}${period}`] = {
                subject: subject.trim(),
                teacher: teacher.trim(),
                lmsLink: lmsLink,
                url: url
              };
              
              console.log(`要素発見: ${day}${period} - ${fullText} - ${url}`);
            }
          }
        }
      }
    }
    
    if (Object.keys(courseData).length === 0) {
      console.log('教員名要素が見つかりません');
      return {};
    }

    // データをストレージに保存
    saveToStorage(courseData);
    
    return courseData;
  };

  // 教員情報を探してログ出力
  const logStaffInfo = async () => {
    const courseData = await getStaffInfo();
    if (Object.keys(courseData).length > 0) {
      console.log('授業データ一覧:', courseData);
    }
  };

  // 1) ページがすでに読み込み完了してるなら即実行
  if (document.readyState === 'complete') {
    console.log('document.readyState=complete: 直接パッチ');
    logStaffInfo();
  } else {
    // 2) まだ読み込み中なら load 後に実行
    window.addEventListener('load', () => {
      console.log('window.onload: パッチ実行');
      logStaffInfo();
    });
  }
})();

// メニュー
// https://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Acting/ActingList.aspx?lct_year=2025&lct_term=00&lct_cd=55-23124

// 詳細
// https://acanthus.cis.kanazawa-u.ac.jp/base/lms-course/sso-link/?courseId=25035531116000&systemType=1