# Product Data Scraper Chrome Extension

A powerful Chrome extension for scraping product data from e-commerce websites and exporting it to Google Sheets. Perfect for dropshippers, resellers, and anyone managing product catalogs.

## Features

- 🛍️ **Intelligent Product Scraping**: Automatically extracts product information including:
  - Title, Description, Price, Currency
  - Brand, Model, MPN, SKU, UPC, GTIN
  - Color, Size, Cost, Taxes, Shipping
  - Product Images, Vendor URL, and more

- 📊 **Google Sheets Integration**: Direct export to Google Sheets via Apps Script
- 👁️ **Live Preview**: Preview scraped data before sending to sheets
- 🔔 **Notifications**: Get instant feedback on successful exports
- 🎨 **Beautiful UI**: Modern, gradient-based interface with smooth animations
- ⚡ **Fast & Reliable**: Built with Manifest V3 for optimal performance
- 🔒 **Secure**: No data storage, direct communication with Google Sheets

## Installation

### Step 1: Install the Extension

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `chrome-extension` folder

### Step 2: Create Placeholder Icons

Create three placeholder icon files in the `chrome-extension/icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create simple placeholder icons using any image editor, or use an online icon generator.

### Step 3: Set Up Google Apps Script

1. **Create a New Google Sheet**:
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it "Product Scraper Data" (or any name you prefer)

2. **Open Apps Script Editor**:
   - In your Google Sheet, click **Extensions** → **Apps Script**
   - Delete any default code in the editor

3. **Add the Script**:
   - Copy the entire contents of `google-apps-script.js`
   - Paste it into the Apps Script editor
   - Click **Save** (disk icon) and name your project

4. **Deploy as Web App**:
   - Click **Deploy** → **New deployment**
   - Click the gear icon ⚙️ next to "Select type"
   - Choose **Web app**
   - Configure the deployment:
     - **Description**: Product Scraper API
     - **Execute as**: Me (your email)
     - **Who has access**: Anyone
   - Click **Deploy**
   - **Authorize** the script (you may see a warning - click "Advanced" → "Go to [Project Name]")
   - Copy the **Web App URL** (it will look like: `https://script.google.com/macros/s/...../exec`)

5. **Test the Web App**:
   - Open the Web App URL in your browser
   - You should see: `{"result":"success","message":"Web App is running. Use POST requests to add data."}`

### Step 4: Configure the Extension

1. Open `chrome-extension/config.js`
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with your Web App URL
3. Optionally customize:
   - `SHEET_NAME`: Name of the sheet tab (default: "Products")
   - `DEFAULT_CURRENCY`: Default currency code (default: "USD")
   - `TIMEOUT_MS`: Request timeout in milliseconds (default: 10000)

Example config.js:
```javascript
const CONFIG = {
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
  SHEET_NAME: 'Products',
  DEFAULT_CURRENCY: 'USD',
  TIMEOUT_MS: 10000
};
```

4. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the Product Data Scraper extension

## Usage

### Scraping Product Data

1. **Navigate** to any product page (Amazon, eBay, Shopify stores, etc.)
2. **Click** the extension icon in your Chrome toolbar
3. **Choose an option**:
   - **Scrape Product Data**: Extract and send to Google Sheets immediately
   - **Preview Data**: View scraped data before sending

### Understanding the Data

The extension captures these fields:

| Field | Description |
|-------|-------------|
| **Timestamp** | When the product was scraped |
| **Title** | Product name/title |
| **Description** | Product description |
| **Price** | Product price (numeric) |
| **Currency** | Currency code (USD, EUR, etc.) |
| **Brand** | Product brand/manufacturer |
| **Model** | Model number |
| **MPN** | Manufacturer Part Number |
| **SKU** | Stock Keeping Unit |
| **UPC** | Universal Product Code |
| **GTIN** | Global Trade Item Number |
| **Color** | Product color |
| **Size** | Product size |
| **Cost** | Your cost (if available) |
| **Taxes** | Tax amount (if available) |
| **Shipping** | Shipping cost (if available) |
| **Vendor** | Website domain name |
| **Product URL** | Full URL of the product page |
| **Image URL** | Main product image URL |
| **Domain** | Website hostname |
| **Status** | Processing status (default: "Pending") |

### Tips for Best Results

1. **Wait for page to load**: Let the product page fully load before scraping
2. **Check the preview**: Use the Preview button to verify data before sending
3. **Works on most sites**: The extension uses intelligent scraping that works with:
   - Amazon
   - eBay
   - Etsy
   - Shopify stores
   - WooCommerce stores
   - Most e-commerce platforms

4. **Missing data**: Fields that can't be found will show "N/A" in the sheet

## Google Sheets Output

Your Google Sheet will automatically include these columns:

```
Timestamp | Title | Description | Price | Currency | Brand | Model | MPN | SKU | UPC | GTIN | Color | Size | Cost | Taxes | Shipping | Vendor | Product URL | Image URL | Domain | Status
```

The first row is frozen and formatted as headers for easy reference.

## Troubleshooting

### "Configuration Required" Warning

**Problem**: You see a yellow warning in the extension popup.

**Solution**: Update the `GOOGLE_APPS_SCRIPT_URL` in `config.js` with your actual Web App URL.

### No Data Found

**Problem**: Extension says "No product data found on this page"

**Solutions**:
- Ensure you're on an actual product page (not a category or home page)
- Wait for the page to fully load
- Try the Preview button to see what data was detected
- Some websites use dynamic loading - try scrolling down first

### Request Timeout

**Problem**: "Request timeout" error message

**Solutions**:
- Check your internet connection
- Verify the Google Apps Script URL is correct
- Increase `TIMEOUT_MS` in config.js
- Make sure the Apps Script deployment is set to "Anyone" access

### Authorization Issues

**Problem**: Google Apps Script shows authorization warnings

**Solutions**:
- Click "Advanced" → "Go to [Project Name] (unsafe)"
- This is normal for personal scripts not verified by Google
- Your script only accesses your own spreadsheet

### Extension Not Appearing

**Problem**: Can't find the extension icon

**Solutions**:
- Click the puzzle piece icon in Chrome toolbar
- Pin the "Product Data Scraper" extension
- Ensure the extension is enabled in `chrome://extensions/`

## Advanced Configuration

### Customizing Scraping Logic

To modify which data is scraped, edit the `scrapeProductData()` function in:
- `popup.js` (lines 190-330)
- `content.js` (lines 18-158)

### Adding Custom Fields

1. **Update the data object** in `scrapeProductData()`:
```javascript
const data = {
  // ... existing fields
  customField: '',
};
```

2. **Add scraping logic**:
```javascript
data.customField = getText(['.custom-selector', '#custom-id']);
```

3. **Update Google Apps Script** to include the new column:
```javascript
const headers = [
  // ... existing headers
  'Custom Field'
];

const row = [
  // ... existing data
  data.customField || ''
];
```

### Using with Different Sheet

To use multiple sheets or different spreadsheets:

1. Change `SHEET_NAME` in `config.js`
2. Or modify the Apps Script to use different spreadsheet IDs:
```javascript
const ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
```

## Privacy & Security

- **No data storage**: All data goes directly from your browser to Google Sheets
- **No tracking**: Extension doesn't collect or transmit any analytics
- **Secure**: Uses HTTPS for all communications
- **Open source**: All code is visible and auditable

## Browser Compatibility

- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge (Chromium-based)
- ✅ Brave Browser
- ✅ Opera
- ❌ Firefox (uses different extension format)
- ❌ Safari (uses different extension format)

## Contributing

To contribute or customize:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is provided as-is for personal and commercial use.

## Support

If you encounter issues:

1. Check the console for errors (`chrome://extensions/` → Details → Inspect views: service worker)
2. Review the troubleshooting section
3. Verify your Google Apps Script is deployed correctly
4. Ensure all configuration is correct in `config.js`

## Future Enhancements

Potential features for future versions:
- Bulk scraping multiple products
- Custom field mapping
- Multiple Google Sheet destinations
- CSV export option
- Product comparison features
- Auto-publish to Mercadolibre integration
- Price tracking and alerts

---

**Made for dropshippers, resellers, and product catalog managers.**

Happy scraping! 🚀
