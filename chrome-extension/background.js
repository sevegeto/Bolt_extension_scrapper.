chrome.runtime.onInstalled.addListener(() => {
  console.log('Product Importer to Sheets v2.0 installed');

  chrome.contextMenus.create({
    id: 'scrapeProduct',
    title: '📦 Scrape Product to Sheets',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scrapeProduct') {
    chrome.action.openPopup();
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'notify') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: request.title || 'Product Importer',
      message: request.message || '',
      priority: 2
    });
  }
  return true;
});
