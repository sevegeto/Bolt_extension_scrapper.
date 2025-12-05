const CONFIG = {
  GOOGLE_APPS_SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',

  SHEET_NAME: 'Products',

  DEFAULT_CURRENCY: 'USD',

  TIMEOUT_MS: 15000,

  MAX_IMAGES: 10,

  MAX_TITLE_LENGTH: 60,

  MAX_SUBTITLE_LENGTH: 50,

  RECENT_IMPORTS_LIMIT: 5,

  RETRY_ATTEMPTS: 3
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
