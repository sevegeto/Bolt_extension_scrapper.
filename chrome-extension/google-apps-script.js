function doPost(e) {
  try {
    const sheetName = 'Products';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);

      const headers = [
        'Timestamp',
        'Title',
        'Subtitle',
        'Price',
        'Original Price',
        'Currency',
        'Brand',
        'Model',
        'MPN',
        'SKU',
        'UPC',
        'GTIN',
        'Color',
        'Size',
        'Condition',
        'Warranty',
        'Free Shipping',
        'Shipping Cost',
        'Available Qty',
        'Buying Mode',
        'Listing Type',
        'Category',
        'Cost USD',
        'Cost MXN',
        'Vendor',
        'Platform',
        'Product URL',
        'Images (JSON)',
        'Attributes (JSON)',
        'Description',
        'Domain',
        'Status'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const data = JSON.parse(e.postData.contents);

    const row = [
      data.timestamp || new Date().toISOString(),
      data.title || '',
      data.subtitle || '',
      data.price || '',
      data.original_price || '',
      data.currency || 'USD',
      data.brand || '',
      data.model || '',
      data.mpn || '',
      data.sku || data.seller_custom_field || '',
      data.upc || '',
      data.gtin || '',
      data.color || '',
      data.size || '',
      data.condition || 'new',
      data.warranty || '',
      data.free_shipping ? 'YES' : 'NO',
      data.shipping_cost || '',
      data.available_quantity || '',
      data.buying_mode || 'buy_it_now',
      data.listing_type_id || 'gold_special',
      data.category_id || '',
      data.cost_price_usd || '',
      data.cost_price_mxn || '',
      data.vendor || '',
      data.platform || 'generic',
      data.url || '',
      (data.pictures && data.pictures.length) ? JSON.stringify(data.pictures) : (data.imageUrl ? JSON.stringify([data.imageUrl]) : '[]'),
      data.attributes ? JSON.stringify(data.attributes) : '[]',
      data.description ? data.description.substring(0, 500) : '',
      data.domain || '',
      'Pending'
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'message': 'Product data added successfully',
      'row': sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error: ' + error.toString());

    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    'result': 'success',
    'message': 'Web App is running. Use POST requests to add data.'
  })).setMimeType(ContentService.MimeType.JSON);
}

function testPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        title: 'Test Product',
        description: 'This is a test product',
        price: '99.99',
        currency: 'USD',
        brand: 'Test Brand',
        model: 'TB-001',
        mpn: 'MPN12345',
        sku: 'SKU12345',
        upc: '123456789012',
        gtin: '1234567890123',
        color: 'Blue',
        size: 'Medium',
        cost: '50.00',
        taxes: '5.00',
        shipping: '10.00',
        vendor: 'example.com',
        url: 'https://example.com/product',
        imageUrl: 'https://example.com/image.jpg',
        domain: 'example.com',
        timestamp: new Date().toISOString()
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
