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

async function checkForUpdate() {
  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) return;
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
    }
  } catch {
    // ネットワークエラー等は無視
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    checkForUpdate();
    // アラームはonInstalled内で作成（サービスワーカー起動直後はalarms APIが未初期化の場合がある）
    chrome.alarms?.create('updateCheck', { periodInMinutes: 24 * 60 });
  });
  chrome.runtime.onStartup.addListener(() => checkForUpdate());
  chrome.alarms?.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateCheck') checkForUpdate();
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    const msg = message as { type: string; url?: string };

    if (msg.type === 'TABLE_DETECTED') {
      if (tabId == null) return;
      chrome.action.openPopup().catch(() => {});
    }

    if (msg.type === 'GLOW_ICON') {
      if (tabId == null) return;
      chrome.action.setBadgeText({ text: '★', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#ffcc00', tabId });
    }

    if (msg.type === 'CHECK_UPDATE') {
      checkForUpdate().then(() => sendResponse({ done: true }));
      return true;
    }

    if (msg.type === 'FETCH_URL') {
      fetch(msg.url!, { credentials: 'include' })
        .then(r => r.text())
        .then(html => sendResponse({ html }))
        .catch(err => sendResponse({ error: String(err) }));
      return true; // 非同期レスポンスを使う
    }
  });
});
