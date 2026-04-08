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
  const result = await chrome.storage.local.get(['allLectureData', 'lectureData', 'lectureRegisteredAt']);
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
  await chrome.storage.local.set({ allLectureData: allData });
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
  const currentVersion = chrome.runtime.getManifest().version;
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
  await chrome.storage.local.set({
    updateCheck: { hasUpdate, latestVersion, releaseUrl: data.html_url, checkedAt: Date.now() }
  });
  if (hasUpdate) {
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ----- 講義ミニ一覧 -----

async function initLectureMini() {
  await migrateLectureData();

  const result = await chrome.storage.local.get('allLectureData');
  const allData: QuarterData[] = result.allLectureData ?? [];
  const section = document.getElementById('lecture-mini-section')!;
  section.innerHTML = '';

  const now = new Date();
  const currentYear = getAcademicYear(now);
  const currentQ = getQuarterFromDate(now);

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'mini-header';
  header.textContent = `${currentYear}年度 Q${currentQ}`;
  section.appendChild(header);

  const current = allData.find(d => d.year === currentYear && d.quarter === currentQ);

  if (!current || current.entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mini-empty';
    empty.textContent = '未登録 — 学務情報サービスの「履修時間割」ページを開いてデータを登録してください';
    section.appendChild(empty);
    return;
  }

  const DAY_ORDER = ['月', '火', '水', '木', '金', '土'];
  const sorted = [...current.entries].sort((a, b) => {
    const da = DAY_ORDER.indexOf(a.day);
    const db = DAY_ORDER.indexOf(b.day);
    if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
    return a.period - b.period;
  });

  for (const e of sorted) {
    const row = document.createElement('div');
    row.className = 'mini-row';

    const period = document.createElement('span');
    period.className = 'mini-period';
    period.textContent = `${e.day}${e.period}限`;

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

    row.appendChild(period);
    row.appendChild(subject);
    section.appendChild(row);
  }
}

// ----- バージョンセクション -----

function renderVersionStatus(updateCheck: UpdateCheck | undefined) {
  const statusEl = document.getElementById('version-status')!;
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

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px; color:#888; margin-top:4px; line-height:1.6;';
    hint.innerHTML =
      '① <a href="' + updateCheck.releaseUrl + '" target="_blank" style="color:#1a6fd4;">zip をDL</a> して解凍<br>' +
      '② 今のインストールフォルダに上書き<br>' +
      '③ アドレスバーに <code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:9px;">chrome://extensions</code> → 更新ボタン';
    statusEl.appendChild(hint);

    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  } else {
    statusEl.textContent = '最新です';
    chrome.action.setBadgeText({ text: '' });
  }
}

async function initVersionSection() {
  const currentEl = document.getElementById('version-current')!;
  const checkBtn = document.getElementById('version-check-btn') as HTMLButtonElement;

  const currentVersion = chrome.runtime.getManifest().version;
  currentEl.textContent = currentVersion;

  const result = await chrome.storage.local.get('updateCheck');
  renderVersionStatus(result.updateCheck as UpdateCheck | undefined);

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    checkBtn.textContent = '確認中...';
    document.getElementById('version-status')!.textContent = '確認中...';
    try {
      await fetchUpdateCheck();
    } catch (e) {
      document.getElementById('version-status')!.textContent = `エラー: ${e}`;
      checkBtn.disabled = false;
      checkBtn.textContent = '更新確認';
      return;
    }
    const updated = await chrome.storage.local.get('updateCheck');
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
  document.querySelector('.btn-row')!.remove();
  document.querySelector('#register-section p')!.remove();
  registerSection.style.background = 'transparent';
  registerSection.style.borderBottom = 'none';
  registerSection.style.padding = '0';
  progressSection.style.display = 'block';

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    browser.tabs.sendMessage(tab.id, { type: 'REGISTER_DATA' });
  }
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
    await chrome.storage.local.remove(['allLectureData', 'lectureData', 'lectureRegisteredAt']);
    initLectureMini();
    feedback.style.color = '#c0392b';
    feedback.textContent = '削除しました';
    setTimeout(() => { feedback.textContent = ''; }, 2000);
  });

  document.getElementById('btn-export')!.addEventListener('click', async () => {
    const result = await chrome.storage.local.get('allLectureData');
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
      await chrome.storage.local.set({ allLectureData: parsed });
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

init();
initLectureMini();
initVersionSection();
initDataSettings();
