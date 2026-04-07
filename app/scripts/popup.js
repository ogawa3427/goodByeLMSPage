console.log('Good Bye LMS Page - Popup loaded');

// DOM要素がロードされた後に実行
document.addEventListener('DOMContentLoaded', function() {
  // ブラウザ互換性のための統一されたAPI取得
  const browserAPI = (() => {
    if (typeof browser !== 'undefined') {
      return browser; // Firefox, Safari
    }
    if (typeof chrome !== 'undefined') {
      return chrome; // Chrome
    }
    throw new Error('Browser API not found');
  })();

  // ブラウザタイプを判定
  const isFirefox = typeof browser !== 'undefined' && !chrome;
  console.log('Browser detected:', isFirefox ? 'Firefox' : 'Chrome/Chromium');

  // URLチェックと背景色変更
  browserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const targetUrl = 'https://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx';
    
    if (currentTab.url === targetUrl) {
      document.body.style.backgroundColor = '#CCCCFF'; // 青色
    } else {
      document.body.style.backgroundColor = '#9898AA'; // 灰色
    }
  });

  // ストレージから取得済みデータを表示する関数
  const displaySavedData = () => {
    browserAPI.storage.local.get(['courseData'], (result) => {
      const savedDataDiv = document.querySelector('.saved-data ul.menu-list');
      
      if (browserAPI.runtime.lastError) {
        console.error('ストレージからの読み込みに失敗:', browserAPI.runtime.lastError);
        savedDataDiv.innerHTML = '<li>データの読み込みに失敗しました</li>';
        return;
      }

      const data = result.courseData;
      if (!data || !data.courseData || Object.keys(data.courseData).length === 0) {
        savedDataDiv.innerHTML = '<li>空です。<a href="https://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx" target="_blank">https://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx</a>にアクセスしてデータを入れてください</li>';
        return;
      }

      // データが存在する場合
      const courseData = data.courseData;
      const timestamp = new Date(data.timestamp).toLocaleString('ja-JP');
      let html = `<li style="color: #666; font-size: 12px;">取得日時: ${timestamp}</li>`;
      
      const dayNames = {
        'Mon': '月',
        'Tue': '火', 
        'Wed': '水',
        'Thu': '木',
        'Fri': '金'
      };

      // 月1〜金5の順番でソート
      const sortedKeys = Object.keys(courseData).sort((a, b) => {
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const dayA = a.substring(0, 3);
        const dayB = b.substring(0, 3);
        const periodA = parseInt(a.substring(3));
        const periodB = parseInt(b.substring(3));
        
        const dayIndexA = dayOrder.indexOf(dayA);
        const dayIndexB = dayOrder.indexOf(dayB);
        
        if (dayIndexA !== dayIndexB) {
          return dayIndexA - dayIndexB;
        }
        return periodA - periodB;
      });

      sortedKeys.forEach(key => {
        const course = courseData[key];
        const day = key.substring(0, 3);
        const period = key.substring(3);
        const dayJp = dayNames[day] || day;
        
        // 科目名をリンクにする（LMSリンクがあれば）
        let subjectDisplay;
        if (course.lmsLink) {
          subjectDisplay = `<a href="${course.lmsLink}" target="_blank" style="color: #0066cc; text-decoration: underline;">${course.subject}</a>`;
        } else {
          subjectDisplay = course.subject;
        }
        
        html += `<li>${dayJp}${period}: ${subjectDisplay}</li>`;
      });
      
      savedDataDiv.innerHTML = html;
    });
  };

  // ページから基本データを取得する関数（executeScript最小化版）
  const extractBasicDataFromPage = (tabId) => {
    console.log('ページから基本データを取得中...');
    
    // データ抽出用の関数（Chrome用）
    const extractFunction = function() {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const periods = ['1', '2', '3', '4', '5'];
      const courseData = {};

      for (const day of days) {
        for (const period of periods) {
          const id = '#ctl00_phContents_rrMain_ttTable_lct' + day + period + '_ctl00_lblStaffName';
          const staffElement = document.querySelector(id);
          if (staffElement) {
            const linkElement = staffElement.querySelector('a');
            if (linkElement) {
              const fullText = linkElement.textContent.trim();
              const url = linkElement.href;
              
              const match = fullText.match(/(.*?)\((.*?)\)/);
              if (match) {
                courseData[day + period] = {
                  subject: match[1].trim(),
                  teacher: match[2].trim(),
                  url: url
                };
              }
            }
          }
        }
      }
      
      return courseData;
    };

    // Firefox用の文字列コード（仕方なく）
    const extractScriptForFirefox = `
      (function() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const periods = ['1', '2', '3', '4', '5'];
        const courseData = {};

        for (const day of days) {
          for (const period of periods) {
            const id = '#ctl00_phContents_rrMain_ttTable_lct' + day + period + '_ctl00_lblStaffName';
            const staffElement = document.querySelector(id);
            if (staffElement) {
              const linkElement = staffElement.querySelector('a');
              if (linkElement) {
                const fullText = linkElement.textContent.trim();
                const url = linkElement.href;
                
                const match = fullText.match(/(.*?)\\((.*?)\\)/);
                if (match) {
                  courseData[day + period] = {
                    subject: match[1].trim(),
                    teacher: match[2].trim(),
                    url: url
                  };
                }
              }
            }
          }
        }
        
        return courseData;
      })();
    `;

    // Firefox専用処理（文字列コード実行）
    if (isFirefox && browserAPI.tabs && browserAPI.tabs.executeScript) {
      /* FIREFOX_EVAL_START */
      return new Promise((resolve, reject) => {
        browserAPI.tabs.executeScript(tabId, { code: extractScriptForFirefox }, (result) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(result && result[0] ? result[0] : {});
          }
        });
      });
      /* FIREFOX_EVAL_END */
    } 
    // Chrome用処理（関数オブジェクトを使用してCSP回避）
    else if (browserAPI.scripting && browserAPI.scripting.executeScript) {
      return browserAPI.scripting.executeScript({
        target: { tabId },
        func: extractFunction
      }).then(result => result && result[0] && result[0].result ? result[0].result : {});
    } 
    // Fallback（Firefox以外でtabs.executeScriptが使える場合）
    else if (browserAPI.tabs && browserAPI.tabs.executeScript) {
      /* FIREFOX_FALLBACK_START */
      return new Promise((resolve, reject) => {
        browserAPI.tabs.executeScript(tabId, { code: extractScriptForFirefox }, (result) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(result && result[0] ? result[0] : {});
          }
        });
      });
      /* FIREFOX_FALLBACK_END */
    } 
    else {
      return Promise.reject(new Error('No compatible script execution API found'));
    }
  };

  // LMSリンクを取得する関数（popup内で直接実行）
  const fetchLMSLink = async (url) => {
    try {
      console.log(`LMSリンク取得中: ${url}`);
      
      // 0.5秒待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(url);
      const text = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const lmsLink = doc.querySelector('a[href*="acanthus.cis.kanazawa-u.ac.jp/base/lms-course/sso-link/"]');
      
      if (lmsLink) {
        console.log(`LMSリンク発見: ${lmsLink.href}`);
        return lmsLink.href;
      }
      
      return null;
    } catch (error) {
      console.error(`LMSリンク取得エラー: ${url}`, error);
      return null;
    }
  };

  // 授業データ取得処理（メイン処理）
  const fetchCourseData = async (tabId) => {
    console.log('授業データ取得開始');
    
    // 既存データを削除
    await new Promise(resolve => {
      browserAPI.storage.local.remove('courseData', () => {
        console.log('既存データを削除');
        resolve();
      });
    });

    // 1. ページから基本データを取得
    const basicData = await extractBasicDataFromPage(tabId);
    
    if (Object.keys(basicData).length === 0) {
      throw new Error('授業データが見つかりませんでした');
    }

    console.log('基本データ取得完了:', basicData);

    // 2. 各授業のLMSリンクを取得
    const finalCourseData = {};
    
    for (const [key, course] of Object.entries(basicData)) {
      console.log(`${key}のLMSリンクを取得中...`);
      
      const lmsLink = await fetchLMSLink(course.url);
      
      finalCourseData[key] = {
        ...course,
        lmsLink: lmsLink
      };
      
      if (lmsLink) {
        console.log(`${key}: LMSリンク取得成功`);
      } else {
        console.log(`${key}: LMSリンクなし`);
      }
    }

    // 3. データを保存
    const dataToSave = {
      courseData: finalCourseData,
      timestamp: Date.now()
    };

    await new Promise((resolve, reject) => {
      browserAPI.storage.local.set({ courseData: dataToSave }, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          console.log('データ保存完了');
          resolve();
        }
      });
    });

    return finalCourseData;
  };

  // 取得済みデータを表示
  displaySavedData();

  // 時間割表作成ボタン
  document.getElementById('btn-make-table').addEventListener('click', async function() {
    try {
      const tabs = await new Promise(resolve => {
        browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
      });
      
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx')) {
        alert('このボタンは学務情報システムの時間割ページでのみ利用できます。\n\n以下のURLにアクセスしてから再度お試しください：\nhttps://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx');
        return;
      }

      console.log('時間割データ取得開始');
      
      const courseData = await fetchCourseData(currentTab.id);
      
      console.log('時間割データ取得完了:', courseData);
      alert('時間割データの取得が完了しました！');
      
      // 表示を更新
      displaySavedData();
      
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データ取得に失敗しました: ' + error.message);
    }
    
    window.close();
  });

  // データ全消去ボタン
  document.getElementById('btn-clear-data').addEventListener('click', function() {
    if (confirm('保存されている授業データを全て削除しますか？\nこの操作は取り消せません。')) {
      browserAPI.storage.local.clear(() => {
        if (browserAPI.runtime.lastError) {
          alert('データの削除に失敗しました: ' + browserAPI.runtime.lastError.message);
        } else {
          alert('全てのデータを削除しました。');
          // データ削除後に表示を更新
          displaySavedData();
        }
      });
    }
    window.close();
  });

  // フォーカス管理
  document.getElementById('btn-make-table').focus();
  
  console.log('Good Bye LMS Page - All event listeners attached');
});

// エラーハンドリング
window.addEventListener('error', function(e) {
  console.error('Popup error:', e.error);
});
