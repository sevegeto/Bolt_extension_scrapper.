# Google Sheets Integration Guide

## Overview
This guide explains how to export your scraped products to Google Sheets and how the Chrome Extension integrates with Google Sheets using Google Apps Script.

---

## Method 1: Manual CSV Import (Easiest)

### From the Dashboard:

1. **Export your products**
   - Click "Export CSV" dropdown
   - Select "Google Sheets"
   - A CSV file will download

2. **Import to Google Sheets**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet or open an existing one
   - Click **File > Import**
   - Select **Upload** tab
   - Drag and drop your CSV file
   - Choose import options:
     - Import location: "Replace spreadsheet" or "Insert new sheet(s)"
     - Separator type: "Comma"
     - Convert text to numbers: Optional
   - Click **Import data**

3. **Your data is now in Google Sheets!**
   - All columns including Image URLs are preserved
   - You can sort, filter, and analyze your products
   - Images can be downloaded using the URL columns

### CSV Columns (Full Export):
- Title, Brand, Price, Currency, Description
- **Image_1, Image_2, Image_3, Image_4, Image_5** - Individual image URLs
- **All_Images** - All URLs pipe-separated (for backup)
- Features, Specifications, Availability
- Rating, Reviews, Domain, Source_URL, Scraped_At

---

## Method 2: Chrome Extension Direct Integration (Advanced)

The Chrome Extension can send data **directly** to Google Sheets using Google Apps Script.

### Setup Process:

#### Step 1: Create a Google Apps Script

1. **Open Google Sheets**
   - Go to [sheets.google.com](https://sheets.google.com)
   - Create a new spreadsheet named "Product Scraper Data"

2. **Open Apps Script Editor**
   - Click **Extensions > Apps Script**
   - Delete any existing code
   - Copy and paste the script below

3. **Deploy the Script**
   - Click **Deploy > New deployment**
   - Click the gear icon ⚙️ next to "Select type"
   - Choose **Web app**
   - Settings:
     - Description: "Product Scraper Webhook"
     - Execute as: **Me**
     - Who has access: **Anyone** (required for Chrome Extension)
   - Click **Deploy**
   - **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/xxx/exec`)
   - Authorize the app when prompted

#### Step 2: Configure Chrome Extension

1. **Open the Extension folder**
   - Navigate to `chrome-extension/config.js`

2. **Add your Apps Script URL**
   ```javascript
   const CONFIG = {
     SUPABASE_URL: 'your-supabase-url',
     SUPABASE_ANON_KEY: 'your-key',
     GOOGLE_SHEETS_URL: 'https://script.google.com/macros/s/xxx/exec' // ADD THIS
   };
   ```

3. **Reload the extension**
   - Go to `chrome://extensions`
   - Click the reload button on Product Scraper extension

#### Step 3: Use the Extension

1. **Navigate to any product page** (Amazon, eBay, Walmart, etc.)
2. **Click the extension icon**
3. **Choose export option:**
   - "Save to Database" - Saves to Supabase (existing functionality)
   - "Send to Google Sheets" - Sends directly to your sheet
4. **Check your Google Sheet** - Data appears instantly!

---

## Google Apps Script Code

Copy this script into your Google Apps Script editor:

```javascript
/**
 * Product Scraper - Google Sheets Integration
 * Receives product data from Chrome Extension and writes to sheet
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);

    // Create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Title',
        'Brand',
        'Price',
        'Currency',
        'Description',
        'Image 1',
        'Image 2',
        'Image 3',
        'Image 4',
        'Image 5',
        'Features',
        'Specifications',
        'Availability',
        'Rating',
        'Reviews',
        'Domain',
        'Source URL',
        'Scraped At'
      ];
      sheet.appendRow(headers);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('#FFFFFF');
    }

    // Prepare row data
    const images = data.images || [];
    const features = (data.features || []).join(', ');
    const specs = JSON.stringify(data.specifications || {});

    const row = [
      data.title || '',
      data.brand || '',
      data.price || '',
      data.currency || 'USD',
      data.description || '',
      images[0] || '',
      images[1] || '',
      images[2] || '',
      images[3] || '',
      images[4] || '',
      features,
      specs,
      data.availability || '',
      data.rating || '',
      data.review_count || 0,
      data.domain || '',
      data.source_url || '',
      new Date().toLocaleString()
    ];

    // Append the row
    sheet.appendRow(row);

    // Auto-resize columns (optional - can be slow for large sheets)
    if (sheet.getLastRow() < 100) {
      sheet.autoResizeColumns(1, row.length);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Product added to Google Sheets',
        row: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function - run this to test the script
 */
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        title: 'Test Product',
        brand: 'Test Brand',
        price: '99.99',
        currency: 'USD',
        description: 'Test description',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        features: ['Feature 1', 'Feature 2'],
        specifications: { color: 'Blue', size: 'Large' },
        availability: 'In Stock',
        rating: 4.5,
        review_count: 100,
        domain: 'test.com',
        source_url: 'https://test.com/product'
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
```

### Script Features:
- ✅ Automatically creates headers on first run
- ✅ Formats header row with colors
- ✅ Handles multiple images (5 columns)
- ✅ Timestamps each entry
- ✅ Auto-resizes columns (for small sheets)
- ✅ Error handling
- ✅ Returns success/error status

---

## Updating the Chrome Extension

To enable Google Sheets export in the Chrome Extension:

### 1. Update `chrome-extension/popup.html`

Add a new button:

```html
<button id="exportToSheets" class="btn">
  📊 Send to Google Sheets
</button>
```

### 2. Update `chrome-extension/popup.js`

Add the export handler:

```javascript
document.getElementById('exportToSheets').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: 'scrapeAndExportToSheets' }, (response) => {
    if (response && response.success) {
      document.getElementById('status').textContent = '✅ Sent to Google Sheets!';
      document.getElementById('status').className = 'status success';
    } else {
      document.getElementById('status').textContent = '❌ Export failed';
      document.getElementById('status').className = 'status error';
    }
  });
});
```

### 3. Update `chrome-extension/content.js`

Add the export function:

```javascript
async function exportToGoogleSheets(productData) {
  const sheetsUrl = CONFIG.GOOGLE_SHEETS_URL;

  if (!sheetsUrl) {
    throw new Error('Google Sheets URL not configured');
  }

  const response = await fetch(sheetsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
    mode: 'no-cors' // Required for Apps Script
  });

  // Note: no-cors doesn't return response data, but the script will work
  return { success: true, message: 'Data sent to Google Sheets' };
}

// Add to message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeAndExportToSheets') {
    (async () => {
      try {
        const productData = await scrapeProductData();
        await exportToGoogleSheets(productData);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
});
```

---

## How It Works

### Data Flow:

```
Chrome Extension → Scrapes Product → Formats Data → POST Request →
Google Apps Script → Validates Data → Writes to Sheet → Returns Success
```

### Extension Flow:
1. User clicks "Send to Google Sheets" button
2. Extension scrapes current page
3. Data sent to your Apps Script URL
4. Apps Script validates and writes to sheet
5. User sees success confirmation

### Dashboard Flow:
1. User exports CSV from dashboard
2. Downloads file with all product data
3. Imports CSV into Google Sheets manually
4. All data including images preserved

---

## Downloading Images from Google Sheets

Once image URLs are in Google Sheets, you can download them:

### Option 1: Using Formulas
Insert a column with this formula to display images:
```
=IMAGE(F2)
```
Where F2 is the cell with the image URL.

### Option 2: Using Google Apps Script
Create a script to batch download:

```javascript
function downloadImages() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const imageUrls = sheet.getRange('F2:J').getValues(); // Columns F-J are images

  imageUrls.forEach((row, index) => {
    row.forEach((url, colIndex) => {
      if (url) {
        try {
          const response = UrlFetchApp.fetch(url);
          const blob = response.getBlob();
          const folder = DriveApp.getFolderById('YOUR_FOLDER_ID');
          folder.createFile(blob).setName(`product_${index + 2}_image_${colIndex + 1}.jpg`);
        } catch (error) {
          Logger.log(`Failed to download: ${url}`);
        }
      }
    });
  });
}
```

### Option 3: Using Extensions
- **Image Downloader** Chrome extension
- Paste URLs into extension
- Batch download all images

---

## Troubleshooting

### "Script not authorized" error
- Redeploy the script with correct permissions
- Make sure "Execute as: Me" is selected
- Ensure "Who has access: Anyone" is set

### Data not appearing in sheet
- Check the Apps Script execution logs (View > Executions)
- Verify the Web App URL is correct in config.js
- Make sure sheet is not protected

### Images not loading
- Verify URLs are valid and publicly accessible
- Some sites block hotlinking - you may need to re-host images
- Check if URLs start with `http://` or `https://`

### Chrome Extension not sending data
- Check that GOOGLE_SHEETS_URL is set in config.js
- Reload the extension after config changes
- Check browser console for errors (F12)

---

## Best Practices

1. **Create a dedicated spreadsheet** for product data
2. **Use filters and sorting** to organize products
3. **Create pivot tables** for analysis
4. **Set up conditional formatting** for price ranges
5. **Use data validation** for consistent categories
6. **Backup your sheet regularly**
7. **Share with your team** for collaboration

---

## Advanced: Bulk Processing with Apps Script

For processing multiple products at once:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Handle array of products
    if (Array.isArray(data)) {
      const rows = data.map(product => [
        product.title || '',
        product.brand || '',
        product.price || '',
        product.currency || 'USD',
        product.description || '',
        (product.images || [])[0] || '',
        (product.images || [])[1] || '',
        (product.images || [])[2] || '',
        (product.images || [])[3] || '',
        (product.images || [])[4] || '',
        (product.features || []).join(', '),
        JSON.stringify(product.specifications || {}),
        product.availability || '',
        product.rating || '',
        product.review_count || 0,
        product.domain || '',
        product.source_url || '',
        new Date().toLocaleString()
      ]);

      // Append all rows at once (much faster)
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `${rows.length} products added`,
          rows_added: rows.length
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single product handling (existing code)
    // ...

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Summary

- **Manual Import**: Best for bulk exports from dashboard
- **Chrome Extension**: Best for real-time scraping and instant upload
- **Image URLs**: All exports include image URLs in separate columns for easy downloading
- **Apps Script**: Provides direct integration without manual imports
- **Flexibility**: Choose the method that fits your workflow

Both methods preserve all product data including images, making it easy to work with your scraped products in Google Sheets!
