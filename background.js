// Storage for intercepted VTT files
const vttFiles = new Map();

// Intercept all requests containing .vtt
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode === 200) {
      const tabId = details.tabId;
      const url = details.url;

      console.log('VTT file intercepted:', url, 'for tab:', tabId);

      // Save the VTT URL for this tab
      if (!vttFiles.has(tabId)) {
        vttFiles.set(tabId, []);
      }

      const tabVttFiles = vttFiles.get(tabId);
      if (!tabVttFiles.includes(url)) {
        tabVttFiles.push(url);
      }

      // Keep only the last 10 files to avoid memory leak
      if (tabVttFiles.length > 10) {
        tabVttFiles.shift();
      }
    }
  },
  { urls: ["*://*/*.vtt*"] },
  []
);

// Clean up data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  vttFiles.delete(tabId);
  console.log('Tab closed, VTT removed for tab:', tabId);
});

// Clean up data when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    vttFiles.delete(tabId);
    console.log('Tab reloading, VTT removed for tab:', tabId);
  }
});

// Listener for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVttFiles') {
    const tabId = request.tabId;
    const files = vttFiles.get(tabId) || [];

    console.log('VTT request for tab:', tabId, 'found:', files.length);

    sendResponse({ vttFiles: files });
  }

  return true; // Keep channel open for async sendResponse
});

console.log('Background script VTT Downloader loaded');
