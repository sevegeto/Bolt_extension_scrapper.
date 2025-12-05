const CONFIG = {
  SUPABASE_URL: 'https://lrtgaoycndndbsilyfut.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydGdhb3ljbmRuZGJzaWx5ZnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDEwMDksImV4cCI6MjA4MDQ3NzAwOX0.KXStfN40mAANRxmnDd7eYoNYD8S2f5n3pWCOhpx56yY',
  DASHBOARD_URL: 'http://localhost:5173',

  GOOGLE_APPS_SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',

  SHEET_NAME: 'Products',

  DEFAULT_CURRENCY: 'USD',

  TIMEOUT_MS: 15000,

  MAX_IMAGES: 10,

  MAX_TITLE_LENGTH: 60,

  MAX_SUBTITLE_LENGTH: 50,

  RECENT_IMPORTS_LIMIT: 5,

  RETRY_ATTEMPTS: 3,

  SAVE_TO: 'supabase'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
