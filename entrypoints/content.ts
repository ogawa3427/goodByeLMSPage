const TABLE_IDS = [
  'ctl00_phContents_rrMain_ttTable_tblLecture',
  'ctl00_phContents_ucCourseSchedule_ttTable_tblLecture',
];
const NOTICE_CLASS = 'lms-course-list-lms-notice';

interface LectureEntry {
  day: string;
  period: number;
  lctCd: string;
  syllabusUrl: string;
  subjectName: string;
  actingUrl: string;
  teacher: string;
  sbjDiv: string;
  credit: string;
  lmsUrl: string;
}

const DAYS = [
  { key: 'Mon', label: '月' },
  { key: 'Tue', label: '火' },
  { key: 'Wed', label: '水' },
  { key: 'Thu', label: '木' },
  { key: 'Fri', label: '金' },
  { key: 'Sat', label: '土' },
];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default defineContentScript({
  matches: [
    'https://acanthus.cis.kanazawa-u.ac.jp/*',
    'https://eduweb.sta.kanazawa-u.ac.jp/*',
  ],
  runAt: 'document_idle',

  main() {
    let tableDetected = false;
    let noticeChecked = false;

    // ----- DOM監視 -----

    function runChecks() {
      if (!tableDetected) {
        for (const id of TABLE_IDS) {
          if (document.getElementById(id)) {
            tableDetected = true;
            browser.runtime.sendMessage({ type: 'TABLE_DETECTED' });
            break;
          }
        }
      }

      if (!noticeChecked) {
        const divs = document.getElementsByClassName(NOTICE_CLASS);
        if (divs.length > 0) {
          noticeChecked = true;
          for (const div of Array.from(divs)) {
            (div as HTMLElement).style.backgroundColor = '#ffff00';
          }
          browser.runtime.sendMessage({ type: 'GLOW_ICON' });
          injectStoredLectures();
        }
      }
    }

    runChecks();

    if (!tableDetected || !noticeChecked) {
      const observer = new MutationObserver(() => {
        runChecks();
        if (tableDetected && noticeChecked) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 10000);
    }

    // ----- notice div への登録済み講義一覧注入 -----

    async function injectStoredLectures() {
      const result = await browser.storage.local.get(['lectureData']);
      const entries: LectureEntry[] = result.lectureData ?? [];

      const noticeDivs = Array.from(document.getElementsByClassName(NOTICE_CLASS)) as HTMLElement[];
      if (noticeDivs.length === 0) return;

      const panel = buildLecturePanel(entries);

      for (const div of noticeDivs) {
        const clone = panel.cloneNode(true) as HTMLElement;
        div.parentNode?.insertBefore(clone, div);
      }
    }

    function buildLecturePanel(entries: LectureEntry[]): HTMLElement {
      const wrap = document.createElement('div');
      wrap.className = 'lms-course-list-lms-notice-panel';
      wrap.id = 'gblms-stored-panel';
      wrap.style.cssText = 'padding: 6px 20px 10px; box-sizing: border-box;';

      const header = document.createElement('div');
      header.className = 'lms-course-list-lms-panel-caption';
      header.innerHTML = `<table style="width:100%; max-width:900px; margin:0 auto;"><tbody><tr><td style="font-weight:bold; color:navy; font-size:1.05em; padding:10px 8px 6px;">Good Bye LMS Page &nbsp;—&nbsp; 登録済み講義</td></tr></tbody></table>`;
      wrap.appendChild(header);

      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'lms-course-list-lms-panel';
        empty.innerHTML = `<table style="width:100%"><tbody><tr><td style="padding:8px 10px; color:#888; font-size:0.85em;">データが登録されていません</td></tr></tbody></table>`;
        wrap.appendChild(empty);
        return wrap;
      }

      const DAY_ORDER = ['月', '火', '水', '木', '金', '土'];
      const sorted = [...entries].sort((a, b) => {
        const da = DAY_ORDER.indexOf(a.day);
        const db = DAY_ORDER.indexOf(b.day);
        // 曜日が不明（集中等）は末尾
        if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
        return a.period - b.period;
      });

      const table = document.createElement('table');
      table.className = 'lms-course-list-table lms-course-list-lms-panel';
      table.style.cssText = 'width:100%; max-width:900px; border-collapse:collapse; margin:0 auto;';

      const tbody = document.createElement('tbody');
      for (const e of sorted) {
        const tr = document.createElement('tr');

        // 曜日・時限
        const tdPeriod = document.createElement('td');
        tdPeriod.style.cssText = 'width:8%; white-space:nowrap; padding:14px 8px; font-size:1.0em;';
        tdPeriod.textContent = `${e.day}${e.period}限`;

        // シラバスバッジ
        const tdSyllabus = document.createElement('td');
        tdSyllabus.style.cssText = 'width:4%; padding:14px 6px; text-align:center; vertical-align:middle;';
        if (e.syllabusUrl) {
          const sa = document.createElement('a');
          sa.href = e.syllabusUrl;
          sa.target = '_blank';
          sa.textContent = 'S';
          sa.title = 'シラバス';
          sa.style.cssText = [
            'display:inline-flex',
            'align-items:center',
            'justify-content:center',
            'width:2em',
            'height:2em',
            'background:#1a3a6d',
            'color:#fff',
            'font-size:0.95em',
            'font-weight:bold',
            'text-decoration:none',
            'border-radius:2px',
            'flex-shrink:0',
          ].join(';');
          tdSyllabus.appendChild(sa);
        }

        // 科目名（LMSリンクあれば <a>）
        const tdSubject = document.createElement('td');
        tdSubject.style.cssText = 'width:41%; padding:14px 8px; font-size:1.05em;';
        if (e.lmsUrl) {
          const a = document.createElement('a');
          a.href = e.lmsUrl;
          a.target = 'webclass';
          a.textContent = e.subjectName;
          a.className = 'lms-course-list_emphasize-txt';
          tdSubject.appendChild(a);
        } else {
          tdSubject.textContent = e.subjectName;
          tdSubject.style.color = '#888';
        }

        // 教員名
        const tdTeacher = document.createElement('td');
        tdTeacher.style.cssText = 'width:30%; padding:14px 8px; font-size:0.95em; color:#555;';
        tdTeacher.textContent = e.teacher;

        // 科目区分・単位
        const tdMeta = document.createElement('td');
        tdMeta.style.cssText = 'width:17%; padding:14px 8px; font-size:0.90em; color:#888; white-space:nowrap;';
        tdMeta.textContent = `${e.sbjDiv} ${e.credit}`.trim();

        tr.appendChild(tdPeriod);
        tr.appendChild(tdSyllabus);
        tr.appendChild(tdSubject);
        tr.appendChild(tdTeacher);
        tr.appendChild(tdMeta);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    // ----- メッセージリスナー -----

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const type = (message as { type: string }).type;

      if (type === 'GET_STATUS') {
        sendResponse({ tableDetected });
        return true;
      }

      if (type === 'REGISTER_DATA') {
        processRegistration();
      }
    });

    // ----- テーブルパース -----

    function parseTable(tableId: string): LectureEntry[] {
      const prefix = tableId.replace('_tblLecture', '');
      const entries: LectureEntry[] = [];

      for (const period of PERIODS) {
        for (const day of DAYS) {
          const sp = `${prefix}_lct${day.key}${period}_ctl00`;

          const lctCdEl = document.getElementById(`${sp}_lblLctCd`);
          const lctCd = lctCdEl?.textContent?.trim() ?? '';
          if (!lctCd) continue;

          const syllabusUrl = (lctCdEl?.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';

          const staffEl = document.getElementById(`${sp}_lblStaffName`) as HTMLElement | null;
          const staffLines = (staffEl?.innerText ?? '').split('\n').map(s => s.trim()).filter(Boolean);
          const subjectName = staffLines[0] ?? '';
          const teacher = staffLines[1] ?? '';
          const actingUrl = (staffEl?.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';

          const sbjDiv = document.getElementById(`${sp}_lblSbjDivName`)?.textContent?.trim() ?? '';
          const credit = document.getElementById(`${sp}_lblCredit`)?.textContent?.trim() ?? '';

          entries.push({ day: day.label, period, lctCd, syllabusUrl, subjectName, actingUrl, teacher, sbjDiv, credit, lmsUrl: '' });
        }
      }
      return entries;
    }

    // ----- LMSリンク取得 -----

    function randomDelay(min: number, max: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
    }

    type FetchResult = { lmsUrl: string; level: 'ok' | 'warn' | 'error' };

    async function fetchLmsUrl(entry: LectureEntry): Promise<FetchResult> {
      const { actingUrl, subjectName, day, period } = entry;
      const tag = `[${day}${period}限 ${subjectName}]`;

      if (!actingUrl) {
        console.warn(`[GoodByeLMS] ${tag} actingUrl なし、スキップ`);
        return { lmsUrl: '', level: 'warn' };
      }

      console.log(`[GoodByeLMS] ${tag} GET: ${actingUrl}`);
      try {
        const res = await browser.runtime.sendMessage({ type: 'FETCH_URL', url: actingUrl }) as { html?: string; error?: string };
        if (res.error) {
          console.error(`[GoodByeLMS] ${tag} fetchエラー:`, res.error);
          return { lmsUrl: '', level: 'error' };
        }
        if (!res.html) {
          console.error(`[GoodByeLMS] ${tag} 空レスポンス (ログインセッション切れの可能性あり)`);
          return { lmsUrl: '', level: 'error' };
        }

        const doc = new DOMParser().parseFromString(res.html, 'text/html');
        const a = doc.querySelector('a[href*="acanthus.cis.kanazawa-u.ac.jp/base/lms-course/sso-link/"]') as HTMLAnchorElement | null;

        if (a) {
          console.log(`[GoodByeLMS] ${tag} LMSリンク取得成功: ${a.href}`);
          return { lmsUrl: a.href, level: 'ok' };
        } else {
          console.warn(`[GoodByeLMS] ${tag} sso-link が見つかりません (LMSなし科目の可能性あり)`);
          return { lmsUrl: '', level: 'warn' };
        }
      } catch (e) {
        console.error(`[GoodByeLMS] ${tag} 予期しない例外:`, e);
        return { lmsUrl: '', level: 'error' };
      }
    }

    function sendProgress(step: 1 | 2 | 3, status: 'running' | 'done' | 'error', detail?: string) {
      browser.runtime.sendMessage({ type: 'PROGRESS_UPDATE', step, status, detail }).catch(() => {});
    }

    // ----- メイン処理 -----

    async function processRegistration() {
      const targetId = 'ctl00_phContents_rrMain_ttTable_tblLecture';
      console.group('[GoodByeLMS] 登録処理開始');

      // Step 1: テーブル取得
      console.log('[GoodByeLMS] Step1: テーブルをパース中...');
      sendProgress(1, 'running');
      const entries = parseTable(targetId);
      console.log(`[GoodByeLMS] Step1: ${entries.length} 件取得`);
      console.table(entries.map(e => ({ 曜日: e.day, 時限: e.period, 科目名: e.subjectName, 教員: e.teacher, 科目区分: e.sbjDiv, 単位: e.credit })));
      sendProgress(1, 'done', `${entries.length} 件`);

      // Step 2: LMSリンク取得
      console.log(`[GoodByeLMS] Step2: LMSリンク取得開始 (${entries.length} 件)`);
      sendProgress(2, 'running', `0 / ${entries.length}`);
      let errorCount = 0;
      for (let i = 0; i < entries.length; i++) {
        const result = await fetchLmsUrl(entries[i]);
        entries[i].lmsUrl = result.lmsUrl;
        if (result.level === 'error') errorCount++;
        sendProgress(2, 'running', `${i + 1} / ${entries.length}`);
        if (i < entries.length - 1) {
          const delay = Math.round(1000 + Math.random() * 500);
          console.log(`[GoodByeLMS] 次まで ${delay}ms 待機...`);
          await randomDelay(1000, 1500);
        }
      }
      const lmsFound = entries.filter(e => e.lmsUrl).length;
      console.log(`[GoodByeLMS] Step2: 完了 (成功 ${lmsFound}件 / エラー ${errorCount}件)`);
      sendProgress(2, 'done', `${entries.length} / ${entries.length}`);

      // Step 3: データ保存
      console.log('[GoodByeLMS] Step3: storage.local に保存中...');
      sendProgress(3, 'running');
      await browser.storage.local.set({ lectureData: entries });
      sendProgress(3, 'done');

      console.log('[GoodByeLMS] 保存完了 最終データ:');
      console.table(entries.map(e => ({ 曜日: e.day, 時限: e.period, 科目名: e.subjectName, 教員: e.teacher, LMS: e.lmsUrl || '(なし)' })));
      console.log('[GoodByeLMS] JSON:\n', JSON.stringify(entries, null, 2));
      console.groupEnd();

      if (errorCount > 0) {
        browser.runtime.sendMessage({
          type: 'FETCH_ERROR',
          count: errorCount,
        }).catch(() => {});
      }
    }
  },
});
