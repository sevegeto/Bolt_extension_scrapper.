const scrapeBtn = document.getElementById('scrapeBtn');
const previewBtn = document.getElementById('previewBtn');
const statusDiv = document.getElementById('status');
const previewContainer = document.getElementById('previewContainer');
const previewDiv = document.getElementById('preview');
const configWarning = document.getElementById('configWarning');

let currentProductData = null;

if (CONFIG.GOOGLE_APPS_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
  configWarning.style.display = 'block';
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 5000);
  }
}

function formatPreview(data) {
  const fields = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'price', label: 'Price' },
    { key: 'currency', label: 'Currency' },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'mpn', label: 'MPN' },
    { key: 'sku', label: 'SKU' },
    { key: 'upc', label: 'UPC' },
    { key: 'gtin', label: 'GTIN' },
    { key: 'color', label: 'Color' },
    { key: 'size', label: 'Size' },
    { key: 'cost', label: 'Cost' },
    { key: 'taxes', label: 'Taxes' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'url', label: 'Product URL' },
    { key: 'imageUrl', label: 'Image URL' }
  ];

  let html = '';

  fields.forEach(field => {
    const value = data[field.key];
    if (value && value !== 'N/A' && value !== '') {
      html += `
        <div class="preview-item">
          <div class="preview-label">${field.label}:</div>
          <div class="preview-value">${value}</div>
        </div>
      `;
    }
  });

  if (data.imageUrl && data.imageUrl !== 'N/A') {
    html += `
      <div class="preview-item">
        <div class="preview-label">Product Image:</div>
        <img src="${data.imageUrl}" class="preview-image" onerror="this.style.display='none'" />
      </div>
    `;
  }

  return html || '<p style="color: #6c757d;">No data available</p>';
}

previewBtn.addEventListener('click', async () => {
  try {
    showStatus('Loading product data...', 'loading');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeProductData
    });

    const productData = results[0].result;
    currentProductData = productData;

    previewDiv.innerHTML = formatPreview(productData);
    previewContainer.style.display = 'block';
    showStatus('✓ Data loaded successfully', 'success');

  } catch (error) {
    console.error('Preview error:', error);
    showStatus('✗ Failed to load data: ' + error.message, 'error');
  }
});

scrapeBtn.addEventListener('click', async () => {
  try {
    if (CONFIG.GOOGLE_APPS_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
      showStatus('✗ Please configure Google Apps Script URL in config.js', 'error');
      return;
    }

    scrapeBtn.disabled = true;
    previewBtn.disabled = true;
    showStatus('⏳ Scraping product data...', 'loading');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeProductData
    });

    const productData = results[0].result;

    if (!productData || !productData.title) {
      throw new Error('No product data found on this page');
    }

    currentProductData = productData;

    showStatus('⏳ Sending data to Google Sheets...', 'loading');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Success!',
      message: 'Product data added to Google Sheets',
      priority: 2
    });

    showStatus('✓ Product data successfully added to Google Sheets!', 'success');

    previewDiv.innerHTML = formatPreview(productData);
    previewContainer.style.display = 'block';

  } catch (error) {
    console.error('Scraping error:', error);

    let errorMessage = 'Failed to add product data';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - check your Google Apps Script URL';
    } else if (error.message) {
      errorMessage = error.message;
    }

    showStatus('✗ ' + errorMessage, 'error');

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Error',
      message: errorMessage,
      priority: 2
    });
  } finally {
    scrapeBtn.disabled = false;
    previewBtn.disabled = false;
  }
});

function scrapeProductData() {
  const data = {
    title: '',
    description: '',
    price: '',
    currency: '',
    brand: '',
    model: '',
    mpn: '',
    sku: '',
    upc: '',
    gtin: '',
    color: '',
    size: '',
    cost: '',
    taxes: '',
    shipping: '',
    vendor: '',
    url: window.location.href,
    imageUrl: '',
    timestamp: new Date().toISOString(),
    domain: window.location.hostname
  };

  function getMetaContent(name) {
    const selectors = [
      `meta[property="${name}"]`,
      `meta[name="${name}"]`,
      `meta[itemprop="${name}"]`
    ];

    for (const selector of selectors) {
      const meta = document.querySelector(selector);
      if (meta && meta.content) return meta.content.trim();
    }
    return '';
  }

  function getText(selectors) {
    if (typeof selectors === 'string') selectors = [selectors];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }

  function getAttr(selectors, attr) {
    if (typeof selectors === 'string') selectors = [selectors];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.getAttribute(attr)) return el.getAttribute(attr).trim();
    }
    return '';
  }

  data.title = getMetaContent('og:title') ||
    getMetaContent('twitter:title') ||
    getText(['h1[itemprop="name"]', 'h1.product-title', 'h1.product-name', '.product-title h1', 'h1', '.title']) ||
    document.title;

  data.description = getMetaContent('og:description') ||
    getMetaContent('twitter:description') ||
    getMetaContent('description') ||
    getText([
      '[itemprop="description"]',
      '.product-description',
      '.product-details',
      '#product-description',
      '.description'
    ]);

  const priceSelectors = [
    '[itemprop="price"]',
    '.price',
    '.product-price',
    '.current-price',
    '[data-price]',
    '.price-now',
    '.sale-price',
    '.offer-price'
  ];

  let priceText = getText(priceSelectors) || getAttr('[itemprop="price"]', 'content');
  if (priceText) {
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      data.price = priceMatch[0].replace(/,/g, '');
    }

    const currencyMatch = priceText.match(/[$€£¥₹]/);
    if (currencyMatch) {
      const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
      data.currency = currencyMap[currencyMatch[0]] || 'USD';
    } else {
      data.currency = getMetaContent('og:price:currency') || 'USD';
    }
  }

  data.imageUrl = getMetaContent('og:image') ||
    getMetaContent('twitter:image') ||
    getAttr(['[itemprop="image"]', '.product-image img', '.main-image img', 'img.primary'], 'src');

  data.brand = getMetaContent('og:brand') ||
    getMetaContent('product:brand') ||
    getText(['[itemprop="brand"]', '.brand', '.product-brand', '[data-brand]']);

  data.sku = getText(['[itemprop="sku"]', '.sku', '.product-sku', '[data-sku]']) ||
    getAttr('[data-sku]', 'data-sku');

  data.mpn = getText(['[itemprop="mpn"]', '.mpn', '[data-mpn]']) ||
    getAttr('[data-mpn]', 'data-mpn');

  data.gtin = getText(['[itemprop="gtin"]', '[itemprop="gtin13"]', '[itemprop="gtin14"]', '.gtin']) ||
    getAttr('[itemprop="gtin"]', 'content');

  data.upc = getText(['.upc', '[data-upc]', '[itemprop="upc"]']);

  data.color = getText([
    '[itemprop="color"]',
    '.color',
    '.product-color',
    '.selected-color',
    '[data-color]',
    '.color-name'
  ]) || getAttr('.color-swatch.selected', 'title');

  data.size = getText([
    '[itemprop="size"]',
    '.size',
    '.product-size',
    '.selected-size',
    '[data-size]'
  ]) || getAttr('.size-option.selected', 'data-size');

  const specSelectors = document.querySelectorAll('.specs tr, .specifications tr, .product-attributes tr, [class*="spec"] dt, [class*="attribute"] dt');
  specSelectors.forEach(row => {
    const text = row.textContent.toLowerCase();
    const nextEl = row.nextElementSibling || row.querySelector('td:last-child');
    const value = nextEl ? nextEl.textContent.trim() : '';

    if (text.includes('model') && !data.model) data.model = value;
    if (text.includes('mpn') && !data.mpn) data.mpn = value;
    if (text.includes('upc') && !data.upc) data.upc = value;
    if (text.includes('gtin') && !data.gtin) data.gtin = value;
    if (text.includes('brand') && !data.brand) data.brand = value;
    if (text.includes('color') && !data.color) data.color = value;
    if (text.includes('size') && !data.size) data.size = value;
  });

  data.vendor = window.location.hostname.replace('www.', '');

  for (const key in data) {
    if (data[key] === '') {
      data[key] = 'N/A';
    }
  }

  return data;
}
