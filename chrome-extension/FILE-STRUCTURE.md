# File Structure

## Core Extension Files

### `manifest.json`
- Extension configuration file (Manifest V3)
- Defines permissions, content scripts, and background worker
- Specifies extension name, version, and icons

### `popup.html`
- User interface displayed when extension icon is clicked
- Beautiful gradient design with preview functionality
- Shows status messages and scraped data

### `popup.js`
- Handles user interactions in the popup
- Coordinates scraping and data submission
- Manages preview display and error handling

### `content.js`
- Runs on all web pages
- Contains the core scraping logic
- Extracts product data using multiple selector strategies

### `background.js`
- Service worker for background tasks
- Handles notifications and messaging
- Runs persistently in the background

### `config.js`
- Configuration file for easy customization
- Contains Google Apps Script URL
- Settings for sheet name, currency, timeout

## Google Integration

### `google-apps-script.js`
- Server-side code that runs in Google Apps Script
- Receives product data via POST requests
- Creates and updates Google Sheets
- Handles data formatting and storage

## Documentation

### `README.md`
- Comprehensive documentation (4000+ words)
- Installation instructions
- Usage guide
- Troubleshooting tips
- Feature overview

### `SETUP-GUIDE.md`
- Quick 5-minute setup instructions
- Simplified step-by-step guide
- Essential information only

### `INSTALLATION-CHECKLIST.md`
- Interactive checklist format
- Step-by-step verification
- Testing procedures
- Troubleshooting section

### `CUSTOMIZATION-GUIDE.md`
- Advanced customization instructions
- Site-specific scraping examples
- Adding new fields
- Performance optimization tips

### `FILE-STRUCTURE.md`
- This file
- Overview of all files and their purposes

## Testing

### `test-product-page.html`
- Sample product page for testing
- Includes all common product metadata
- Fully styled and responsive
- Contains realistic product data

## Icons Folder

### `icons/README.txt`
- Instructions for creating icon files
- Required sizes and formats
- Suggestions for icon sources

### Required Files (to be created):
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## File Organization

```
chrome-extension/
├── manifest.json                    # Extension configuration
├── config.js                        # User configuration
├── popup.html                       # Extension UI
├── popup.js                         # UI logic
├── content.js                       # Scraping logic
├── background.js                    # Background worker
├── google-apps-script.js           # Google Sheets integration
├── test-product-page.html          # Testing page
├── README.md                        # Main documentation
├── SETUP-GUIDE.md                  # Quick setup
├── INSTALLATION-CHECKLIST.md       # Installation steps
├── CUSTOMIZATION-GUIDE.md          # Advanced customization
├── FILE-STRUCTURE.md               # This file
└── icons/
    ├── README.txt                   # Icon instructions
    ├── icon16.png                   # (to be created)
    ├── icon48.png                   # (to be created)
    └── icon128.png                  # (to be created)
```

## File Sizes

| File | Approximate Size | Purpose |
|------|-----------------|---------|
| manifest.json | 0.5 KB | Configuration |
| config.js | 0.3 KB | Settings |
| popup.html | 5 KB | UI Structure |
| popup.js | 8 KB | UI Logic |
| content.js | 6 KB | Scraping |
| background.js | 0.5 KB | Background tasks |
| google-apps-script.js | 2 KB | Google integration |
| README.md | 15 KB | Documentation |
| SETUP-GUIDE.md | 2 KB | Quick guide |
| INSTALLATION-CHECKLIST.md | 5 KB | Checklist |
| CUSTOMIZATION-GUIDE.md | 10 KB | Advanced guide |
| test-product-page.html | 6 KB | Test page |

**Total:** ~60 KB (excluding icons)

## Key Features by File

### Data Scraping (content.js, popup.js)
- Meta tag extraction (Open Graph, Twitter Cards)
- Schema.org microdata parsing
- CSS selector-based extraction
- Multi-selector fallback strategy
- Specification table parsing
- Dynamic content detection

### User Interface (popup.html, popup.js)
- Gradient purple design
- Preview before sending
- Real-time status updates
- Error notifications
- Loading indicators
- Configuration warnings

### Google Integration (google-apps-script.js)
- Automatic sheet creation
- Header formatting
- Row appending
- Error handling
- JSON parsing
- Status tracking

### Configuration (config.js)
- Easy URL setup
- Customizable timeouts
- Sheet name settings
- Currency defaults

## Dependencies

### External Dependencies: NONE
The extension uses only:
- Native Chrome Extension APIs
- Vanilla JavaScript
- Native CSS
- Google Apps Script (separate environment)

### Chrome APIs Used:
- `chrome.tabs` - Get active tab
- `chrome.scripting` - Execute content scripts
- `chrome.notifications` - Show notifications
- `chrome.storage` - (Optional, not currently used)

## Browser Compatibility

| Browser | Compatible | Notes |
|---------|-----------|-------|
| Chrome | ✅ Yes | Fully tested |
| Edge | ✅ Yes | Chromium-based |
| Brave | ✅ Yes | Chromium-based |
| Opera | ✅ Yes | Chromium-based |
| Firefox | ❌ No | Different manifest format |
| Safari | ❌ No | Different extension system |

## Security Features

- No external API calls except to user's own Google Apps Script
- No data storage in extension
- No tracking or analytics
- All data goes directly to user's Google Sheet
- Open source and auditable

## Modification Points

To customize the extension, focus on these files:

1. **Change scraping logic** → `content.js` and `popup.js`
2. **Modify UI appearance** → `popup.html` (styles section)
3. **Add new features** → `popup.js` (add buttons/handlers)
4. **Change configuration** → `config.js`
5. **Modify Google Sheets format** → `google-apps-script.js`

## Version History

**v1.0.0** - Initial Release
- Core scraping functionality
- Google Sheets integration
- Preview feature
- Comprehensive documentation
- Test page included

---

For setup instructions, see `SETUP-GUIDE.md` or `INSTALLATION-CHECKLIST.md`.
