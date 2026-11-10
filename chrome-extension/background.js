const SCRAPER_FILES = ['scraper-engine.js', 'table-extract.js', 'content.js'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'scrapeProduct',
      title: 'Scrape this product',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'extractTables',
      title: 'Copy tables for Excel or Sheets',
      contexts: ['page', 'selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'scrapeProduct') {
    try {
      await chrome.action.openPopup();
    } catch {
      notify('Open the extension', 'Click the toolbar icon to scrape this page.');
    }
    return;
  }

  if (info.menuItemId === 'extractTables') {
    await deliver(tab.id, { action: 'openTableExtractor' });
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'notify') {
    notify(request.title || 'Product Scraper', request.message || '');
  }
});

async function deliver(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    if (response?.success) return response;
  } catch {
    // The content script is not on this page yet.
  }

  await chrome.scripting.executeScript({ target: { tabId }, files: SCRAPER_FILES });
  return chrome.tabs.sendMessage(tabId, message);
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
  });
}
