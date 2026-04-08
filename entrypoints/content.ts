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

interface QuarterData {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  entries: LectureEntry[];
  registeredAt: number;
}

// 3/28以降は新年度扱い
function getAcademicYear(date: Date): number {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  if (m < 3 || (m === 3 && d < 28)) return y - 1;
  return y;
}

function getQuarterFromDate(date: Date): 1 | 2 | 3 | 4 {
  const m = date.getMonth() + 1;
  if (m >= 4 && m <= 6)  return 1;
  if (m >= 7 && m <= 9)  return 2;
  if (m >= 10 && m <= 12) return 3;
  return 4;
}

// ページ上のQドロップダウン value → quarter番号
function mapQSelectValue(val: string): 1 | 2 | 3 | 4 {
  const map: Record<string, 1 | 2 | 3 | 4> = { '11': 1, '12': 2, '21': 3, '22': 4 };
  return map[val] ?? 1;
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
        if (document.querySelectorAll('table[id*="tblLecture"]').length > 0) {
          tableDetected = true;
          browser.runtime.sendMessage({ type: 'TABLE_DETECTED' });
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
      const result = await browser.storage.local.get(['allLectureData', 'lectureData']);
      let allData: QuarterData[] = result.allLectureData ?? [];

      // 旧データの後方互換対応
      if (allData.length === 0 && result.lectureData?.length > 0) {
        const now = new Date();
        allData = [{
          year: getAcademicYear(now),
          quarter: getQuarterFromDate(now),
          entries: result.lectureData,
          registeredAt: Date.now(),
        }];
      }

      const noticeDivs = Array.from(document.getElementsByClassName(NOTICE_CLASS)) as HTMLElement[];
      if (noticeDivs.length === 0) return;

      const now = new Date();
      const currentYear = getAcademicYear(now);
      const currentQ = getQuarterFromDate(now);

      for (const div of noticeDivs) {
        const panel = buildLecturePanel(allData, currentYear, currentQ);
        div.parentNode?.insertBefore(panel, div);

        const authorMsg = document.createElement('div');
        authorMsg.style.cssText = 'padding: 4px 20px 6px; font-weight: bold; font-size: 1.0em; color: #1a1a1a;';
        authorMsg.textContent = '👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 以下は、当局の断末魔の叫びである！👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 👋😁 ';
        div.parentNode?.insertBefore(authorMsg, div);
      }
    }

    // ----- 講義テーブル本体（エントリ一覧） -----

    function buildEntriesTable(entries: LectureEntry[]): HTMLElement {
      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'lms-course-list-lms-panel';
        empty.innerHTML = `<table style="width:100%"><tbody><tr><td style="padding:8px 10px; color:#888; font-size:0.85em;">データが登録されていません</td></tr></tbody></table>`;
        return empty;
      }

      const DAY_ORDER = ['月', '火', '水', '木', '金', '土'];
      const sorted = [...entries].sort((a, b) => {
        const da = DAY_ORDER.indexOf(a.day);
        const db = DAY_ORDER.indexOf(b.day);
        if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
        return a.period - b.period;
      });

      const table = document.createElement('table');
      table.className = 'lms-course-list-table lms-course-list-lms-panel';
      table.style.cssText = 'width:100%; max-width:900px; border-collapse:collapse; margin:0 auto;';

      const tbody = document.createElement('tbody');
      for (const e of sorted) {
        const tr = document.createElement('tr');

        const tdPeriod = document.createElement('td');
        tdPeriod.style.cssText = 'width:8%; white-space:nowrap; padding:14px 8px; font-size:1.0em;';
        tdPeriod.textContent = `${e.day}${e.period}限`;

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

        const tdTeacher = document.createElement('td');
        tdTeacher.style.cssText = 'width:30%; padding:14px 8px; font-size:0.95em; color:#555;';
        tdTeacher.textContent = e.teacher;

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
      return table;
    }

    // ----- パネル全体（セレクタ + テーブル） -----

    function buildLecturePanel(allData: QuarterData[], defaultYear: number, defaultQ: 1 | 2 | 3 | 4): HTMLElement {
      const wrap = document.createElement('div');
      wrap.className = 'lms-course-list-lms-notice-panel';
      wrap.id = 'gblms-stored-panel';
      wrap.style.cssText = 'padding: 6px 20px 10px; box-sizing: border-box;';

      const header = document.createElement('div');
      header.className = 'lms-course-list-lms-panel-caption';
      header.innerHTML = `<table style="width:100%; max-width:900px; margin:0 auto;"><tbody><tr><td style="font-weight:bold; color:navy; font-size:1.05em; padding:10px 8px 4px;">Good Bye LMS Page &nbsp;—&nbsp; 登録済み講義</td></tr></tbody></table>`;
      wrap.appendChild(header);

      // 年度・Qセレクタ行
      const selectorRow = document.createElement('div');
      selectorRow.style.cssText = 'max-width:900px; margin:0 auto 6px; display:flex; align-items:center; gap:8px; padding:2px 8px 6px; border-bottom:1px solid #ddd;';

      const years = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
      if (years.length === 0) years.push(defaultYear);

      const yearSel = document.createElement('select');
      yearSel.style.cssText = 'font-size:0.9em; padding:2px 6px; border:1px solid #ccc; border-radius:3px;';
      for (const y of years) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = `${y}年度`;
        opt.selected = y === defaultYear;
        yearSel.appendChild(opt);
      }

      const qSel = document.createElement('select');
      qSel.style.cssText = 'font-size:0.9em; padding:2px 6px; border:1px solid #ccc; border-radius:3px;';
      for (let q = 1; q <= 4; q++) {
        const opt = document.createElement('option');
        opt.value = String(q);
        opt.textContent = `Q${q}`;
        opt.selected = q === defaultQ;
        qSel.appendChild(opt);
      }

      const registeredLabel = document.createElement('span');
      registeredLabel.style.cssText = 'font-size:0.8em; color:#999; margin-left:4px;';

      selectorRow.appendChild(yearSel);
      selectorRow.appendChild(qSel);
      selectorRow.appendChild(registeredLabel);
      wrap.appendChild(selectorRow);

      const tableContainer = document.createElement('div');
      wrap.appendChild(tableContainer);

      function renderTable() {
        const year = parseInt(yearSel.value);
        const q = parseInt(qSel.value) as 1 | 2 | 3 | 4;
        const periodData = allData.find(d => d.year === year && d.quarter === q);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildEntriesTable(periodData?.entries ?? []));

        if (periodData) {
          const d = new Date(periodData.registeredAt);
          registeredLabel.textContent = `登録: ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        } else {
          registeredLabel.textContent = '';
        }
      }

      renderTable();
      yearSel.addEventListener('change', renderTable);
      qSel.addEventListener('change', renderTable);

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

    function parseTable(table: HTMLTableElement): LectureEntry[] {
      const prefix = table.id.replace('_tblLecture', '');
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

    // ----- テーブル探索 -----

    type TableFindResult =
      | { ok: true; table: HTMLTableElement }
      | { ok: false; error: string };

    function findTableByRowCount(rowCount: number): HTMLTableElement[] {
      const allTables = Array.from(document.querySelectorAll('table')) as HTMLTableElement[];
      console.log(`[GoodByeLMS] ページ上のテーブル総数: ${allTables.length}`);
      const filtered = allTables.filter(t => {
        const tbody = t.querySelector('tbody');
        return tbody ? tbody.querySelectorAll(':scope > tr').length === rowCount : false;
      });
      console.log(`[GoodByeLMS] tbody>tr=${rowCount} のテーブル数: ${filtered.length}`);
      for (const t of filtered) console.log(t);
      return filtered;
    }

    function findLectureTable(): TableFindResult {
      const filtered = findTableByRowCount(10);

      if (filtered.length === 0) return { ok: false, error: 'tbody>tr=10 のテーブルが見つかりません' };
      if (filtered.length > 1)  return { ok: false, error: `tbody>tr=10 のテーブルが ${filtered.length} 件見つかりました（複数一致）` };

      const table = filtered[0];
      if (table.querySelectorAll('[id$="_lblLctCd"]:not([id*="lctOther"])').length === 0) {
        return { ok: false, error: '通常講義テーブルの構造が不正です（曜日×時限セルが見つかりません）' };
      }

      return { ok: true, table };
    }

    function findOthersTable(): TableFindResult {
      const filtered = findTableByRowCount(5);

      if (filtered.length === 0) return { ok: false, error: 'tbody>tr=5 のテーブルが見つかりません' };
      if (filtered.length > 1)  return { ok: false, error: `tbody>tr=5 のテーブルが ${filtered.length} 件見つかりました（複数一致）` };

      const table = filtered[0];
      if (table.querySelectorAll('[id*="lctOther"][id$="_lblLctCd"]').length === 0) {
        return { ok: false, error: '集中講義テーブルの構造が不正です（lctOther セルが見つかりません）' };
      }

      return { ok: true, table };
    }

    function parseOthersTable(table: HTMLTableElement): LectureEntry[] {
      const entries: LectureEntry[] = [];
      const lctCdEls = Array.from(table.querySelectorAll('[id$="_lblLctCd"]'));

      for (const lctCdEl of lctCdEls) {
        const lctCd = lctCdEl.textContent?.trim() ?? '';
        if (!lctCd) continue;

        const syllabusUrl = (lctCdEl.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';

        // IDの末尾 _lblLctCd を除いた部分が sp になる
        // 例: ctl00_phContents_rrMain_ttTable_lctOther3_ctl00
        const sp = lctCdEl.id.replace('_lblLctCd', '');
        const nMatch = sp.match(/lctOther(\d+)_ctl00$/);
        const n = nMatch ? parseInt(nMatch[1]) : 0;

        const staffEl = document.getElementById(`${sp}_lblStaffName`) as HTMLElement | null;
        const staffLines = (staffEl?.innerText ?? '').split('\n').map(s => s.trim()).filter(Boolean);
        const subjectName = staffLines[0] ?? '';
        const teacher = staffLines[1] ?? '';
        const actingUrl = (staffEl?.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';

        const sbjDiv = document.getElementById(`${sp}_lblSbjDivName`)?.textContent?.trim() ?? '';
        const credit = document.getElementById(`${sp}_lblCredit`)?.textContent?.trim() ?? '';

        entries.push({ day: '集中講義', period: n, lctCd, syllabusUrl, subjectName, actingUrl, teacher, sbjDiv, credit, lmsUrl: '' });
      }
      return entries;
    }

    // ----- メイン処理 -----

    async function processRegistration() {
      console.group('[GoodByeLMS] 登録処理開始');

      // ページ上のQドロップダウンを読む
      const qSelectEl = document.getElementById('ctl00_phContents_ucRegistSearchList_ddlTerm') as HTMLSelectElement | null;
      const quarter = mapQSelectValue(qSelectEl?.value ?? '');
      const year = getAcademicYear(new Date());
      console.log(`[GoodByeLMS] 対象: ${year}年度 Q${quarter}`);

      // Step 1: テーブル探索 → パース
      console.log('[GoodByeLMS] Step1: テーブルを探索中...');
      sendProgress(1, 'running');

      const lectureResult = findLectureTable();
      if (!lectureResult.ok) {
        console.error(`[GoodByeLMS] Step1: 通常講義テーブルエラー: ${lectureResult.error}`);
        sendProgress(1, 'error', lectureResult.error);
        console.groupEnd();
        return;
      }
      console.log('[GoodByeLMS] Step1: 通常講義テーブル:', lectureResult.table);
      const lectureEntries = parseTable(lectureResult.table);
      console.log(`[GoodByeLMS] Step1: 通常講義 ${lectureEntries.length} 件`);

      const othersResult = findOthersTable();
      if (!othersResult.ok) {
        console.error(`[GoodByeLMS] Step1: 集中講義テーブルエラー: ${othersResult.error}`);
        sendProgress(1, 'error', othersResult.error);
        console.groupEnd();
        return;
      }
      console.log('[GoodByeLMS] Step1: 集中講義テーブル:', othersResult.table);
      const othersEntries = parseOthersTable(othersResult.table);
      console.log(`[GoodByeLMS] Step1: 集中講義 ${othersEntries.length} 件`);

      const entries = [...lectureEntries, ...othersEntries];
      console.log(`[GoodByeLMS] Step1: 合計 ${entries.length} 件取得`);
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

      // Step 3: データ保存（allLectureData に年度・Q単位で蓄積）
      console.log('[GoodByeLMS] Step3: storage.local に保存中...');
      sendProgress(3, 'running');

      const stored = await browser.storage.local.get('allLectureData');
      const allData: QuarterData[] = stored.allLectureData ?? [];
      const idx = allData.findIndex(d => d.year === year && d.quarter === quarter);
      const qData: QuarterData = { year, quarter, entries, registeredAt: Date.now() };
      if (idx >= 0) {
        allData[idx] = qData;
      } else {
        allData.push(qData);
      }
      await browser.storage.local.set({ allLectureData: allData });
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
