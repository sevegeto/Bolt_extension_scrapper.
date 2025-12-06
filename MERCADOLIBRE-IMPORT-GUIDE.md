# MercadoLibre Import Guide

## Overview
This guide explains how to import your scraped products into MercadoLibre using either their bulk upload tool or API integration.

## CSV Export Options

The app now provides **two CSV export formats**:

### 1. Full Export
Contains all scraped data:
- Title, Brand, Price, Currency
- Description
- Images (pipe-separated URLs)
- Features (pipe-separated list)
- Specifications (JSON format)
- Availability, Rating, Reviews
- Domain, Source URL, Scraped date

**Use for:** Data backup, analysis, or custom processing

### 2. MercadoLibre Format
Optimized structure for marketplace listings:
- Title
- Price, Currency
- Condition (defaults to "new")
- Available_Quantity (defaults to 1)
- Description
- Brand
- Image_1 through Image_5 (separate columns)
- Features (semicolon-separated)
- Source_URL

**Use for:** Preparing data for MercadoLibre import

---

## Method 1: MercadoLibre Bulk Upload (Recommended for beginners)

### Steps:
1. **Export your products** using "MercadoLibre Format" from the dashboard

2. **Log into MercadoLibre Seller Account**
   - Go to: https://www.mercadolibre.com (or your country's site)
   - Navigate to "My Sales" > "Publish" > "Bulk Upload"

3. **Download MercadoLibre's Official Template**
   - MercadoLibre provides Excel/CSV templates for bulk uploads
   - Templates vary by country and category

4. **Map your data to their template**
   - Open both your exported CSV and their template
   - Copy/paste data into their required columns
   - **Important fields to add manually:**
     - `Category ID` - Must select from MercadoLibre's category tree
     - `Listing Type` - gold_special, gold_pro, free, etc.
     - `Shipping` - Shipping options for each product
     - `Warranty` - If applicable

5. **Upload the completed template**
   - Follow MercadoLibre's upload wizard
   - Review validation errors if any
   - Submit for processing

### Important Notes:
- **Category ID is mandatory** - You'll need to select appropriate categories from MercadoLibre's catalog
- Images must be publicly accessible URLs (the scraped URLs should work)
- Price and currency must match your seller account settings
- Review MercadoLibre's [official bulk upload guide](https://global-selling.mercadolibre.com/learning-center/news/learn-to-complete-your-excel-file-to-list-in-bulk)

---

## Method 2: MercadoLibre API Integration (Advanced)

### Overview
MercadoLibre's API works with JSON, not CSV. You'll need to build a custom integration.

### Required API Fields:

```javascript
{
  "title": "Product Title (max length varies by category)",
  "category_id": "MLB1234", // REQUIRED - from ML category tree
  "price": 99.99,
  "currency_id": "USD", // or ARS, BRL, MXN, etc.
  "available_quantity": 1,
  "buying_mode": "buy_it_now",
  "listing_type_id": "gold_special", // or gold_pro, free
  "condition": "new", // or used, not_specified
  "pictures": [
    { "source": "https://example.com/image1.jpg" },
    { "source": "https://example.com/image2.jpg" }
  ],
  "attributes": [ // Varies by category
    {
      "id": "BRAND",
      "value_name": "Nike"
    }
  ]
}
```

### API Integration Process:

1. **Get API Credentials**
   - Register your app at: https://developers.mercadolibre.com
   - Get your Client ID and Secret Key
   - Implement OAuth 2.0 authentication

2. **Get Category IDs**
   - API Endpoint: `GET /sites/{SITE_ID}/categories`
   - Browse the category tree to find appropriate categories
   - Note: Each product must have a valid category_id

3. **Get Required Attributes by Category**
   - API Endpoint: `GET /categories/{CATEGORY_ID}/attributes`
   - Each category has different required attributes (brand, model, size, etc.)

4. **Create Listings**
   - API Endpoint: `POST /items`
   - Send product data as JSON
   - Handle validation errors and retry logic

5. **Add Descriptions**
   - API Endpoint: `POST /items/{ITEM_ID}/description`
   - Descriptions must be added AFTER creating the item

### Sample API Integration Code (JavaScript/Node.js):

```javascript
// Example: Creating a listing via API
async function createListing(productData, accessToken) {
  const response = await fetch('https://api.mercadolibre.com/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: productData.title,
      category_id: 'MLB1234', // Must determine this per product
      price: parseFloat(productData.price),
      currency_id: productData.currency || 'USD',
      available_quantity: 1,
      buying_mode: 'buy_it_now',
      listing_type_id: 'gold_special',
      condition: 'new',
      pictures: productData.images.map(url => ({ source: url })),
      attributes: [
        {
          id: 'BRAND',
          value_name: productData.brand
        }
      ]
    })
  });

  const item = await response.json();

  // Add description
  if (productData.description) {
    await fetch(`https://api.mercadolibre.com/items/${item.id}/description`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plain_text: productData.description
      })
    });
  }

  return item;
}
```

---

## Challenges & Limitations

### 1. Category Mapping
- **Challenge:** MercadoLibre requires a specific category_id for each product
- **Solution:** You'll need to manually map or build a category detection system based on product titles/attributes

### 2. Image Hosting
- **Challenge:** Images must be publicly accessible URLs
- **Solution:** The scraped image URLs should work, but if they're restricted, you may need to:
  - Re-host images on your own CDN
  - Use MercadoLibre's image upload API

### 3. Attribute Requirements
- **Challenge:** Each category has different required attributes
- **Solution:** Query the attributes API for each category and ensure your products have the required fields

### 4. Price Conversion
- **Challenge:** Currency conversion if listing in different countries
- **Solution:** Use a currency API to convert prices appropriately

### 5. Product Variations
- **Challenge:** Products with sizes/colors need variation handling
- **Solution:** Use MercadoLibre's variation API to create product families

---

## Recommended Workflow

### For Bulk CSV Upload:
1. Export products using "MercadoLibre Format"
2. Download MercadoLibre's official Excel template
3. Open both files side-by-side
4. Copy data from export to template
5. Fill in required fields (Category, Listing Type, etc.)
6. Upload through MercadoLibre's interface

### For API Integration:
1. Build a Node.js/Python script
2. Read your CSV export
3. For each product:
   - Determine appropriate category_id
   - Format as JSON per API requirements
   - POST to create listing
   - POST to add description
4. Log successes and errors
5. Retry failed items

---

## Additional Resources

- [MercadoLibre Developers Portal](https://developers.mercadolibre.com.ar/en_us/list-products)
- [Bulk Upload Learning Center](https://global-selling.mercadolibre.com/learning-center/news/learn-to-complete-your-excel-file-to-list-in-bulk)
- [API Documentation](https://developers.mercadolibre.com.ar/en_us/items-and-searches)
- [Category API](https://api.mercadolibre.com/sites/MLB/categories)

---

## Need Help?

The CSV export now includes all available data. However, MercadoLibre requires some fields that aren't available from scraping:
- Category IDs (must be selected from their catalog)
- Listing types (gold_special, gold_pro, etc.)
- Shipping options
- Warranty information

These will need to be added manually or through custom business logic in your import process.
