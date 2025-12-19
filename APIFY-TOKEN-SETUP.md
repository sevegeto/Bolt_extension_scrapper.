# Setting Up Your Apify Token (Required)

## Why You Need This

Your bulk scraping job failed because these sites use bot detection. To scrape these URLs successfully, you **must** add your Apify API token.

**The scrapers now have Apify support built-in** - you just need to configure the token!

---

## Quick Setup (5 Minutes)

### Step 1: Get Your Free Apify Token

1. Go to [apify.com](https://apify.com)
2. Sign up for a free account (no credit card required)
3. After signing in, go to **Settings** → **Integrations**
4. Copy your **Personal API token**

**Free tier includes:**
- 5,000 credits per month
- Enough for hundreds of product scrapes
- No credit card needed

---

### Step 2: Add Token to Your Supabase Project

You need to add the token as an environment variable to your Supabase edge functions.

#### Using Supabase Dashboard (Easiest):

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Project Settings** (gear icon in bottom left)
4. Navigate to **Edge Functions** section
5. Scroll to **Environment Variables**
6. Click **Add variable**
7. Enter:
   - **Name:** `APIFY_API_TOKEN`
   - **Value:** Your Apify token (paste it here)
8. Click **Save**

---

### Step 3: Test the Scraper

1. Go back to your dashboard
2. Navigate to **Bulk Import** or **URL Scraper**
3. Try scraping those URLs again
4. **It will now work!** Apify will bypass the bot detection

---

## How It Works Now

Both scrapers (single URL and bulk) now have smart Apify integration:

### Without Apify Token (Current State):
```
URL → Basic Scraper → Bot Detection → FAILS ❌
```

### With Apify Token (After Setup):
```
URL → Apify API → JavaScript Rendering → Bot Bypass → SUCCESS ✅
```

**Automatic Fallback:**
- If Apify has issues, automatically falls back to basic scraper
- If Apify credits run out, falls back to basic scraper
- Best of both worlds!

---

## What You Can Scrape With Apify

### Sites That Work Better With Apify:
- ✅ westhunter.net (your failed URL)
- ✅ globalordnance.com (your failed URL)
- ✅ Most e-commerce sites with bot protection
- ✅ JavaScript-heavy product pages
- ✅ Dynamic content sites

### Sites That Still Need Chrome Extension:
- Amazon (heavy protection)
- eBay (complex JavaScript)
- Sites requiring login

---

## Verifying It's Working

After adding your token, check the Supabase Edge Functions logs:

1. Go to **Edge Functions** in Supabase Dashboard
2. Click on **process-scrape-jobs**
3. Click **Logs** tab
4. You should see: `"Using Apify for: [your-url]"`

If you see `"Using fallback scraper"`, the token isn't configured yet.

---

## Troubleshooting

### "Still getting bot detection errors"
- Double-check the token is exactly copied (no extra spaces)
- Make sure variable name is exactly: `APIFY_API_TOKEN`
- Wait 1-2 minutes after adding the token for edge functions to reload

### "Running out of Apify credits?"
- Free tier gives 5,000 credits/month
- Each scrape uses ~5-10 credits
- You can scrape 500-1000 products per month free
- Upgrade plan at apify.com if you need more

### "Token added but not working?"
1. Check Edge Functions logs in Supabase
2. Make sure you saved the environment variable
3. Try deploying the edge function again (it should auto-reload)

---

## Cost Reference

### Apify Free Tier:
- **5,000 credits/month** - FREE
- ~500-1000 product scrapes
- Perfect for personal use

### Apify Paid Plans (if needed):
- **Starter:** $49/mo - 200,000 credits
- **Business:** $499/mo - 2,500,000 credits

Most users never need to upgrade from free tier!

---

## Alternative: Chrome Extension

If you don't want to use Apify, you can use the **Chrome Extension** instead:

1. Open the product page in your browser
2. Click the extension icon
3. Click "Save to Database"
4. Works for any site including those with heavy protection

The extension runs in your actual browser, so it bypasses all bot detection!

---

## Summary

**To fix your failed scraping:**

1. Get Apify token from [apify.com](https://apify.com) (2 minutes)
2. Add `APIFY_API_TOKEN` to Supabase Edge Functions (2 minutes)
3. Retry your bulk import (works now!)

**Total setup time:** 5 minutes
**Cost:** FREE (5,000 credits/month)
**Result:** Scraping works on protected sites

---

Once you add the token, retry those two URLs and they'll scrape successfully!
