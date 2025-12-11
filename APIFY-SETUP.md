# Apify Integration Setup

## Why Use Apify?

The URL scraper now supports **Apify API** integration for enhanced scraping capabilities:

- **JavaScript Rendering**: Handles sites that load content dynamically
- **Anti-Bot Protection**: Bypasses common anti-scraping measures
- **Better Accuracy**: More reliable data extraction from complex sites
- **Fallback Support**: Automatically falls back to basic scraping if Apify is not configured

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

1. **If Apify is configured**: Uses Apify API for robust scraping
2. **If Apify is not configured**: Uses fallback scraper (good for simple sites)

## Apify Free Tier

Apify offers a generous free tier:
- 5,000 platform credits per month
- Perfect for personal projects
- No credit card required

## Troubleshooting

**Scraper still failing?**
- Verify your Apify token is correct
- Check that the environment variable is set in Supabase
- For Amazon and eBay, use the Chrome extension instead
- Some sites with heavy protection may still block scraping

**Error: "Could not extract product data"**
- The URL might not be a product page
- Try the Chrome extension for better results
- Check if the site requires authentication

## Support

For issues with:
- **Apify API**: Visit [Apify Documentation](https://docs.apify.com)
- **Supabase**: Visit [Supabase Documentation](https://supabase.com/docs)
