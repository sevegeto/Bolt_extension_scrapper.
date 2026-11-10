export type ProductData = {
  title: string | null;
  price: string | null;
  brand: string | null;
  description: string | null;
  images: string[];
  features: string[];
  specifications: Record<string, string>;
  availability: string | null;
  rating: number | null;
  review_count: number;
  currency: string;
};

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page, request } = context;
  try {
    await page.waitForSelector('body', { timeout: 15000 });
  } catch (_error) {
    // The page can still be readable when the selector wait times out.
  }
  const html = await page.content();
  return { url: request.url, html };
}`;

export function normalizePrice(raw: string): string | null {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      return cleaned.replace(/\./g, '').replace(',', '.');
    }
    return cleaned.replace(/,/g, '');
  }

  if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    if (decimals === 2) return cleaned.replace(',', '.');
    return cleaned.replace(/,/g, '');
  }

  if ((cleaned.match(/\./g) || []).length > 1) {
    return cleaned.replace(/\./g, '');
  }

  return cleaned;
}

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('That host is not allowed');
  }
  return url;
}

function isPrivateHostname(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'metadata.goog'
  ) {
    return true;
  }

  if (host.includes(':')) {
    const address = host.split('%')[0];
    if (address === '::1' || address === '::') return true;
    if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80')) return true;
    const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateHostname(mapped[1]);
    return false;
  }

  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return true;
    return isPrivateOctets((value >>> 24) & 255, (value >>> 16) & 255);
  }

  const parts = host.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    const octets = parts.map((part) => Number(part));
    if (octets.some((part) => part > 255)) return true;
    return isPrivateOctets(octets[0], octets[1]);
  }

  return false;
}

function isPrivateOctets(first: number, second: number): boolean {
  if (first === 0 || first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first >= 224) return true;
  return false;
}

export function decodeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code = body[1]?.toLowerCase() === 'x'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml((match[2] ?? match[3] ?? match[4] ?? '').trim());
  }
  return attributes;
}

function metaContent(html: string, key: string): string {
  const wanted = key.toLowerCase();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attributes = parseAttributes(tag);
    const id = attributes.property || attributes.name || attributes.itemprop || '';
    if (id.toLowerCase() === wanted && attributes.content) return attributes.content;
  }
  return '';
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

function pushImage(images: string[], value: string, base: string) {
  if (!value || images.length >= 10) return;
  const full = absoluteUrl(value, base);
  if (!full || !/^https?:\/\//i.test(full)) return;
  if (/icon|logo|pixel|1x1|sprite|blank\.(gif|png)/i.test(full)) return;
  if (!images.includes(full)) images.push(full);
}

function readJsonLd(html: string, data: ProductData, pageUrl: string) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    try {
      collectProducts(JSON.parse(script[1])).forEach((product) => applyJsonLdProduct(product, data, pageUrl));
    } catch {
      // Ignore broken JSON-LD blocks.
    }
  }
}

function collectProducts(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((item) => collectProducts(item, found));
    return found;
  }

  const record = node as Record<string, unknown>;
  if (record['@graph']) collectProducts(record['@graph'], found);
  const type = record['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes('Product')) found.push(record);
  return found;
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value && typeof value === 'object' && 'name' in value) {
    return textValue((value as { name?: unknown }).name);
  }
  return '';
}

function applyJsonLdProduct(product: Record<string, unknown>, data: ProductData, pageUrl: string) {
  if (!data.title) data.title = textValue(product.name) || null;
  if (!data.description) data.description = textValue(product.description) || null;
  if (!data.brand) data.brand = textValue(product.brand) || null;
  if (product.sku) data.specifications.sku = textValue(product.sku);
  const gtin = textValue(product.gtin || product.gtin13 || product.gtin14 || product.gtin12 || product.gtin8);
  if (gtin) data.specifications.gtin = gtin;

  const image = product.image;
  const images = Array.isArray(image) ? image : image ? [image] : [];
  images.forEach((item) => {
    const url = typeof item === 'string' ? item : textValue((item as { url?: unknown })?.url);
    if (url) pushImage(data.images, url, pageUrl);
  });

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  if (offers && typeof offers === 'object') {
    const offer = offers as Record<string, unknown>;
    if (!data.price) data.price = normalizePrice(textValue(offer.price));
    const currency = textValue(offer.priceCurrency);
    if (currency) data.currency = currency.toUpperCase();
    const availability = textValue(offer.availability);
    if (availability && !data.availability) data.availability = availability.split('/').pop() || availability;
  }

  const rating = product.aggregateRating;
  if (rating && typeof rating === 'object') {
    const aggregate = rating as Record<string, unknown>;
    const ratingText = textValue(aggregate.ratingValue);
    const countText = textValue(aggregate.reviewCount || aggregate.ratingCount);
    const value = Number(ratingText);
    const count = Number(countText);
    if (ratingText && Number.isFinite(value)) data.rating = data.rating ?? Math.min(9.99, Math.max(0, value));
    if (countText && Number.isFinite(count)) data.review_count = data.review_count || Math.max(0, Math.round(count));
  }
}

export function extractProductDataFromHtml(html: string, pageUrl: string): ProductData {
  const data: ProductData = {
    title: null,
    price: null,
    brand: null,
    description: null,
    images: [],
    features: [],
    specifications: {},
    availability: null,
    rating: null,
    review_count: 0,
    currency: 'USD',
  };

  readJsonLd(html, data, pageUrl);

  data.title = data.title ||
    metaContent(html, 'og:title') ||
    metaContent(html, 'twitter:title') ||
    metaContent(html, 'name') ||
    firstTagText(html, 'h1') ||
    firstTagText(html, 'title') ||
    null;

  data.description = data.description ||
    metaContent(html, 'og:description') ||
    metaContent(html, 'twitter:description') ||
    metaContent(html, 'description') ||
    null;

  ['og:image', 'twitter:image', 'image'].forEach((key) => pushImage(data.images, metaContent(html, key), pageUrl));

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    if (data.images.length >= 10) break;
    const attributes = parseAttributes(tag);
    const source = attributes.src || attributes['data-src'] || attributes['data-original'] || '';
    if (source) pushImage(data.images, source, pageUrl);
  }

  const currency = (metaContent(html, 'og:price:currency') || metaContent(html, 'product:price:currency')).toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) data.currency = currency;

  if (!data.price) {
    const amount = metaContent(html, 'og:price:amount') || metaContent(html, 'product:price:amount') || metaContent(html, 'price');
    data.price = amount ? normalizePrice(amount) : null;
  }

  if (!data.price) {
    const priceTag = html.match(/<(?:span|div)\b[^>]*(?:class|id)=["'][^"']*price[^"']*["'][^>]*>\s*([$€£¥₹])?\s*([\d][\d.,]*)/i);
    if (priceTag?.[2]) {
      data.price = normalizePrice(priceTag[2]);
      if (data.currency === 'USD' && priceTag[1] && CURRENCY_BY_SYMBOL[priceTag[1]]) {
        data.currency = CURRENCY_BY_SYMBOL[priceTag[1]];
      }
    }
  }

  data.brand = data.brand ||
    metaContent(html, 'og:brand') ||
    metaContent(html, 'product:brand') ||
    metaContent(html, 'brand') ||
    null;

  data.availability = data.availability ||
    metaContent(html, 'og:availability') ||
    metaContent(html, 'product:availability') ||
    null;

  if (!data.rating) {
    const ratingText = metaContent(html, 'ratingValue');
    const rating = Number(ratingText);
    if (ratingText && Number.isFinite(rating)) data.rating = Math.min(9.99, Math.max(0, rating));
  }
  if (!data.review_count) {
    const reviewText = metaContent(html, 'reviewCount');
    const reviews = Number(reviewText);
    if (reviewText && Number.isFinite(reviews)) data.review_count = Math.max(0, Math.round(reviews));
  }

  const sku = metaContent(html, 'sku');
  if (sku) data.specifications.sku = sku;

  if (data.title) data.title = data.title.replace(/\s+/g, ' ').trim();
  if (data.description) data.description = data.description.replace(/\s+/g, ' ').trim();
  return data;
}

function firstTagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) return '';
  return decodeHtml(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function isLiteralIp(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") || host.includes(":")) return true;
  if (/^\d+$/.test(host)) return true;
  const parts = host.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part));
}

async function assertResolvedPublic(rawUrl: string): Promise<URL> {
  const url = assertPublicUrl(rawUrl);
  if (isLiteralIp(url.hostname)) return url;

  const records: string[] = [];
  for (const recordType of ["A", "AAAA"] as const) {
    try {
      records.push(...await Deno.resolveDns(url.hostname, recordType));
    } catch {
      // This record type is missing. The other type can still be public.
    }
  }
  if (!records.length) throw new Error("Could not resolve that host");
  for (const record of records) {
    if (isPrivateHostname(record)) throw new Error("That host is not allowed");
  }
  return url;
}

async function fetchPublicHtml(rawUrl: string): Promise<string> {
  let current = await assertResolvedPublic(rawUrl);

  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(current.href, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8,es;q=0.6',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The site returned a redirect without a destination');
      current = await assertResolvedPublic(new URL(location, current).href);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`);
    }

    const html = await response.text();
    if (looksLikeBlockedPage(html)) {
      throw new Error('Site blocked request - CAPTCHA or bot detection triggered');
    }
    return html;
  }

  throw new Error('The site redirected too many times');
}

function looksLikeBlockedPage(html: string): boolean {
  if (html.length > 30000) return false;
  if (metaContent(html, 'og:title') || metaContent(html, 'og:price:amount')) return false;
  return /captcha|cf-challenge|g-recaptcha|verify you are (a )?human|access denied|robot check/i.test(html);
}

async function htmlFromApify(url: string, token: string): Promise<string> {
  const endpoint = new URL('https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items');
  endpoint.searchParams.set('timeout', '50');
  endpoint.searchParams.set('memory', '1024');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      startUrls: [{ url }],
      pageFunction: PAGE_FUNCTION,
      linkSelector: '',
      maxPagesPerCrawl: 1,
    }),
    signal: AbortSignal.timeout(55000),
  });

  if (!response.ok) {
    throw new Error(`Apify returned ${response.status}`);
  }

  const results = await response.json();
  const html = Array.isArray(results) ? results.find((item) => item?.html)?.html : '';
  if (!html || typeof html !== 'string') {
    throw new Error('Apify returned no page HTML');
  }
  return html;
}

export async function scrapeProduct(url: string, apifyToken?: string): Promise<ProductData> {
  assertPublicUrl(url);
  let directError: Error | null = null;

  try {
    const html = await fetchPublicHtml(url);
    const data = extractProductDataFromHtml(html, url);
    if (data.title || data.price) return data;
    directError = new Error('The page did not include a product title or price');
  } catch (error) {
    directError = error instanceof Error ? error : new Error('Could not fetch the page');
  }

  if (!apifyToken) throw directError;

  try {
    const html = await htmlFromApify(url, apifyToken);
    const data = extractProductDataFromHtml(html, url);
    if (!data.title && !data.price) {
      throw new Error('The browser scrape did not find a product title or price');
    }
    return data;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Apify failed';
    throw new Error(`${directError.message}. ${reason}`);
  }
}

export function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return message.replace(/token=[^&\s]+/gi, 'token=redacted').slice(0, 500);
}
