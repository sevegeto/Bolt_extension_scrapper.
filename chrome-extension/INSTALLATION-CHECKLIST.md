# Installation Checklist

Use this checklist to ensure everything is set up correctly.

## ✅ Pre-Installation

- [ ] Chrome browser installed (or Chromium-based browser)
- [ ] Google account created
- [ ] All extension files downloaded

## ✅ Icon Setup

- [ ] Created `icons/` folder
- [ ] Created `icon16.png` (16x16 pixels)
- [ ] Created `icon48.png` (48x48 pixels)
- [ ] Created `icon128.png` (128x128 pixels)

**Quick icon creation options:**
- Use [favicon.io](https://favicon.io/favicon-generator/)
- Use [canva.com](https://www.canva.com) to design simple icons
- Download from [flaticon.com](https://www.flaticon.com) (search "shopping cart")

## ✅ Google Sheets Setup

- [ ] Created a new Google Sheet
- [ ] Named the sheet (e.g., "Product Scraper Data")
- [ ] Opened Extensions → Apps Script
- [ ] Copied code from `google-apps-script.js`
- [ ] Pasted into Apps Script editor
- [ ] Saved the project
- [ ] Clicked Deploy → New deployment
- [ ] Selected "Web app" as deployment type
- [ ] Set "Execute as" to "Me"
- [ ] Set "Who has access" to "Anyone"
- [ ] Clicked "Authorize access" and completed authorization
- [ ] Copied the Web App URL

**Your Web App URL should look like:**
```
https://script.google.com/macros/s/AKfycby.../exec
```

## ✅ Extension Configuration

- [ ] Opened `config.js`
- [ ] Replaced `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with actual URL
- [ ] Verified URL ends with `/exec`
- [ ] Saved the file

**Example config.js:**
```javascript
const CONFIG = {
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec',
  SHEET_NAME: 'Products',
  DEFAULT_CURRENCY: 'USD',
  TIMEOUT_MS: 10000
};
```

## ✅ Chrome Extension Installation

- [ ] Opened Chrome browser
- [ ] Navigated to `chrome://extensions/`
- [ ] Enabled "Developer mode" (toggle in top-right)
- [ ] Clicked "Load unpacked" button
- [ ] Selected the `chrome-extension` folder
- [ ] Extension appeared in the extensions list
- [ ] No error messages displayed
- [ ] Extension icon visible in toolbar

**If icon not visible:**
- [ ] Clicked the puzzle piece icon in Chrome toolbar
- [ ] Found "Product Data Scraper" in the list
- [ ] Clicked the pin icon to pin it to toolbar

## ✅ Testing

### Test 1: Check Configuration
- [ ] Clicked extension icon
- [ ] No yellow warning appears (or warning dismissed after config update)
- [ ] Extension loads without errors

### Test 2: Test with Sample Page
- [ ] Opened `test-product-page.html` in Chrome
- [ ] Clicked extension icon
- [ ] Clicked "Preview Data"
- [ ] Product data displayed correctly
- [ ] All major fields populated (Title, Price, Brand, etc.)

### Test 3: Send to Google Sheets
- [ ] On test page, clicked "Scrape Product Data"
- [ ] Saw "Sending data to Google Sheets..." message
- [ ] Received success notification
- [ ] Opened Google Sheet
- [ ] Verified new row added with product data
- [ ] Checked that all columns populated correctly

### Test 4: Real Website Test
- [ ] Went to Amazon product page (or eBay, Etsy)
- [ ] Clicked extension icon
- [ ] Clicked "Preview Data"
- [ ] Reviewed scraped data for accuracy
- [ ] Clicked "Scrape Product Data"
- [ ] Verified data added to Google Sheet

## ✅ Troubleshooting (if needed)

### Configuration Issues
- [ ] Verified Google Apps Script URL is correct
- [ ] Checked that URL doesn't have spaces or extra characters
- [ ] Confirmed Apps Script deployment is set to "Anyone"
- [ ] Tried redeploying the Apps Script as a new deployment

### Authorization Issues
- [ ] Completed Google authorization process
- [ ] Clicked "Advanced" if warning appeared
- [ ] Clicked "Go to [Project Name]"
- [ ] Granted all requested permissions

### Extension Issues
- [ ] Checked for errors in `chrome://extensions/`
- [ ] Clicked "Errors" button if any errors shown
- [ ] Inspected service worker for console logs
- [ ] Tried reloading the extension
- [ ] Verified all files are in correct locations

### Data Not Appearing
- [ ] Checked Google Sheet is correct one
- [ ] Refreshed the Google Sheet
- [ ] Looked for new tab named "Products"
- [ ] Checked Apps Script execution logs (Apps Script → Executions)
- [ ] Tested with `test-product-page.html` first

## ✅ Post-Installation

- [ ] Tested on 3+ different product pages
- [ ] Verified data accuracy in Google Sheet
- [ ] Bookmarked Google Sheet for easy access
- [ ] Read through README.md for advanced features
- [ ] Considered customizations from CUSTOMIZATION-GUIDE.md

## 🎉 Completion

If all items are checked, your extension is ready to use!

### Quick Reference Card

**To scrape a product:**
1. Navigate to product page
2. Click extension icon
3. Click "Scrape Product Data"
4. Check Google Sheet for new row

**To preview data first:**
1. Navigate to product page
2. Click extension icon
3. Click "Preview Data"
4. Review the data
5. Click "Scrape Product Data" if satisfied

### Support

- **Configuration issues?** → See SETUP-GUIDE.md
- **Want to customize?** → See CUSTOMIZATION-GUIDE.md
- **General questions?** → See README.md
- **Need to test?** → Open test-product-page.html

---

**Installation Date:** _________________

**Google Sheet URL:** _________________

**Notes:**
_________________
_________________
_________________
