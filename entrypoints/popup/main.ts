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

// content script からのメッセージを受信
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
  }

  if (msg.type === 'FETCH_ERROR') {
    errorSection.style.display = 'block';
    errorMsg.textContent = `⚠ LMSリンク取得で ${msg.count} 件のエラーが発生しました。`;
  }
});

// ----- ボタン操作 -----

btnYes.addEventListener('click', async () => {
  // ボタン行を消して進捗UIを表示
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

init();
