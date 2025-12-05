const PlatformDetector = {
  detect() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href;

    if (hostname.includes('mercadolibre') || hostname.includes('mercadolivre')) {
      if (hostname.includes('.mx')) return { platform: 'mercadolibre_mx', country: 'MX', currency: 'MXN' };
      if (hostname.includes('.com.br')) return { platform: 'mercadolibre_br', country: 'BR', currency: 'BRL' };
      if (hostname.includes('.com.ar')) return { platform: 'mercadolibre_ar', country: 'AR', currency: 'ARS' };
      if (hostname.includes('.com.co')) return { platform: 'mercadolibre_co', country: 'CO', currency: 'COP' };
      if (hostname.includes('.cl')) return { platform: 'mercadolibre_cl', country: 'CL', currency: 'CLP' };
      return { platform: 'mercadolibre', country: 'UNK', currency: 'USD' };
    }

    if (hostname.includes('amazon')) {
      if (hostname.includes('.mx')) return { platform: 'amazon_mx', country: 'MX', currency: 'MXN' };
      if (hostname.includes('.com.br')) return { platform: 'amazon_br', country: 'BR', currency: 'BRL' };
      if (hostname.includes('.co.uk')) return { platform: 'amazon_uk', country: 'UK', currency: 'GBP' };
      if (hostname.includes('.de')) return { platform: 'amazon_de', country: 'DE', currency: 'EUR' };
      if (hostname.includes('.fr')) return { platform: 'amazon_fr', country: 'FR', currency: 'EUR' };
      if (hostname.includes('.es')) return { platform: 'amazon_es', country: 'ES', currency: 'EUR' };
      if (hostname.includes('.it')) return { platform: 'amazon_it', country: 'IT', currency: 'EUR' };
      if (hostname.includes('.ca')) return { platform: 'amazon_ca', country: 'CA', currency: 'CAD' };
      if (hostname.includes('.jp')) return { platform: 'amazon_jp', country: 'JP', currency: 'JPY' };
      return { platform: 'amazon', country: 'US', currency: 'USD' };
    }

    if (hostname.includes('ebay')) {
      if (hostname.includes('.mx')) return { platform: 'ebay_mx', country: 'MX', currency: 'MXN' };
      if (hostname.includes('.co.uk')) return { platform: 'ebay_uk', country: 'UK', currency: 'GBP' };
      if (hostname.includes('.de')) return { platform: 'ebay_de', country: 'DE', currency: 'EUR' };
      return { platform: 'ebay', country: 'US', currency: 'USD' };
    }

    if (hostname.includes('shopee')) return { platform: 'shopee', country: 'APAC', currency: 'USD' };
    if (hostname.includes('lazada')) return { platform: 'lazada', country: 'APAC', currency: 'USD' };
    if (hostname.includes('aliexpress')) return { platform: 'aliexpress', country: 'CN', currency: 'USD' };
    if (hostname.includes('alibaba')) return { platform: 'alibaba', country: 'CN', currency: 'USD' };
    if (hostname.includes('etsy')) return { platform: 'etsy', country: 'US', currency: 'USD' };
    if (hostname.includes('walmart')) return { platform: 'walmart', country: 'US', currency: 'USD' };
    if (hostname.includes('target')) return { platform: 'target', country: 'US', currency: 'USD' };
    if (hostname.includes('bestbuy')) return { platform: 'bestbuy', country: 'US', currency: 'USD' };
    if (hostname.includes('opticsplanet')) return { platform: 'opticsplanet', country: 'US', currency: 'USD' };

    const metaGenerator = document.querySelector('meta[name="generator"]');
    if (metaGenerator) {
      const content = metaGenerator.content.toLowerCase();
      if (content.includes('shopify')) return { platform: 'shopify', country: 'US', currency: 'USD' };
      if (content.includes('woocommerce')) return { platform: 'woocommerce', country: 'US', currency: 'USD' };
      if (content.includes('magento')) return { platform: 'magento', country: 'US', currency: 'USD' };
      if (content.includes('bigcommerce')) return { platform: 'bigcommerce', country: 'US', currency: 'USD' };
    }

    return { platform: 'generic', country: 'US', currency: 'USD' };
  }
};

const ScraperEngine = {
  scrape() {
    const platform = PlatformDetector.detect();
    const data = this.initializeData(platform);

    const platformKey = platform.platform.split('_')[0];

    switch (platformKey) {
      case 'mercadolibre':
        this.scrapeMercadoLibre(data, platform);
        break;
      case 'amazon':
        this.scrapeAmazon(data, platform);
        break;
      case 'ebay':
        this.scrapeEbay(data, platform);
        break;
      case 'shopee':
        this.scrapeShopee(data);
        break;
      case 'lazada':
        this.scrapeLazada(data);
        break;
      case 'aliexpress':
        this.scrapeAliExpress(data);
        break;
      case 'etsy':
        this.scrapeEtsy(data);
        break;
      case 'walmart':
        this.scrapeWalmart(data);
        break;
      case 'shopify':
        this.scrapeShopify(data);
        break;
      case 'woocommerce':
        this.scrapeWooCommerce(data);
        break;
      case 'opticsplanet':
        this.scrapeOpticsPlanet(data);
        break;
      default:
        this.scrapeGeneric(data);
    }

    data.platform = platform.platform;
    data.timestamp = new Date().toISOString();
    data.domain = window.location.hostname;
    data.url = window.location.href;

    this.tryExtractFromStructuredData(data);

    return data;
  },

  initializeData(platform) {
    return {
      title: '',
      subtitle: '',
      price: '',
      original_price: '',
      currency: platform.currency,
      available_quantity: '',
      buying_mode: 'buy_it_now',
      condition: 'new',
      listing_type_id: 'gold_special',
      category_id: '',
      pictures: [],
      attributes: [],
      brand: '',
      model: '',
      mpn: '',
      color: '',
      size: '',
      gtin: '',
      warranty: '',
      free_shipping: false,
      shipping_cost: '',
      seller_custom_field: '',
      cost_price_usd: '',
      cost_price_mxn: '',
      description: '',
      variant_combinations: [],
      vendor: '',
      url: '',
      platform: '',
      timestamp: '',
      domain: '',
      sku: '',
      upc: ''
    };
  },

  getText(selectors) {
    if (typeof selectors === 'string') selectors = [selectors];
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim()) return el.textContent.trim();
      } catch (e) {}
    }
    return '';
  },

  getAttr(selectors, attr) {
    if (typeof selectors === 'string') selectors = [selectors];
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.getAttribute(attr)) return el.getAttribute(attr).trim();
      } catch (e) {}
    }
    return '';
  },

  getAllImages(selectors, max = 10) {
    const images = [];
    if (typeof selectors === 'string') selectors = [selectors];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (images.length >= max) return;
          const src = el.getAttribute('src') || el.getAttribute('data-src') || 
                     el.getAttribute('data-zoom') || el.getAttribute('data-image');
          if (src && !images.includes(src) && src.startsWith('http')) {
            images.push(src);
          }
        });
        if (images.length > 0) break;
      } catch (e) {}
    }

    return images;
  },

  scrapeMercadoLibre(data, platform) {
    data.title = this.getText([
      '[data-testid="product-title"]',
      'h1.ui-pdp-title',
      '.ui-pdp-title'
    ]);

    data.subtitle = this.getText([
      '[data-testid="product-subtitle"]',
      '.ui-pdp-subtitle',
      'div.ui-pdp-subtitle'
    ]);

    const priceWhole = this.getText([
      '[data-testid="price-fraction"]',
      '.andes-money-amount__fraction',
      '.price-tag-fraction'
    ]);

    const priceCents = this.getText([
      '[data-testid="price-cents"]',
      '.andes-money-amount__cents',
      '.price-tag-cents'
    ]);

    if (priceWhole) {
      data.price = priceCents ? `${priceWhole}.${priceCents}` : priceWhole;
      data.price = data.price.replace(/\./g, '').replace(/,/g, '.');
    }

    const originalPrice = this.getText([
      '.andes-money-amount--previous',
      '.price-tag-text-sr-only',
      '[data-testid="original-price"]'
    ]);
    if (originalPrice) {
      data.original_price = originalPrice.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(/,/g, '.');
    }

    const conditionText = this.getText([
      '.ui-pdp-subtitle',
      '[data-testid="condition"]',
      '.ui-pdp-condition'
    ]).toLowerCase();
    
    if (conditionText.includes('usado') || conditionText.includes('usado')) {
      data.condition = 'used';
    } else if (conditionText.includes('refurbished') || conditionText.includes('reacondicionado')) {
      data.condition = 'refurbished';
    } else if (conditionText.includes('nuevo') || conditionText.includes('new')) {
      data.condition = 'new';
    }

    const shippingText = this.getText([
      '.ui-pdp-shipping',
      '[data-testid="shipping"]',
      '.ui-pdp-media__body',
      '.ui-pdp-shipping-block'
    ]).toLowerCase();
    data.free_shipping = shippingText.includes('gratis') || shippingText.includes('grátis') || 
                         shippingText.includes('free') || shippingText.includes('envío gratis');

    data.pictures = this.getAllImages([
      '.ui-pdp-gallery__figure img',
      '.ui-pdp-image',
      'figure img',
      '.ui-pdp-gallery img'
    ], 10);

    const attributesElements = document.querySelectorAll(
      '.ui-pdp-specs__table tr, .andes-table__row, .ui-vpp-striped-specs__table tr'
    );
    
    attributesElements.forEach(row => {
      const labelEl = row.querySelector('.andes-table__header, th, .ui-pdp-specs__key');
      const valueEl = row.querySelector('.andes-table__column, td, .ui-pdp-specs__value');
      
      const label = labelEl?.textContent.trim().toLowerCase() || '';
      const value = valueEl?.textContent.trim() || '';

      if (label && value) {
        data.attributes.push({ id: label, value_name: value });

        if (label.includes('marca') || label.includes('brand')) data.brand = value;
        if (label.includes('modelo') || label.includes('model')) data.model = value;
        if (label.includes('mpn') || label.includes('número de parte') || label.includes('part number')) data.mpn = value;
        if (label.includes('color')) data.color = value;
        if (label.includes('tamaño') || label.includes('talla') || label.includes('size')) data.size = value;
        if (label.includes('gtin') || label.includes('ean') || label.includes('upc') || label.includes('isbn')) data.gtin = value;
        if (label.includes('garantía') || label.includes('garantia') || label.includes('warranty')) data.warranty = value;
        if (label.includes('sku')) data.sku = value;
      }
    });

    const breadcrumbs = document.querySelectorAll('.andes-breadcrumb__link, .ui-breadcrumb a');
    if (breadcrumbs.length > 0) {
      const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      data.category_id = lastBreadcrumb.textContent.trim();
    }

    data.description = this.getText([
      '.ui-pdp-description',
      '[data-testid="description"]',
      '.ui-pdp-description__content',
      '#description'
    ]);

    const quantityText = this.getText([
      '.ui-pdp-buybox__quantity__available',
      '[data-testid="quantity"]',
      '.ui-pdp-stock-information span'
    ]);
    if (quantityText) {
      const qtyMatch = quantityText.match(/\d+/);
      if (qtyMatch) data.available_quantity = qtyMatch[0];
    }

    data.vendor = 'MercadoLibre ' + platform.country;

    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent.includes('__NEXT_DATA__')) {
          const jsonMatch = script.textContent.match(/{.*}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData.props?.pageProps?.product) {
              const product = jsonData.props.pageProps.product;
              if (product.title && !data.title) data.title = product.title;
              if (product.price && !data.price) data.price = product.price;
              if (product.pictures && data.pictures.length === 0) {
                data.pictures = product.pictures.map(p => p.url || p.secure_url).slice(0, 10);
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('Could not parse __NEXT_DATA__:', e);
    }
  },

  scrapeAmazon(data, platform) {
    data.title = this.getText([
      '#productTitle',
      '#title',
      'h1#title span',
      '.product-title',
      '[data-feature-name="title"]',
      'span[id="productTitle"]'
    ]);

    const priceWhole = this.getText([
      '.a-price[data-a-color="price"] .a-price-whole',
      '.a-price-whole',
      '#corePrice_feature_div .a-price-whole',
      '.priceToPay .a-price-whole',
      '#priceblock_ourprice',
      '#priceblock_dealprice'
    ]);

    const priceFraction = this.getText([
      '.a-price[data-a-color="price"] .a-price-fraction',
      '.a-price-fraction',
      '#corePrice_feature_div .a-price-fraction',
      '.priceToPay .a-price-fraction'
    ]);

    if (priceWhole) {
      data.price = priceWhole.replace(/[^\d]/g, '');
      if (priceFraction) {
        data.price += '.' + priceFraction.replace(/[^\d]/g, '');
      }
    }

    if (!data.price) {
      const offscreenPrice = this.getText([
        '.a-price[data-a-color="price"] .a-offscreen',
        '.a-price .a-offscreen',
        '#corePrice_feature_div .a-offscreen'
      ]);
      if (offscreenPrice) {
        data.price = offscreenPrice.replace(/[^\d.]/g, '');
      }
    }

    const originalPriceText = this.getText([
      '.a-text-price',
      '.basisPrice .a-price .a-offscreen',
      '#priceblock_saleprice',
      '.a-price[data-a-strike="true"] .a-offscreen'
    ]);
    if (originalPriceText) {
      data.original_price = originalPriceText.replace(/[^\d.]/g, '');
    }

    data.brand = this.getText([
      '#bylineInfo',
      'a#bylineInfo',
      '#brand',
      '.po-brand .po-break-word',
      'tr.a-spacing-small:has(.a-span3:contains("Brand")) .a-span9',
      '[data-feature-name="bylineInfo"]'
    ]);

    if (data.brand && data.brand.toLowerCase().startsWith('visit')) {
      data.brand = data.brand.replace(/visit the |store/gi, '').trim();
    }

    data.pictures = this.getAllImages([
      '#landingImage',
      '#imgTagWrapperId img',
      '.a-dynamic-image',
      '#altImages img',
      '.imageThumbnail img'
    ], 10);

    const bullets = [];
    document.querySelectorAll('#feature-bullets-btf li span, #feature-bullets li span').forEach(el => {
      const text = el.textContent.trim();
      if (text) bullets.push(text);
    });
    data.description = bullets.join(' | ');

    if (!data.description) {
      data.description = this.getText([
        '#productDescription p',
        '#productDescription',
        '#aplus'
      ]);
    }

    const availText = this.getText([
      '#availability span',
      '#availability',
      '.a-declarative[data-action="show-all-offers-display"] span'
    ]).toLowerCase();

    if (availText.includes('in stock') || availText.includes('available')) {
      data.available_quantity = '999';
    } else if (availText.includes('only') && availText.includes('left')) {
      const qtyMatch = availText.match(/(\d+)\s*left/);
      if (qtyMatch) data.available_quantity = qtyMatch[1];
    }

    const shippingText = this.getText([
      '#mir-layout-DELIVERY_BLOCK',
      '.a-popover-trigger-wrapper',
      '#deliveryBlockMessage'
    ]).toLowerCase();
    data.free_shipping = shippingText.includes('free') || shippingText.includes('prime');

    const specs = document.querySelectorAll(
      '#productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li, #productOverview_feature_div tr, .a-keyvalue'
    );

    specs.forEach(spec => {
      const text = spec.textContent.toLowerCase();

      const labelEl = spec.querySelector('th, .a-span3, .a-color-secondary');
      const valueEl = spec.querySelector('td, .a-span9, .a-color-base');

      const label = labelEl?.textContent.toLowerCase().trim() || '';
      const value = valueEl?.textContent.trim() || '';

      if (label && value) {
        data.attributes.push({ id: label, value_name: value });

        if (label.includes('brand') && !data.brand) data.brand = value;
        if (label.includes('model') && !data.model) data.model = value;
        if (label.includes('part number') && !data.mpn) data.mpn = value;
        if (label.includes('color') && !data.color) data.color = value;
        if (label.includes('size') && !data.size) data.size = value;
        if (label.includes('item weight') && !data.size) data.size = value;
      }

      if (text.includes('asin') && !data.sku) {
        const asinMatch = text.match(/[A-Z0-9]{10}/);
        if (asinMatch) data.sku = asinMatch[0];
      }
      if (text.includes('model') && !data.model) {
        const modelMatch = text.match(/model.*?:\s*(.+?)(?:\||$)/i);
        if (modelMatch) data.model = modelMatch[1].trim();
      }
      if (text.includes('upc') && !data.upc) {
        data.upc = text.match(/\d{12}/)?.[0] || '';
      }
    });

    data.condition = this.getText([
      '#productSubtitle',
      '.a-size-small.offer-display-feature-text-message'
    ]).toLowerCase().includes('used') ? 'used' : 'new';

    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const jsonData = JSON.parse(script.textContent);
        if (jsonData['@type'] === 'Product') {
          if (!data.title && jsonData.name) data.title = jsonData.name;
          if (!data.description && jsonData.description) data.description = jsonData.description;
          if (!data.brand && jsonData.brand) {
            data.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
          }
          if (!data.sku && jsonData.sku) data.sku = jsonData.sku;
          if (!data.gtin && (jsonData.gtin || jsonData.gtin13 || jsonData.gtin14)) {
            data.gtin = jsonData.gtin || jsonData.gtin13 || jsonData.gtin14;
          }
          if (!data.mpn && jsonData.mpn) data.mpn = jsonData.mpn;

          if (jsonData.offers) {
            const offers = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
            if (!data.price && offers.price) {
              data.price = String(offers.price);
            }
            if (!data.currency && offers.priceCurrency) {
              data.currency = offers.priceCurrency;
            }
          }

          if (jsonData.image && data.pictures.length === 0) {
            const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
            data.pictures = images.slice(0, 10);
          }
        }
      }
    } catch (e) {
      console.log('Could not parse Amazon structured data:', e);
    }

    data.vendor = 'Amazon ' + platform.country;
  },

  scrapeEbay(data, platform) {
    data.title = this.getText([
      '.x-item-title__mainTitle',
      'h1.x-item-title__mainTitle',
      'h1.it-ttl',
      '.product-title',
      '[data-testid="x-item-title"]'
    ]);

    data.subtitle = this.getText([
      '.x-item-title__subTitle',
      '.ux-textspans--SECONDARY'
    ]);

    const priceText = this.getText([
      '.x-price-primary span',
      '.x-price-primary',
      '#prcIsum',
      '.x-price-approx',
      '[itemprop="price"]',
      '.ux-textspans--BOLD'
    ]);
    data.price = priceText.replace(/[^\d.,]/g, '').replace(/,/g, '');

    const originalPriceText = this.getText([
      '.x-price-section__strikethrough-price',
      '.ux-textspans--STRIKETHROUGH',
      '.strikethrough'
    ]);
    if (originalPriceText) {
      data.original_price = originalPriceText.replace(/[^\d.,]/g, '').replace(/,/g, '');
    }

    const conditionText = this.getText([
      '.x-item-condition-value',
      '.x-item-condition-text',
      '.vi-cond',
      '[data-testid="x-item-condition"]',
      '.ux-layout-section-evo__col:has(.ux-labels-values__labels:contains("Condition")) .ux-labels-values__values'
    ]).toLowerCase();

    if (conditionText.includes('new') || conditionText.includes('nuevo')) {
      data.condition = 'new';
    } else if (conditionText.includes('refurbished') || conditionText.includes('reacondicionado')) {
      data.condition = 'refurbished';
    } else if (conditionText.includes('used') || conditionText.includes('usado')) {
      data.condition = 'used';
    }

    const shippingText = this.getText([
      '.ux-labels-values--shipping',
      '.ux-shipping-cost',
      '[data-testid="x-shipping"]',
      '.sh-info__container'
    ]).toLowerCase();

    data.free_shipping = shippingText.includes('free') || shippingText.includes('gratis');

    if (!data.free_shipping && shippingText) {
      const costMatch = shippingText.match(/[\d.,]+/);
      if (costMatch) {
        data.shipping_cost = costMatch[0].replace(/,/g, '');
      }
    }

    data.pictures = this.getAllImages([
      '.ux-image-carousel-item img',
      '.ux-image-filmstrip-carousel-item img',
      '#icImg',
      '.ux-image-magnify__image',
      '.img img',
      '[data-zoom-src]'
    ], 10);

    if (data.pictures.length === 0) {
      const mainImage = this.getAttr([
        '#icImg',
        '.ux-image-magnify__image'
      ], 'src');
      if (mainImage) data.pictures.push(mainImage);
    }

    data.description = this.getText([
      '.x-item-description',
      '#desc_div',
      '.product-description',
      '.ux-layout-section--description',
      '[data-testid="x-item-description"]'
    ]);

    if (!data.description) {
      data.description = data.title;
    }

    const quantityText = this.getText([
      '.x-quantity__availability',
      '.qtyTxt',
      '[data-testid="x-quantity"]'
    ]);
    if (quantityText) {
      const qtyMatch = quantityText.match(/(\d+)\s*(available|disponible)/i);
      if (qtyMatch) {
        data.available_quantity = qtyMatch[1];
      }
    }

    const specs = document.querySelectorAll('.ux-layout-section__row, .ux-labels-values');
    specs.forEach(row => {
      const labelEl = row.querySelector('.ux-labels-values__labels, .attrLabels');
      const valueEl = row.querySelector('.ux-labels-values__values, .attrValue');

      const label = labelEl?.textContent.toLowerCase().trim() || '';
      const value = valueEl?.textContent.trim() || '';

      if (label && value) {
        data.attributes.push({ id: label, value_name: value });

        if ((label.includes('brand') || label.includes('marca')) && !data.brand) data.brand = value;
        if ((label.includes('model') || label.includes('modelo')) && !data.model) data.model = value;
        if (label.includes('mpn') && !data.mpn) data.mpn = value;
        if ((label.includes('upc') || label.includes('ean')) && !data.upc) data.upc = value;
        if ((label.includes('color') || label.includes('colour')) && !data.color) data.color = value;
        if ((label.includes('size') || label.includes('tamaño')) && !data.size) data.size = value;
        if ((label.includes('gtin') || label.includes('isbn')) && !data.gtin) data.gtin = value;
        if ((label.includes('warranty') || label.includes('garantía')) && !data.warranty) data.warranty = value;
      }
    });

    const categoryBreadcrumbs = document.querySelectorAll('.breadcrumbs a, .seo-breadcrumbs-container a');
    if (categoryBreadcrumbs.length > 0) {
      const lastCategory = categoryBreadcrumbs[categoryBreadcrumbs.length - 1];
      data.category_id = lastCategory.textContent.trim();
    }

    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const jsonData = JSON.parse(script.textContent);
        if (jsonData['@type'] === 'Product') {
          if (!data.title && jsonData.name) data.title = jsonData.name;
          if (!data.description && jsonData.description) data.description = jsonData.description;
          if (!data.brand && jsonData.brand) data.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
          if (!data.sku && jsonData.sku) data.sku = jsonData.sku;
          if (!data.gtin && (jsonData.gtin || jsonData.gtin13 || jsonData.gtin14)) {
            data.gtin = jsonData.gtin || jsonData.gtin13 || jsonData.gtin14;
          }
          if (!data.mpn && jsonData.mpn) data.mpn = jsonData.mpn;

          if (jsonData.offers) {
            const offers = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
            if (!data.price && offers.price) {
              data.price = String(offers.price);
            }
            if (!data.currency && offers.priceCurrency) {
              data.currency = offers.priceCurrency;
            }
            if (offers.availability && !data.available_quantity) {
              if (offers.availability.includes('InStock')) {
                data.available_quantity = '999';
              }
            }
          }

          if (jsonData.image && data.pictures.length === 0) {
            const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
            data.pictures = images.slice(0, 10);
          }
        }
      }
    } catch (e) {
      console.log('Could not parse eBay structured data:', e);
    }

    data.vendor = 'eBay ' + platform.country;
  },

  scrapeShopee(data) {
    data.title = this.getText([
      '.qaNIZj',
      '._3a6LH_',
      '.product-title'
    ]);

    data.price = this.getText([
      '.YbrgWT',
      '._3e_UQT',
      '.product-price'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '._3W2xW1 img',
      '.product-image img'
    ], 10);

    data.description = this.getText([
      '._2u0jt9',
      '.product-description'
    ]);

    data.vendor = 'Shopee';
  },

  scrapeLazada(data) {
    data.title = this.getText([
      '.pdp-product-title',
      '.pdp-mod-product-badge-title'
    ]);

    data.price = this.getText([
      '.pdp-price',
      '.pdp-price_color_orange'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.item-gallery__thumbnail-image',
      '.pdp-gallery img'
    ], 10);

    data.vendor = 'Lazada';
  },

  scrapeAliExpress(data) {
    data.title = this.getText([
      '.product-title-text',
      'h1.product-name'
    ]);

    data.price = this.getText([
      '.product-price-value',
      '.product-price-current'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.images-view-item img',
      '.magnifier-image'
    ], 10);

    data.vendor = 'AliExpress';
  },

  scrapeEtsy(data) {
    data.title = this.getText([
      'h1[data-buy-box-listing-title]',
      '.wt-text-body-01'
    ]);

    data.price = this.getText([
      '.wt-text-title-03',
      '[data-buy-box-region="price"]'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.wt-max-width-full',
      '[data-palette-carousel-image]'
    ], 10);

    data.description = this.getText([
      '[data-product-details-description-text-content]'
    ]);

    data.vendor = 'Etsy';
  },

  scrapeWalmart(data) {
    data.title = this.getText([
      'h1[itemprop="name"]',
      '#main-title'
    ]);

    data.price = this.getText([
      '[itemprop="price"]',
      '.price-characteristic'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.hover-zoom-hero-image',
      '[data-testid="product-image"]'
    ], 10);

    data.vendor = 'Walmart';
  },

  scrapeShopify(data) {
    data.title = this.getText([
      '.product-single__title',
      '.product__title',
      'h1.product-title',
      '[itemProp="name"]'
    ]);

    data.price = this.getText([
      '.product__price',
      '.product-single__price',
      '[data-product-price]',
      '.price'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.product__media img',
      '.product-single__photo img'
    ], 10);

    try {
      const productJson = document.querySelector('script[type="application/ld+json"]');
      if (productJson) {
        const productData = JSON.parse(productJson.textContent);
        if (productData['@type'] === 'Product') {
          if (!data.title) data.title = productData.name;
          if (!data.price) data.price = productData.offers?.price;
          if (!data.brand) data.brand = productData.brand?.name;
          if (data.pictures.length === 0 && productData.image) {
            data.pictures = Array.isArray(productData.image) ? productData.image : [productData.image];
          }
        }
      }
    } catch (e) {}

    data.vendor = 'Shopify Store';
  },

  scrapeWooCommerce(data) {
    data.title = this.getText([
      '.product_title',
      'h1.entry-title'
    ]);

    data.price = this.getText([
      '.price ins .amount',
      '.price .amount',
      'p.price'
    ]).replace(/[^\d.]/g, '');

    data.pictures = this.getAllImages([
      '.woocommerce-product-gallery__image img',
      '.wp-post-image'
    ], 10);

    data.description = this.getText([
      '.woocommerce-product-details__short-description',
      '#tab-description'
    ]);

    data.vendor = 'WooCommerce Store';
  },

  scrapeOpticsPlanet(data) {
    data.title = this.getText([
      'h1[itemprop="name"]',
      'h1.product-name',
      '.product-title h1',
      '.page-title'
    ]);

    const priceText = this.getText([
      '.sale-price',
      '.your-price',
      '[itemprop="price"]',
      '.price-sales'
    ]);
    if (priceText) {
      data.price = priceText.replace(/[^\d.]/g, '');
    }

    const originalPriceText = this.getText([
      '.list-price',
      '.price-standard',
      '.was-price'
    ]);
    if (originalPriceText) {
      data.original_price = originalPriceText.replace(/[^\d.]/g, '');
    }

    data.pictures = this.getAllImages([
      '.product-primary-image img',
      '#mainImage',
      '.product-image img',
      '.gallery-item img'
    ], 10);

    data.description = this.getText([
      '.product-description',
      '[itemprop="description"]',
      '.product-details'
    ]);

    data.brand = this.getText([
      '[itemprop="brand"]',
      '.product-brand',
      '.brand-name'
    ]);

    const specs = document.querySelectorAll('.product-specs tr, .specifications tr, .product-attributes li, .specs-list li');
    specs.forEach(spec => {
      const text = spec.textContent.toLowerCase();

      const labelEl = spec.querySelector('th, .spec-label, dt, strong');
      const valueEl = spec.querySelector('td, .spec-value, dd, span');

      const label = labelEl?.textContent.toLowerCase().trim() || '';
      const value = valueEl?.textContent.trim() || spec.textContent.trim();

      if (label && value && label !== value) {
        data.attributes.push({ id: label, value_name: value });

        if (label.includes('upc') && !data.upc) {
          const upcMatch = value.match(/\d{12}/);
          if (upcMatch) data.upc = upcMatch[0];
        }
        if (label.includes('ean') && !data.gtin) {
          const eanMatch = value.match(/\d{13}/);
          if (eanMatch) data.gtin = eanMatch[0];
        }
        if (label.includes('gtin') && !data.gtin) {
          const gtinMatch = value.match(/\d{12,14}/);
          if (gtinMatch) data.gtin = gtinMatch[0];
        }
        if ((label.includes('barcode') || label.includes('product code')) && !data.upc && !data.gtin) {
          const barcodeMatch = value.match(/\d{12,14}/);
          if (barcodeMatch) {
            if (barcodeMatch[0].length === 12) {
              data.upc = barcodeMatch[0];
            } else {
              data.gtin = barcodeMatch[0];
            }
          }
        }
        if (label.includes('brand') && !data.brand) data.brand = value;
        if (label.includes('model') && !data.model) data.model = value;
        if ((label.includes('mpn') || label.includes('part number')) && !data.mpn) data.mpn = value;
        if (label.includes('manufacturer') && !data.brand) data.brand = value;
        if (label.includes('sku') && !data.sku) data.sku = value;
        if (label.includes('color') && !data.color) data.color = value;
        if (label.includes('size') && !data.size) data.size = value;
        if (label.includes('weight') && !data.size) data.size = value;
      }
    });

    const availText = this.getText([
      '.product-availability',
      '.stock-status',
      '[itemprop="availability"]'
    ]).toLowerCase();

    if (availText.includes('in stock') || availText.includes('available')) {
      data.available_quantity = '999';
    } else if (availText.includes('out of stock')) {
      data.available_quantity = '0';
    }

    const shippingText = this.getText([
      '.shipping-message',
      '.free-shipping',
      '.delivery-info'
    ]).toLowerCase();
    data.free_shipping = shippingText.includes('free shipping');

    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const jsonData = JSON.parse(script.textContent);
        if (jsonData['@type'] === 'Product') {
          if (!data.title && jsonData.name) data.title = jsonData.name;
          if (!data.description && jsonData.description) data.description = jsonData.description;
          if (!data.brand && jsonData.brand) {
            data.brand = typeof jsonData.brand === 'string' ? jsonData.brand : jsonData.brand.name;
          }
          if (!data.sku && jsonData.sku) data.sku = jsonData.sku;
          if (!data.gtin && (jsonData.gtin || jsonData.gtin12 || jsonData.gtin13 || jsonData.gtin14)) {
            data.gtin = jsonData.gtin || jsonData.gtin12 || jsonData.gtin13 || jsonData.gtin14;
          }
          if (!data.mpn && jsonData.mpn) data.mpn = jsonData.mpn;

          if (jsonData.offers) {
            const offers = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
            if (!data.price && offers.price) {
              data.price = String(offers.price);
            }
            if (!data.currency && offers.priceCurrency) {
              data.currency = offers.priceCurrency;
            }
            if (offers.availability && !data.available_quantity) {
              if (offers.availability.includes('InStock')) {
                data.available_quantity = '999';
              }
            }
          }

          if (jsonData.image && data.pictures.length === 0) {
            const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
            data.pictures = images.slice(0, 10);
          }
        }
      }
    } catch (e) {
      console.log('Could not parse OpticsPlanet structured data:', e);
    }

    data.vendor = 'OpticsPlanet';
  },

  scrapeGeneric(data) {
    const metaTags = {
      title: ['og:title', 'twitter:title'],
      description: ['og:description', 'twitter:description', 'description'],
      image: ['og:image', 'twitter:image'],
      price: ['og:price:amount', 'product:price:amount'],
      currency: ['og:price:currency', 'product:price:currency'],
      brand: ['og:brand', 'product:brand']
    };

    for (const [key, names] of Object.entries(metaTags)) {
      for (const name of names) {
        const content = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
        if (content) {
          if (key === 'title' && !data.title) data.title = content;
          if (key === 'description' && !data.description) data.description = content;
          if (key === 'image' && data.pictures.length === 0) data.pictures.push(content);
          if (key === 'price' && !data.price) data.price = content;
          if (key === 'currency' && !data.currency) data.currency = content;
          if (key === 'brand' && !data.brand) data.brand = content;
          break;
        }
      }
    }

    if (!data.title) {
      data.title = this.getText([
        'h1[itemprop="name"]',
        'h1.product-title',
        'h1.product-name',
        '.product-title h1',
        'h1'
      ]) || document.title;
    }

    if (!data.price) {
      const priceText = this.getText([
        '[itemprop="price"]',
        '.price',
        '.product-price',
        '.current-price',
        '[data-price]'
      ]);
      data.price = priceText.replace(/[^\d.]/g, '');
    }

    if (data.pictures.length === 0) {
      data.pictures = this.getAllImages([
        '[itemprop="image"]',
        '.product-image img',
        '.main-image img',
        'img.primary'
      ], 10);
    }

    if (!data.brand) {
      data.brand = this.getText([
        '[itemprop="brand"]',
        '.brand',
        '.product-brand',
        '[data-brand]'
      ]);
    }

    if (!data.sku) {
      data.sku = this.getText([
        '[itemprop="sku"]',
        '.sku',
        '.product-sku',
        '[data-sku]'
      ]);
    }

    const specs = document.querySelectorAll('.specs tr, .specifications tr, .product-specs tr, .product-attributes tr, .product-details tr, [class*="spec"] tr, [class*="attribute"] tr');
    specs.forEach(spec => {
      const text = spec.textContent.toLowerCase();

      const labelEl = spec.querySelector('th, .label, dt, strong, .spec-label');
      const valueEl = spec.querySelector('td, .value, dd, .spec-value');

      const label = labelEl?.textContent.toLowerCase().trim() || '';
      const value = valueEl?.textContent.trim() || '';

      if (label && value) {
        data.attributes.push({ id: label, value_name: value });

        if (label.includes('upc') && !data.upc) {
          const upcMatch = value.match(/\d{12}/);
          if (upcMatch) data.upc = upcMatch[0];
        }
        if (label.includes('ean') && !data.gtin) {
          const eanMatch = value.match(/\d{13}/);
          if (eanMatch) data.gtin = eanMatch[0];
        }
        if (label.includes('gtin') && !data.gtin) {
          const gtinMatch = value.match(/\d{12,14}/);
          if (gtinMatch) data.gtin = gtinMatch[0];
        }
        if ((label.includes('barcode') || label.includes('product code')) && !data.upc && !data.gtin) {
          const barcodeMatch = value.match(/\d{12,14}/);
          if (barcodeMatch) {
            if (barcodeMatch[0].length === 12) {
              data.upc = barcodeMatch[0];
            } else {
              data.gtin = barcodeMatch[0];
            }
          }
        }
        if (label.includes('brand') && !data.brand) data.brand = value;
        if (label.includes('model') && !data.model) data.model = value;
        if ((label.includes('mpn') || label.includes('part number')) && !data.mpn) data.mpn = value;
        if (label.includes('sku') && !data.sku) data.sku = value;
        if (label.includes('color') && !data.color) data.color = value;
        if (label.includes('size') && !data.size) data.size = value;
      }
    });

    if (!data.upc) {
      data.upc = this.getText([
        '[itemprop="upc"]',
        '.upc',
        '[data-upc]'
      ]);
    }

    if (!data.gtin) {
      data.gtin = this.getText([
        '[itemprop="gtin"]',
        '[itemprop="gtin13"]',
        '[itemprop="gtin14"]',
        '.gtin',
        '[data-gtin]'
      ]);
    }

    data.vendor = window.location.hostname.replace('www.', '');
  },

  tryExtractFromStructuredData(data) {
    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        const jsonData = JSON.parse(script.textContent);
        if (jsonData['@type'] === 'Product') {
          if (!data.title) data.title = jsonData.name;
          if (!data.description) data.description = jsonData.description;
          if (!data.brand) data.brand = jsonData.brand?.name || jsonData.brand;
          if (!data.sku) data.sku = jsonData.sku;
          if (!data.gtin) {
            data.gtin = jsonData.gtin || jsonData.gtin12 || jsonData.gtin13 || jsonData.gtin14 || jsonData.gtin8;
          }
          if (!data.upc && jsonData.gtin12) {
            data.upc = jsonData.gtin12;
          }
          if (!data.mpn) data.mpn = jsonData.mpn;

          if (jsonData.offers) {
            const offers = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
            if (!data.price) data.price = String(offers.price);
            if (!data.currency) data.currency = offers.priceCurrency;
            if (!data.available_quantity) {
              data.available_quantity = offers.availability?.includes('InStock') ? '999' : '0';
            }
          }

          if (jsonData.image && data.pictures.length === 0) {
            data.pictures = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
          }
        }
      }
    } catch (e) {
      console.log('Could not parse structured data:', e);
    }
  }
};
