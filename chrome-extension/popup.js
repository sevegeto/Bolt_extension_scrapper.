const scrapeBtn = document.getElementById('scrapeBtn');
const previewBtn = document.getElementById('previewBtn');
const tableBtn = document.getElementById('tableBtn');
const statusDiv = document.getElementById('status');
const previewContainer = document.getElementById('previewContainer');
const previewDiv = document.getElementById('preview');
const configWarning = document.getElementById('configWarning');
const authSection = document.getElementById('authSection');
const userSection = document.getElementById('userSection');
const userEmail = document.getElementById('userEmail');
const signOutBtn = document.getElementById('signOutBtn');
const openDashboardLink = document.getElementById('openDashboardLink');
const viewDashboardBtn = document.getElementById('viewDashboardBtn');
const signInForm = document.getElementById('signInForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const dashboardUrlInput = document.getElementById('dashboardUrlInput');
const sheetsUrlInput = document.getElementById('sheetsUrlInput');
const sheetsCopyInput = document.getElementById('sheetsCopyInput');

let currentProductData = null;
let currentUser = null;

init().catch((error) => showStatus(error.message, 'error'));

async function init() {
  const stored = await chrome.storage.local.get(['dashboardUrl', 'sheetsUrl', 'alsoSendToSheets']);
  dashboardUrlInput.value = stored.dashboardUrl || CONFIG.DASHBOARD_URL;
  sheetsUrlInput.value = stored.sheetsUrl || (CONFIG.GOOGLE_APPS_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT') ? '' : CONFIG.GOOGLE_APPS_SCRIPT_URL);
  sheetsCopyInput.checked = Boolean(stored.alsoSendToSheets);

  if (!sheetsUrlInput.value) {
    configWarning.style.display = 'none';
  }

  await checkAuth();
}

async function checkAuth() {
  const session = await SupabaseClient.getSession().catch(() => null);
  currentUser = session?.user || null;

  if (currentUser) {
    userEmail.textContent = currentUser.email;
    authSection.style.display = 'none';
    userSection.style.display = 'block';
    scrapeBtn.disabled = false;
  } else {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
    scrapeBtn.disabled = true;
  }
}

signInForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('Signing in...', 'loading');
  try {
    await SupabaseClient.signIn(emailInput.value, passwordInput.value);
    emailInput.value = '';
    passwordInput.value = '';
    await checkAuth();
    showStatus('Signed in.', 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

signOutBtn.addEventListener('click', async () => {
  await SupabaseClient.signOut();
  await checkAuth();
  showStatus('Signed out.', 'success');
});

dashboardUrlInput.addEventListener('change', saveSettings);
sheetsUrlInput.addEventListener('change', saveSettings);
sheetsCopyInput.addEventListener('change', saveSettings);

async function saveSettings() {
  await chrome.storage.local.set({
    dashboardUrl: dashboardUrlInput.value.trim() || CONFIG.DASHBOARD_URL,
    sheetsUrl: sheetsUrlInput.value.trim(),
    alsoSendToSheets: sheetsCopyInput.checked,
  });
}

openDashboardLink.addEventListener('click', (event) => {
  event.preventDefault();
  openDashboard();
});
viewDashboardBtn.addEventListener('click', openDashboard);

async function openDashboard() {
  await saveSettings();
  const url = dashboardUrlInput.value.trim() || CONFIG.DASHBOARD_URL;
  chrome.tabs.create({ url });
}

previewBtn.addEventListener('click', async () => {
  try {
    showStatus('Reading this page...', 'loading');
    currentProductData = await scrapeActiveTab();
    previewDiv.innerHTML = '';
    previewDiv.appendChild(formatPreview(currentProductData));
    previewContainer.style.display = 'block';
    showStatus('Preview ready.', 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

tableBtn.addEventListener('click', async () => {
  try {
    showStatus('Looking for tables...', 'loading');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    assertPage(tab);
    const response = await sendOrInject(tab.id, { action: 'openTableExtractor' });
    if (!response?.success) throw new Error(response?.error || 'Could not open the table tool');
    window.close();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

scrapeBtn.addEventListener('click', async () => {
  try {
    if (!currentUser) throw new Error('Sign in first');
    scrapeBtn.disabled = true;
    previewBtn.disabled = true;
    showStatus('Reading this page...', 'loading');

    const productData = await scrapeActiveTab();
    currentProductData = productData;
    const session = await SupabaseClient.getSession();
    if (!session) throw new Error('Not authenticated');

    showStatus('Saving to the dashboard...', 'loading');
    await SupabaseClient.saveProduct(toProductRecord(productData, session.user.id));

    await saveSettings();
    if (sheetsCopyInput.checked) {
      showStatus('Sending a copy to Google Sheets...', 'loading');
      await sendToSheets(productData);
      showStatus('Saved. The sheet row was sent. Open the sheet to confirm it.', 'success');
    } else {
      showStatus('Product saved to your dashboard.', 'success');
    }

    notify('Product saved', productData.title || 'Saved to your dashboard');
    previewDiv.innerHTML = '';
    previewDiv.appendChild(formatPreview(productData));
    previewContainer.style.display = 'block';
  } catch (error) {
    showStatus(error.message, 'error');
    notify('Scrape failed', error.message);
  } finally {
    scrapeBtn.disabled = !currentUser;
    previewBtn.disabled = false;
  }
});

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  assertPage(tab);
  const response = await sendOrInject(tab.id, { action: 'scrapeProduct' });
  if (!response?.success || !response.data?.title) {
    throw new Error(response?.error || 'No product data found on this page');
  }
  return response.data;
}

function assertPage(tab) {
  if (!tab?.id || !tab.url || /^(chrome|edge|about|devtools|chrome-extension):/i.test(tab.url)) {
    throw new Error('Open a normal product page first');
  }
}

async function sendOrInject(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scraper-engine.js', 'table-extract.js', 'content.js'],
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function toProductRecord(data, userId) {
  const pictures = Array.isArray(data.pictures) ? data.pictures : [];
  const images = pictures.map((picture) => {
    if (typeof picture === 'string') return picture;
    return picture?.url || picture?.secure_url || '';
  }).filter((src) => /^https?:\/\//i.test(src)).slice(0, 10);

  if (!images.length && /^https?:\/\//i.test(data.imageUrl || '')) images.push(data.imageUrl);

  return {
    user_id: userId,
    source_url: data.url,
    domain: String(data.domain || '').replace(/^www\./, '') || null,
    title: clean(data.title),
    price: clean(data.price),
    currency: clean(data.currency) || 'USD',
    brand: clean(data.brand),
    description: clean(data.description),
    images,
    features: [],
    specifications: {
      model: clean(data.model),
      mpn: clean(data.mpn),
      sku: clean(data.sku),
      upc: clean(data.upc),
      gtin: clean(data.gtin),
      color: clean(data.color),
      size: clean(data.size),
      condition: clean(data.condition),
      warranty: clean(data.warranty),
      original_price: clean(data.original_price),
      category: clean(data.category_id),
      attributes: Array.isArray(data.attributes) ? data.attributes : [],
    },
    availability: clean(data.available_quantity),
    rating: null,
    review_count: 0,
    scrape_method: 'extension',
    raw_data: data,
  };
}

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text === 'N/A') return null;
  return text;
}

async function sendToSheets(productData) {
  const url = sheetsUrlInput.value.trim();
  if (!url || url.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
    throw new Error('Add the Google Apps Script URL in the extension settings');
  }

  const pictures = Array.isArray(productData.pictures) && productData.pictures.length
    ? productData.pictures
    : (productData.imageUrl ? [productData.imageUrl] : []);

  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...productData, pictures }),
  });
}

function formatPreview(data) {
  const wrapper = document.createElement('div');
  const fields = [
    ['Title', data.title],
    ['Price', [data.currency, data.price].filter(Boolean).join(' ')],
    ['Brand', data.brand],
    ['Condition', data.condition],
    ['SKU', data.sku],
    ['GTIN', data.gtin],
    ['URL', data.url],
  ];

  fields.forEach(([label, value]) => {
    if (!value || value === 'N/A') return;
    const item = document.createElement('div');
    item.className = 'preview-item';
    const name = document.createElement('div');
    name.className = 'preview-label';
    name.textContent = `${label}:`;
    const text = document.createElement('div');
    text.className = 'preview-value';
    text.textContent = String(value);
    item.append(name, text);
    wrapper.appendChild(item);
  });

  const image = (data.pictures && data.pictures[0]) || data.imageUrl;
  const imageUrl = typeof image === 'string' ? image : image?.url;
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const picture = document.createElement('img');
    picture.className = 'preview-image';
    picture.alt = data.title || 'Product';
    picture.src = imageUrl;
    item.appendChild(picture);
    wrapper.appendChild(item);
  }

  if (!wrapper.childElementCount) {
    wrapper.textContent = 'No data available';
  }
  return wrapper;
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      if (statusDiv.textContent === message) statusDiv.className = 'status';
    }, 6000);
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message: message || '',
    priority: 1,
  });
}
