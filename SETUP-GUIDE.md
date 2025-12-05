# Product Scraper - Hybrid System Setup Guide

This guide explains how to set up and use your hybrid product scraping system that combines manual Chrome extension scraping with automated bulk scraping capabilities.

## System Overview

Your product scraping system now has three components:

1. **Chrome Extension** - Manual scraping while browsing
2. **Web Dashboard** - Manage products, view data, initiate bulk imports
3. **Bulk Scraper** - Automated scraping of multiple URLs via Edge Function

All data is stored in Supabase with user authentication and RLS security.

## Quick Start

### 1. Web Dashboard

The dashboard is your central hub for managing scraped products.

**To use the dashboard:**

1. Open the dashboard (runs on `http://localhost:5173` in development)
2. Create an account or sign in
3. View your scraped products
4. Export products to CSV
5. Manage bulk scraping jobs

**Dashboard Features:**

- **Products Tab**: View all scraped products in a card grid
- **Bulk Import Tab**: Paste multiple product URLs for automated scraping
- **Jobs Tab**: Monitor scraping job progress
- **Export**: Download all products as CSV

### 2. Chrome Extension

The Chrome extension lets you scrape products while browsing e-commerce sites.

**Setup:**

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project
5. The extension icon will appear in your toolbar

**To use the extension:**

1. Click the extension icon
2. Sign in (it will open the dashboard for authentication)
3. Browse to any product page (Amazon, eBay, Walmart, etc.)
4. Click "Scrape Product Data" in the extension popup
5. Product is saved to your dashboard automatically

**Extension Features:**

- Preview product data before scraping
- Automatic authentication sync with dashboard
- Direct link to view dashboard
- Works on most e-commerce sites

### 3. Bulk Scraping

Bulk scraping allows you to import multiple products at once.

**How to bulk scrape:**

1. Go to the "Bulk Import" tab in the dashboard
2. Paste product URLs (one per line)
3. Click "Start Bulk Scraping"
4. Go to the "Jobs" tab to monitor progress
5. Click "Process Next Job" to start scraping
6. View scraped products in the "Products" tab

**Supported Sites:**

The bulk scraper works best with:
- Amazon (best support)
- eBay
- Walmart
- Most e-commerce sites with standard HTML structure

**Note:** For JavaScript-heavy sites or sites with advanced anti-bot measures, the Chrome extension (manual method) will work better than bulk scraping.

## Configuration

### Dashboard URL

The Chrome extension is configured to connect to:
- Development: `http://localhost:5173`
- Production: Update `DASHBOARD_URL` in `chrome-extension/config.js`

### Switching Between Supabase and Google Sheets

By default, the extension saves to Supabase. To use Google Sheets instead:

1. Open `chrome-extension/config.js`
2. Change `SAVE_TO: 'supabase'` to `SAVE_TO: 'sheets'`
3. Add your Google Apps Script URL

## Database Structure

Your Supabase database has two main tables:

### Products Table
Stores all scraped product data:
- Product details (title, price, brand, etc.)
- Images and specifications
- Source URL and domain
- Scrape method (extension or bulk)
- User ownership

### Scrape Jobs Table
Tracks bulk scraping operations:
- List of URLs to scrape
- Progress tracking
- Error logs
- Results summary

## Security

All data is protected with Row Level Security (RLS):
- Users can only see their own products
- Users can only see their own scraping jobs
- Authentication required for all operations
- No cross-user data access possible

## Tips for Best Results

**Manual Scraping (Extension):**
- Wait for product pages to fully load
- Works on most product pages
- Best for individual products
- Handles JavaScript-rendered content

**Bulk Scraping:**
- Use direct product URLs (not category pages)
- Works best on standard HTML sites
- Good for importing large catalogs
- Process jobs one at a time for stability

**General:**
- Amazon products scrape with the most data
- Some sites may require the manual extension method
- Use CSV export for data analysis
- Monitor the Jobs tab for bulk scraping progress

## Troubleshooting

**Extension not saving products:**
- Make sure you're signed in (check extension popup)
- Refresh the extension after signing in
- Check that you're on a product page

**Bulk scraping not working:**
- Click "Process Next Job" button in Jobs tab
- Check that URLs are valid product pages
- Some sites may not work with bulk scraping

**Authentication issues:**
- Sign in through the dashboard first
- Then open the Chrome extension
- Click "Open Dashboard to Sign In" if needed

## Development

**Running the dashboard locally:**
```bash
npm run dev
```

**Building the dashboard:**
```bash
npm run build
```

**Database migrations:**
All database schema is already set up in Supabase.

## Future Enhancements

For more advanced bulk scraping (JavaScript rendering, anti-bot bypass), consider:
- Setting up a separate Node.js server with Crawlee
- Using browser automation with Playwright/Puppeteer
- Implementing proxy rotation for large-scale scraping

The current Edge Function provides basic bulk scraping that works for many sites without additional infrastructure.
