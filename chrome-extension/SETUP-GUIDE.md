# Quick Setup Guide

## 🚀 5-Minute Setup

### 1. Create Icons (1 minute)

Create three simple icon files in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Quick option**: Use [favicon.io](https://favicon.io/favicon-generator/) to generate free icons with text "PS" (Product Scraper).

### 2. Set Up Google Apps Script (2 minutes)

1. Create a new Google Sheet: https://sheets.google.com
2. Click **Extensions** → **Apps Script**
3. Copy and paste the code from `google-apps-script.js`
4. Click **Deploy** → **New deployment** → **Web app**
5. Set "Who has access" to **Anyone**
6. Copy the Web App URL

### 3. Configure Extension (1 minute)

1. Open `config.js`
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with your Web App URL
3. Save the file

### 4. Load Extension (1 minute)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. Done! 🎉

## 🧪 Test It

1. Go to any Amazon or eBay product page
2. Click the extension icon
3. Click **Preview Data** to see what's scraped
4. Click **Scrape Product Data** to send to your Google Sheet

## 📋 What Gets Scraped

✅ Title, Description, Price
✅ Brand, Model, MPN, SKU
✅ UPC, GTIN, Color, Size
✅ Product Image URL
✅ Vendor URL
✅ Timestamp and Domain

## 🆘 Need Help?

See the full `README.md` for:
- Detailed troubleshooting
- Customization options
- Advanced features
- Privacy information

---

**Total setup time: ~5 minutes**
