chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeProduct') {
    try {
      const productData = ScraperEngine.scrape();
      sendResponse({ success: true, data: productData });
    } catch (error) {
      console.error('Scraping error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function scrapeProductData_LEGACY() {
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
