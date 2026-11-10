# Apify Integration Setup (Optional)

## Important: Apify is Optional

The URL scraper works **without Apify** using a basic scraper that handles most e-commerce sites. Apify is only needed for:
- Sites with heavy JavaScript rendering
- Pages with strong anti-bot protection
- Complex dynamic content

**The scraper automatically uses fallback mode if Apify is not configured**, so you can use it right away without any setup.

## Why Use Apify? (Optional Enhancement)

Adding Apify API provides enhanced scraping capabilities:

- **JavaScript Rendering**: Uses the Apify Web Scraper actor in a real browser
- **Protected pages**: Used only when a direct fetch does not find a title or price
- **No token in the scraper URL**: the server sends the token as an Authorization header

## Setup Instructions

### 1. Get Your Apify API Token

1. Go to [apify.com](https://apify.com) and create a free account
2. Navigate to **Settings** > **Integrations**
3. Copy your **API Token**

### 2. Add Token to Supabase

You need to add the Apify token as an environment variable to your Supabase Edge Functions:

#### Option A: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** > **Edge Functions**
4. Click **Add Variable**
5. Add:
   - **Name**: `APIFY_API_TOKEN`
   - **Value**: Your Apify API token
6. Save

#### Option B: Using Supabase CLI

```bash
supabase secrets set APIFY_API_TOKEN=your_token_here
```

### 3. Test the Scraper

1. Open your dashboard
2. Go to **URL Scraper** tab
3. Try scraping a product URL
4. The scraper will automatically use Apify if configured

## How It Works

Each URL is handled in this order:

1. Fetch the page directly and read JSON-LD, Open Graph tags, and visible price markup.
2. If that finds a title or a price, save it. Apify is not called.
3. If the fetch is blocked or the page has no product data, and `APIFY_API_TOKEN` is set, run Apify's `apify/web-scraper` once and read the rendered HTML.
4. If neither method finds a title or a price, the URL is reported as failed.

Amazon and Mercado Libre are still more reliable from the Chrome extension, which reads the page you already have open.

## Apify Free Tier

Apify offers a generous free tier:
- 5,000 platform credits per month
- Perfect for personal projects
- No credit card required

## Troubleshooting

**The error mentions both the direct fetch and Apify?**
- The direct fetch did not find a product, and the browser scrape also failed
- Check that `APIFY_API_TOKEN` is set on the Edge Functions
- Check that the Apify account has credits
- For Amazon and Mercado Libre, use the Chrome extension on the open product page

**Error: "Could not extract product data"**
- The URL might not be a product page
- The site may heavily rely on JavaScript (try Apify or Chrome extension)
- Try the Chrome extension for sites with aggressive protection
- Check if the site requires authentication

**Scraping works but data is incomplete?**
- Basic scraper extracts from meta tags and common HTML patterns
- For better results on complex sites, add Apify token
- For Amazon, eBay, and sites with bot detection, use the Chrome extension

## Support

For issues with:
- **Apify API**: Visit [Apify Documentation](https://docs.apify.com)
- **Supabase**: Visit [Supabase Documentation](https://supabase.com/docs)
