# Product Scraper

A modern web scraper built with React, TypeScript, Vite, and Supabase. Extract product data from any e-commerce site.

## Important: Setup Required for Protected Sites

If a server scrape reports that a site blocked the request, set `APIFY_API_TOKEN` on the edge functions. Amazon and Mercado Libre are more reliable from the Chrome extension, because that scrape uses the page already open in your browser.

**See [APIFY-TOKEN-SETUP.md](./APIFY-TOKEN-SETUP.md) for quick 5-minute setup instructions.**

---

## Features

- **URL Scraper** - Paste any product URL to extract data
- **Bulk Import** - Scrape multiple URLs at once, one URL per request, and resume if a job stops
- **Chrome Extension** - Scrape the open product page with the site-specific engine
- **Copy tables** - Detect tables and repeating lists, then copy them so Excel and Google Sheets paste into cells
- **Google Sheets Export** - Download a CSV, or send a product from the extension to an Apps Script web app
- **Apify fallback** - The server tries a direct fetch first. When `APIFY_API_TOKEN` is set, a blocked or empty page can be loaded in Apify's browser actor

## Quick Start

1. Sign up/login to the dashboard
2. Add your Apify token (see APIFY-TOKEN-SETUP.md)
3. Start scraping!

## Documentation

- **[APIFY-TOKEN-SETUP.md](./APIFY-TOKEN-SETUP.md)** - Required setup for protected sites
- **[GOOGLE-SHEETS-INTEGRATION.md](./GOOGLE-SHEETS-INTEGRATION.md)** - Export data to Google Sheets
- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - General setup instructions
- **[chrome-extension/](./chrome-extension/)** - Chrome extension for direct scraping

## Need Help?

Check the documentation files above for detailed setup instructions and troubleshooting.
