interface LectureEntry {
  day: string;
  period: number;
  subjectName: string;
  lmsUrl: string;
}

interface QuarterData {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  entries: LectureEntry[];
  registeredAt: number;
}

interface UpdateCheck {
  hasUpdate: boolean;
  latestVersion: string;
  releaseUrl: string;
  checkedAt: number;
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

// 旧データ (lectureData) を allLectureData へマイグレーション
async function migrateLectureData(): Promise<void> {
  const result = await browser.storage.local.get(['allLectureData', 'lectureData', 'lectureRegisteredAt']);
  if (result.allLectureData) return;
  if (!result.lectureData?.length) return;

  const regAt: number = result.lectureRegisteredAt ?? Date.now();
  const regDate = new Date(regAt);
  const allData: QuarterData[] = [{
    year: getAcademicYear(regDate),
    quarter: getQuarterFromDate(regDate),
    entries: result.lectureData,
    registeredAt: regAt,
  }];
  await browser.storage.local.set({ allLectureData: allData });
}

const GITHUB_API = 'https://api.github.com/repos/ogawa3427/goodByeLMSPage/releases/latest';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchUpdateCheck(): Promise<void> {
  const res = await fetch(GITHUB_API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { tag_name: string; html_url: string };
  const latestVersion = data.tag_name.replace(/^v/, '');
  const currentVersion = browser.runtime.getManifest().version;
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
  await browser.storage.local.set({
    updateCheck: { hasUpdate, latestVersion, releaseUrl: data.html_url, checkedAt: Date.now() }
  });
}

// ----- 講義ミニ一覧 -----

async function initLectureMini() {
  await migrateLectureData();

  const result = await browser.storage.local.get('allLectureData');
  const allData: QuarterData[] = result.allLectureData ?? [];
  const section = document.getElementById('lecture-mini-section')!;
  section.innerHTML = '';

  const now = new Date();
  const currentYear = getAcademicYear(now);
  const currentQ = getQuarterFromDate(now);

  const byCurrent = allData.find(d => d.year === currentYear && d.quarter === currentQ);
  const byLatest = [...allData].sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0))[0];
  const picked = byCurrent?.entries?.length ? byCurrent : (byLatest?.entries?.length ? byLatest : undefined);

  // ヘッダー（現在Qが空なら、直近の登録データを表示）
  const header = document.createElement('div');
  header.className = 'mini-header';
  header.textContent = picked
    ? `${picked.year}年度 Q${picked.quarter}`
    : `${currentYear}年度 Q${currentQ}`;
  section.appendChild(header);

  if (!picked) {
    renderEmptyMiniSection(section);
    return;
  }

  const DAY_ORDER = ['月', '火', '水', '木', '金', '土'];
  const sorted = [...picked.entries].sort((a, b) => {
    const da = DAY_ORDER.indexOf(a.day);
    const db = DAY_ORDER.indexOf(b.day);
    if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
    return a.period - b.period;
  });

  function buildMiniSubject(e: LectureEntry): HTMLSpanElement {
    const subject = document.createElement('span');
    subject.className = 'mini-subject';
    if (e.lmsUrl) {
      const a = document.createElement('a');
      a.href = e.lmsUrl;
      a.target = 'webclass';
      a.textContent = e.subjectName;
      subject.appendChild(a);
    } else {
      const sp = document.createElement('span');
      sp.textContent = e.subjectName;
      subject.appendChild(sp);
    }
    return subject;
  }

  // スロット（曜日×時限）ごとにグループ化
  const groups: LectureEntry[][] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0].day === e.day && last[0].period === e.period) {
      last.push(e);
    } else {
      groups.push([e]);
    }
  }

  for (const group of groups) {
    const main = group[0];
    const extras = group.slice(1);

    const row = document.createElement('div');
    row.className = 'mini-row';

    const period = document.createElement('span');
    period.className = 'mini-period';
    period.textContent = main.day === '集中講義' ? main.day : `${main.day}${main.period}限`;

    row.appendChild(period);
    row.appendChild(buildMiniSubject(main));

    if (extras.length > 0) {
      const toggle = document.createElement('span');
      toggle.className = 'mini-extra-toggle';
      toggle.textContent = `▶+${extras.length}`;
      row.appendChild(toggle);
    }

    section.appendChild(row);

    if (extras.length > 0) {
      const details = document.createElement('details');
      details.className = 'mini-extras';
      // summary は非表示にしてトグルボタン代わりの span から操作
      const summary = document.createElement('summary');
      summary.style.display = 'none';
      details.appendChild(summary);

      for (const extra of extras) {
        const extraRow = document.createElement('div');
        extraRow.className = 'mini-row mini-extra-row';
        const emptyPeriod = document.createElement('span');
        emptyPeriod.className = 'mini-period';
        extraRow.appendChild(emptyPeriod);
        extraRow.appendChild(buildMiniSubject(extra));
        details.appendChild(extraRow);
      }

      section.appendChild(details);

      // toggle span クリックで details を開閉
      const toggle = row.querySelector('.mini-extra-toggle') as HTMLSpanElement;
      toggle.addEventListener('click', () => {
        details.open = !details.open;
        toggle.textContent = details.open ? `▼+${extras.length}` : `▶+${extras.length}`;
      });
    }
  }
}

// ----- バージョンセクション -----

function renderVersionStatus(updateCheck: UpdateCheck | undefined) {
  const statusEl = document.getElementById('version-status')!;
  const hintEl = document.getElementById('version-hint')!;
  hintEl.innerHTML = '';
  if (!updateCheck) {
    statusEl.textContent = '未確認';
    return;
  }
  if (updateCheck.hasUpdate) {
    statusEl.innerHTML = '';
    const a = document.createElement('a');
    a.href = updateCheck.releaseUrl;
    a.target = '_blank';
    a.textContent = `v${updateCheck.latestVersion} があります`;
    statusEl.appendChild(a);

    // ポップアップは幅が狭いので、詳細手順はREADMEに逃がす
    hintEl.innerHTML = '更新方法: README を見てください ';
    const how = document.createElement('a');
    how.href = 'https://github.com/ogawa3427/goodByeLMSPage#update';
    how.target = '_blank';
    how.textContent = '方法はここ';
    how.style.color = '#1a6fd4';
    hintEl.appendChild(how);

  } else {
    statusEl.textContent = '最新です';
  }
}

async function initVersionSection() {
  const currentEl = document.getElementById('version-current')!;
  const checkBtn = document.getElementById('version-check-btn') as HTMLButtonElement;

  const currentVersion = browser.runtime.getManifest().version;
  currentEl.textContent = currentVersion;

  const result = await browser.storage.local.get('updateCheck');
  renderVersionStatus(result.updateCheck as UpdateCheck | undefined);

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    checkBtn.textContent = '確認中...';
    document.getElementById('version-status')!.textContent = '確認中...';
    try {
      // Firefoxでは popup からの fetch/権限周りが面倒なので background に委譲
      await browser.runtime.sendMessage({ type: 'CHECK_UPDATE' });
    } catch (e) {
      // background 側が居ない等の例外時はフォールバックで直接叩く
      try {
        await fetchUpdateCheck();
      } catch (e2) {
        document.getElementById('version-status')!.textContent = `エラー: ${e2}`;
        checkBtn.disabled = false;
        checkBtn.textContent = '更新確認';
        return;
      }
    }
    const updated = await browser.storage.local.get('updateCheck');
    renderVersionStatus(updated.updateCheck as UpdateCheck | undefined);
    checkBtn.disabled = false;
    checkBtn.textContent = '更新確認';
  });
}

// ----- 登録セクション -----

const registerSection = document.getElementById('register-section')!;
const progressSection = document.getElementById('progress-section')!;
const btnYes = document.getElementById('btn-yes')!;
const btnLater = document.getElementById('btn-later')!;

async function startRegistrationFlow() {
  const btnRow = document.querySelector('.btn-row');
  if (btnRow) btnRow.remove();
  const registerText = document.querySelector('#register-section p');
  if (registerText) registerText.remove();
  registerSection.style.background = 'transparent';
  registerSection.style.borderBottom = 'none';
  registerSection.style.padding = '0';
  progressSection.style.display = 'block';

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    browser.tabs.sendMessage(tab.id, { type: 'REGISTER_DATA' });
  }
}

function renderEmptyMiniSection(section: HTMLElement) {
  const empty = document.createElement('div');
  empty.className = 'mini-empty';
  empty.append(document.createTextNode('未登録 — 学務情報サービスの「履修時間割」ページを開いてデータを'));
  const registerLink = document.createElement('a');
  registerLink.href = '#';
  registerLink.textContent = '登録';
  registerLink.style.cssText = 'color: inherit; text-decoration: none;';
  registerLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await startRegistrationFlow();
  });
  empty.append(registerLink);
  empty.append(document.createTextNode('してください'));
  section.appendChild(empty);
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  let tableDetected = false;
  try {
    const res = await browser.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }) as { tableDetected: boolean };
    tableDetected = res?.tableDetected ?? false;
  } catch {
    // content script が動いていないページ
  }

  if (tableDetected) {
    registerSection.style.display = 'block';
  }
}

// ----- 進捗UI -----

function setStep(step: 1 | 2 | 3, status: 'running' | 'done' | 'error', detail?: string) {
  const el = document.getElementById(`step-${step}`)!;
  const icon = el.querySelector('.step-icon')!;
  const detailEl = document.getElementById(`detail-${step}`)!;

  el.className = `step ${status}`;

  if (status === 'running') {
    icon.innerHTML = '<div class="spinner"></div>';
  } else if (status === 'done') {
    icon.textContent = '✓';
  } else {
    icon.textContent = '✕';
  }

  if (detail !== undefined) detailEl.textContent = detail;
}

const errorSection = document.getElementById('error-section')!;
const errorMsg = document.getElementById('error-msg')!;
const errorRowHint = document.getElementById('error-row-hint')!;
const othersRowInput = document.getElementById('others-row-input') as HTMLInputElement;
const btnSaveOthersRow = document.getElementById('btn-save-others-row') as HTMLButtonElement;
const othersRowFeedback = document.getElementById('others-row-feedback')!;

async function loadOthersRowCount() {
  const result = await browser.storage.local.get('othersTableRowCount');
  const raw = Number(result.othersTableRowCount);
  const value = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
  othersRowInput.value = String(value);
}

function shouldShowOthersRowHint(msg: { step?: 1 | 2 | 3; status?: 'running' | 'done' | 'error'; detail?: string }): boolean {
  if (msg.step !== 1 || msg.status !== 'error' || !msg.detail) return false;
  return msg.detail.includes('tbody>tr=');
}

browser.runtime.onMessage.addListener((message) => {
  const msg = message as {
    type: string;
    step?: 1 | 2 | 3;
    status?: 'running' | 'done' | 'error';
    detail?: string;
    count?: number;
  };

  if (msg.type === 'PROGRESS_UPDATE') {
    setStep(msg.step!, msg.status!, msg.detail);
    if (shouldShowOthersRowHint(msg)) {
      errorSection.style.display = 'block';
      errorMsg.textContent = `⚠ ${msg.detail}`;
      errorRowHint.style.display = 'block';
      loadOthersRowCount().catch(() => {});
    }
    if (msg.step === 3 && msg.status === 'done') {
      initLectureMini();
    }
  }

  if (msg.type === 'FETCH_ERROR') {
    errorSection.style.display = 'block';
    errorMsg.textContent = `⚠ LMSリンク取得で ${msg.count} 件のエラーが発生しました。`;
  }
});

// ----- ボタン操作 -----

btnYes.addEventListener('click', async () => {
  await startRegistrationFlow();
});

btnLater.addEventListener('click', () => {
  window.close();
});

// ----- データ設定 -----

function initDataSettings() {
  const feedback = document.getElementById('import-feedback')!;
  const fileInput = document.getElementById('import-file') as HTMLInputElement;

  document.getElementById('btn-delete')!.addEventListener('click', async () => {
    if (!confirm('全期間の登録データをすべて削除しますか？')) return;
    await browser.storage.local.remove(['allLectureData', 'lectureData', 'lectureRegisteredAt']);
    initLectureMini();
    feedback.style.color = '#c0392b';
    feedback.textContent = '削除しました';
    setTimeout(() => { feedback.textContent = ''; }, 2000);
  });

  document.getElementById('btn-export')!.addEventListener('click', async () => {
    const result = await browser.storage.local.get('allLectureData');
    const data = result.allLectureData ?? [];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goodByeLMS_allLectureData.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import')!.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('配列ではありません');
      await browser.storage.local.set({ allLectureData: parsed });
      await initLectureMini();
      const total = parsed.reduce((acc: number, q: QuarterData) => acc + (q.entries?.length ?? 0), 0);
      feedback.style.color = '#2a7a2a';
      feedback.textContent = `${parsed.length} 期間・${total} 件をインポートしました`;
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    } catch (e) {
      feedback.style.color = '#c0392b';
      feedback.textContent = `失敗: ${e}`;
    }
  });
}

function initOthersRowSetting() {
  btnSaveOthersRow.addEventListener('click', async () => {
    const n = Number(othersRowInput.value);
    if (!Number.isFinite(n) || n <= 0) {
      othersRowFeedback.textContent = '1以上の整数を入力';
      return;
    }
    const value = Math.floor(n);
    await browser.storage.local.set({ othersTableRowCount: value });
    othersRowInput.value = String(value);
    othersRowFeedback.textContent = `保存: ${value}`;
    setTimeout(() => { othersRowFeedback.textContent = ''; }, 2000);
  });
}

init();
initLectureMini();
initVersionSection();
initDataSettings();
initOthersRowSetting();
