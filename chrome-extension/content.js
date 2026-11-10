if (!globalThis.__productImporterListener) {
  globalThis.__productImporterListener = true;

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'scrapeProduct') {
      try {
        if (!globalThis.ScraperEngine) {
          throw new Error('Scraper is not available on this page');
        }
        sendResponse({ success: true, data: globalThis.ScraperEngine.scrape() });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    return false;
  });
}
