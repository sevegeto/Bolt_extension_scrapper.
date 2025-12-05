# Customization Guide

## Advanced Customization for Specific Websites

### Adding Site-Specific Scraping Logic

You can add custom scraping logic for specific websites by modifying the `scrapeProductData()` function.

#### Example: Amazon-Specific Enhancements

```javascript
// Add this at the beginning of scrapeProductData() function
const isAmazon = window.location.hostname.includes('amazon');

if (isAmazon) {
  // Amazon-specific selectors
  data.title = getText(['#productTitle', '#title']);
  data.price = getText(['#priceblock_ourprice', '.a-price-whole']);
  data.brand = getText(['#bylineInfo', '#brand']);
  data.imageUrl = getAttr('#landingImage', 'src');
}
```

#### Example: eBay-Specific Enhancements

```javascript
const isEbay = window.location.hostname.includes('ebay');

if (isEbay) {
  data.title = getText(['.x-item-title__mainTitle', 'h1.it-ttl']);
  data.price = getText(['.x-price-primary', '#prcIsum']);
  data.condition = getText(['.x-item-condition-text', '.vi-cond']);
}
```

#### Example: Shopify Store Detection

```javascript
const isShopify = document.querySelector('meta[content*="Shopify"]') !== null;

if (isShopify) {
  data.title = getText(['.product-title', 'h1.product__title']);
  data.price = getText(['.product-price', '.price__regular']);
  data.sku = getAttr('[data-product-sku]', 'data-product-sku');
}
```

### Adding New Fields

#### 1. Update the Data Object

In both `popup.js` and `content.js`, add your new field:

```javascript
const data = {
  // ... existing fields
  condition: '',
  weight: '',
  dimensions: '',
  warranty: ''
};
```

#### 2. Add Scraping Logic

```javascript
// Condition (new, used, refurbished)
data.condition = getText([
  '.condition',
  '[itemprop="itemCondition"]',
  '.product-condition'
]);

// Weight
data.weight = getText([
  '[itemprop="weight"]',
  '.product-weight',
  '.weight'
]);

// Dimensions
data.dimensions = getText([
  '.dimensions',
  '.product-dimensions',
  '[data-dimensions]'
]);

// Warranty
data.warranty = getText([
  '.warranty',
  '.product-warranty',
  '[data-warranty]'
]);
```

#### 3. Update Google Apps Script

Add the new columns to your Google Apps Script:

```javascript
const headers = [
  // ... existing headers
  'Condition',
  'Weight',
  'Dimensions',
  'Warranty'
];

const row = [
  // ... existing data
  data.condition || '',
  data.weight || '',
  data.dimensions || '',
  data.warranty || ''
];
```

#### 4. Update the Preview Display

In `popup.js`, add the new fields to the preview:

```javascript
const fields = [
  // ... existing fields
  { key: 'condition', label: 'Condition' },
  { key: 'weight', label: 'Weight' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'warranty', label: 'Warranty' }
];
```

### Creating Site-Specific Scrapers

For websites that need special handling, create a switch statement:

```javascript
function scrapeProductData() {
  const hostname = window.location.hostname;

  // Initialize data object
  const data = { /* ... */ };

  // Site-specific logic
  if (hostname.includes('amazon')) {
    return scrapeAmazon(data);
  } else if (hostname.includes('ebay')) {
    return scrapeEbay(data);
  } else if (hostname.includes('etsy')) {
    return scrapeEtsy(data);
  } else {
    return scrapeGeneric(data);
  }
}

function scrapeAmazon(data) {
  data.title = getText('#productTitle');
  data.price = getText('#priceblock_ourprice');
  // ... Amazon-specific logic
  return data;
}

function scrapeEbay(data) {
  data.title = getText('.x-item-title__mainTitle');
  data.price = getText('.x-price-primary');
  // ... eBay-specific logic
  return data;
}

function scrapeGeneric(data) {
  // Use the existing generic scraping logic
  // ... existing code
  return data;
}
```

### Extracting Data from JSON-LD

Many websites include structured data in JSON-LD format:

```javascript
function getJsonLdData() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const jsonData = JSON.parse(script.textContent);

      if (jsonData['@type'] === 'Product') {
        return {
          title: jsonData.name || '',
          description: jsonData.description || '',
          price: jsonData.offers?.price || '',
          currency: jsonData.offers?.priceCurrency || '',
          brand: jsonData.brand?.name || '',
          sku: jsonData.sku || '',
          gtin: jsonData.gtin || jsonData.gtin13 || '',
          imageUrl: jsonData.image?.[0] || jsonData.image || ''
        };
      }
    } catch (e) {
      console.error('Error parsing JSON-LD:', e);
    }
  }

  return null;
}

// Use it in scrapeProductData()
const jsonLdData = getJsonLdData();
if (jsonLdData) {
  Object.assign(data, jsonLdData);
}
```

### Handling Dynamic Content

For websites that load content dynamically:

```javascript
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Element not found within timeout'));
    }, timeout);
  });
}

// Usage
async function scrapeProductData() {
  // Wait for price to load
  await waitForElement('.price');

  // Now scrape the data
  const data = { /* ... */ };
  // ... rest of scraping logic
}
```

### Custom Currency Detection

```javascript
function detectCurrency(priceText) {
  const currencyMap = {
    '$': 'USD',
    'US$': 'USD',
    'USD': 'USD',
    '€': 'EUR',
    'EUR': 'EUR',
    '£': 'GBP',
    'GBP': 'GBP',
    '¥': 'JPY',
    'JPY': 'JPY',
    '₹': 'INR',
    'INR': 'INR',
    'R$': 'BRL',
    'BRL': 'BRL',
    'MXN': 'MXN',
    '$MX': 'MXN',
    'ARS': 'ARS',
    '$AR': 'ARS'
  };

  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (priceText.includes(symbol)) {
      return code;
    }
  }

  return 'USD'; // Default
}
```

### Mercadolibre-Specific Scraping

Since you mentioned Mercadolibre, here's a custom scraper:

```javascript
function scrapeMercadolibre(data) {
  // Mercadolibre uses specific class names
  data.title = getText(['.ui-pdp-title', 'h1.item-title']);

  // Price
  const priceElement = document.querySelector('.andes-money-amount__fraction');
  if (priceElement) {
    data.price = priceElement.textContent.trim().replace(/\./g, '');
  }

  // Currency
  const currencyElement = document.querySelector('.andes-money-amount__currency-symbol');
  if (currencyElement) {
    const symbol = currencyElement.textContent.trim();
    data.currency = symbol === '$' ? 'ARS' : 'USD'; // Adjust based on site
  }

  // Condition
  data.condition = getText('.ui-pdp-subtitle');

  // Specs from attributes table
  const specs = document.querySelectorAll('.andes-table__row');
  specs.forEach(row => {
    const label = row.querySelector('.andes-table__header')?.textContent.toLowerCase() || '';
    const value = row.querySelector('.andes-table__column')?.textContent.trim() || '';

    if (label.includes('marca')) data.brand = value;
    if (label.includes('modelo')) data.model = value;
    if (label.includes('código')) data.sku = value;
    if (label.includes('color')) data.color = value;
  });

  // Image
  data.imageUrl = getAttr(['.ui-pdp-image', '.ui-pdp-gallery__figure img'], 'src');

  return data;
}
```

## Configuration Options

### Modify Timeout

In `config.js`:

```javascript
const CONFIG = {
  TIMEOUT_MS: 15000  // Increase to 15 seconds for slow connections
};
```

### Add Multiple Sheet Destinations

```javascript
const CONFIG = {
  SHEETS: {
    amazon: 'https://script.google.com/macros/s/.../exec',
    ebay: 'https://script.google.com/macros/s/.../exec',
    default: 'https://script.google.com/macros/s/.../exec'
  }
};

// Then in popup.js:
const hostname = new URL(productData.url).hostname;
let scriptUrl = CONFIG.SHEETS.default;

if (hostname.includes('amazon')) {
  scriptUrl = CONFIG.SHEETS.amazon;
} else if (hostname.includes('ebay')) {
  scriptUrl = CONFIG.SHEETS.ebay;
}
```

### Add Data Validation

```javascript
function validateProductData(data) {
  const errors = [];

  if (!data.title || data.title === 'N/A') {
    errors.push('Title is required');
  }

  if (!data.price || data.price === 'N/A') {
    errors.push('Price is required');
  }

  if (data.price && isNaN(parseFloat(data.price))) {
    errors.push('Price must be a valid number');
  }

  return errors;
}

// Use in popup.js before sending:
const errors = validateProductData(productData);
if (errors.length > 0) {
  showStatus('✗ Validation failed: ' + errors.join(', '), 'error');
  return;
}
```

## Testing Your Customizations

1. Use the included `test-product-page.html` file
2. Open it in Chrome
3. Test your extension on it
4. Modify the HTML to test different scenarios
5. Check browser console for errors (F12 → Console)

## Debugging Tips

### Enable Console Logging

Add at the beginning of `scrapeProductData()`:

```javascript
console.log('=== Product Scraping Started ===');
console.log('URL:', window.location.href);
console.log('Hostname:', window.location.hostname);
```

Add before returning data:

```javascript
console.log('=== Scraped Data ===');
console.log(JSON.stringify(data, null, 2));
```

### Inspect Extension Logs

1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Inspect views: service worker"
4. Check the Console tab for errors

### Test Individual Selectors

Open browser console on a product page:

```javascript
// Test if a selector works
document.querySelector('.price')?.textContent

// Test multiple selectors
['.price', '.product-price', '[data-price]'].map(s =>
  document.querySelector(s)?.textContent
)
```

## Performance Optimization

### Reduce Selector Checks

Instead of checking many selectors, prioritize common ones:

```javascript
// Before (checks all even if first one works)
const price = getText(['.price', '.product-price', '.current-price', /* ... 10 more ... */]);

// After (stops at first match, faster)
function getTextOptimized(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return '';
}
```

### Cache Repeated Queries

```javascript
const cache = {};

function getCached(selector) {
  if (!cache[selector]) {
    cache[selector] = document.querySelector(selector);
  }
  return cache[selector];
}
```

---

Happy customizing! 🛠️
