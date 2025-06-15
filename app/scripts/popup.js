console.log('Good Bye LMS Page - Popup loaded');

// DOM要素がロードされた後に実行
document.addEventListener('DOMContentLoaded', function() {
  // URLチェックと背景色変更
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
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
    chrome.storage.local.get(['courseData'], (result) => {
      const savedDataDiv = document.querySelector('.saved-data ul.menu-list');
      
      if (chrome.runtime.lastError) {
        console.error('ストレージからの読み込みに失敗:', chrome.runtime.lastError);
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

  // 取得済みデータを表示
  displaySavedData();

  // 時間割表作成ボタン
  document.getElementById('btn-make-table').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      if (currentTab.url.includes('eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx')) {
        // makeTable.jsの機能を直接実行
        console.log('makeTable.jsの機能を直接実行');
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: () => {
            console.log('eduwebのページで時間割データ取得を開始');
            
            // データの有効期限（1ヶ月）
            const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;
            
            // データをchrome.storage.localに保存する関数
            const saveToStorage = (courseData) => {
              try {
                const data = {
                  courseData,
                  timestamp: Date.now()
                };
                console.log('ストレージに保存するデータ:', data);
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

                  // データがある場合は削除してから新しいデータを取得
                  console.log('既存データが存在します。削除してから新しいデータを取得します。');
                  chrome.storage.local.remove('courseData', () => {
                    if (chrome.runtime.lastError) {
                      console.error('既存データの削除に失敗:', chrome.runtime.lastError);
                    } else {
                      console.log('既存データを削除しました');
                    }
                    resolve(null);
                  });
                });
              });
            };

            console.log('loadFromStorage関数が呼ばれました');

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
            
            console.log('fetchUrl関数が呼ばれました');

            // 教員名とURLを取得する関数
            const getStaffInfo = async () => {
              // まずストレージからデータを確認
              console.log('ストレージからデータを確認');
              const cachedData = await loadFromStorage();
              if (cachedData) {
                return cachedData;
              }

              // ユーザーに確認
              // const shouldFetch = confirm('新しいデータを取得しますか？\n※多数のGETリクエストが発生します');
              // const shouldFetch = true;
              // if (!shouldFetch) {
              //   console.log('ユーザーがデータ取得をキャンセルしました');
              //   return {};
              // }

              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
              const periods = ['1', '2', '3', '4', '5'];
              const courseData = {};

              console.log('getStaffInfo関数が呼ばれました');
              
              for (const day of days) {
                console.log('day:', day);
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
                        const subject = match[1];
                        const teacher = match[2];
                        console.log('subject:', subject);
                        console.log('teacher:', teacher);
                        console.log('url:', url);
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
              console.log('logStaffInfo関数が呼ばれました');
              const courseData = await getStaffInfo();
              if (Object.keys(courseData).length > 0) {
                console.log('授業データ一覧:', courseData);
              }
            };

            // 実行
            logStaffInfo();
          }
        }, () => {
          if (chrome.runtime.lastError) {
            alert('スクリプトの実行に失敗しました: ' + chrome.runtime.lastError.message);
          } else {
            alert('時間割データの取得を開始しました。コンソールで進捗を確認してください。');
            // データ取得後に表示を更新（少し遅延させる）
            setTimeout(() => {
              displaySavedData();
            }, 2000);
          }
        });
      } else {
        console.log('このボタンは学務情報システムの時間割ページでのみ利用できます。');
        alert('このボタンは学務情報システムの時間割ページでのみ利用できます。\n\n以下のURLにアクセスしてから再度お試しください：\nhttps://eduweb.sta.kanazawa-u.ac.jp/Portal/StudentApp/Regist/RegistList.aspx');
      }
    });
    window.close();
  });

  // データ全消去ボタン
  document.getElementById('btn-clear-data').addEventListener('click', function() {
    if (confirm('保存されている授業データを全て削除しますか？\nこの操作は取り消せません。')) {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          alert('データの削除に失敗しました: ' + chrome.runtime.lastError.message);
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
