# Apify Integration Setup (Optional)

## Important: Apify is Optional

The URL scraper works **without Apify** using a basic scraper that handles most e-commerce sites. Apify is only needed for:
- Sites with heavy JavaScript rendering
- Pages with strong anti-bot protection
- Complex dynamic content

**The scraper automatically uses fallback mode if Apify is not configured**, so you can use it right away without any setup.

## Why Use Apify? (Optional Enhancement)

Adding Apify API provides enhanced scraping capabilities:

- **JavaScript Rendering**: Handles sites that load content dynamically
- **Anti-Bot Protection**: Bypasses common anti-scraping measures
- **Better Accuracy**: More reliable data extraction from complex sites
- **Smart Fallback**: Automatically falls back to basic scraper if Apify fails

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

The scraper intelligently chooses the best method:

1. **If Apify is configured**:
   - First attempts to use Apify API for robust scraping
   - If Apify fails, automatically falls back to basic scraper
2. **If Apify is not configured**:
   - Uses basic scraper (works great for most e-commerce sites)
   - Extracts data from meta tags, schema.org markup, and common HTML patterns

**You don't need Apify to use the URL scraper** - it's fully functional without it!

## Apify Free Tier

Apify offers a generous free tier:
- 5,000 platform credits per month
- Perfect for personal projects
- No credit card required

## Troubleshooting

**"Apify scraping failed" message?**
- Don't worry! The scraper automatically falls back to basic mode
- This message just means Apify couldn't be used, but scraping continues
- If you see this and want to fix it:
  - Verify your Apify token is correct
  - Check that the environment variable is set in Supabase
  - Ensure you have Apify credits available

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
