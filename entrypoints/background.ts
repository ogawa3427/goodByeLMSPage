export default defineBackground(() => {
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

    if (msg.type === 'FETCH_URL') {
      fetch(msg.url!, { credentials: 'include' })
        .then(r => r.text())
        .then(html => sendResponse({ html }))
        .catch(err => sendResponse({ error: String(err) }));
      return true; // 非同期レスポンスを使う
    }
  });
});
