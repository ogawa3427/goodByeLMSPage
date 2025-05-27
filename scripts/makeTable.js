(() => {
  console.log('makeTable.js (readyState対応版) 読み込み');
  
  // データの有効期限（1ヶ月）
  const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;
  
  // データをlocalStorageに保存する関数
  const saveToLocalStorage = (staffInfo) => {
    try {
      const data = {
        staffInfo,
        timestamp: Date.now()
      };
      localStorage.setItem('staffInfo', JSON.stringify(data));
      console.log('データをlocalStorageに保存しました');
    } catch (error) {
      console.error('localStorageへの保存に失敗:', error);
    }
  };

  // localStorageからデータを読み込む関数
  const loadFromLocalStorage = () => {
    try {
      const data = localStorage.getItem('staffInfo');
      if (!data) return null;

      const parsedData = JSON.parse(data);
      const now = Date.now();
      
      // データの有効期限をチェック
      if (now - parsedData.timestamp > CACHE_EXPIRY) {
        console.log('キャッシュの有効期限が切れています');
        localStorage.removeItem('staffInfo');
        return null;
      }

      console.log('キャッシュされたデータを使用します');
      return parsedData.staffInfo;
    } catch (error) {
      console.error('localStorageからの読み込みに失敗:', error);
      return null;
    }
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
    // まずlocalStorageからデータを確認
    // const cachedData = loadFromLocalStorage();
    // if (cachedData) {
    //   return cachedData;
    // }

    // ユーザーに確認
    const shouldFetch = confirm('新しいデータを取得しますか？\n※多数のGETリクエストが発生します');
    if (!shouldFetch) {
      console.log('ユーザーがデータ取得をキャンセルしました');
      return [];
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const periods = ['1', '2', '3', '4', '5'];
    const staffInfo = [];
    
    for (const day of days) {
      for (const period of periods) {
        const id = `#ctl00_phContents_rrMain_ttTable_lct${day}${period}_ctl00_lblStaffName`;
        const staffElement = document.querySelector(id);
        if (staffElement) {
          const linkElement = staffElement.querySelector('a');
          if (linkElement) {
            const name = linkElement.textContent.trim();
            const url = linkElement.href;
            if (name) {
              const lmsLink = await fetchUrl(url);
              staffInfo.push({ name, url, lmsLink, day, period });
              console.log(`要素発見: ${day}${period} - ${name} - ${url}`);
            }
          }
        }
      }
    }
    
    if (staffInfo.length === 0) {
      console.log('教員名要素が見つかりません');
      return [];
    }

    // データをlocalStorageに保存
    saveToLocalStorage(staffInfo);
    
    return staffInfo;
  };

  // 教員情報を探してログ出力
  const logStaffInfo = async () => {
    const staffInfo = await getStaffInfo();
    if (staffInfo.length > 0) {
      console.log('教員情報一覧:', staffInfo);
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