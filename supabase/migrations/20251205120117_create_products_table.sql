/*
  # Product Scraper Database Schema

  ## Overview
  This migration creates the core database structure for a hybrid product scraping system
  that supports both manual Chrome extension scraping and automated bulk scraping via Crawlee.

  ## New Tables
  
  ### `products`
  Main table storing all scraped product information:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to auth.users for multi-user support
  - `source_url` (text) - Original product page URL
  - `domain` (text) - Website domain (e.g., "amazon.com", "ebay.com")
  - `title` (text) - Product name/title
  - `price` (text) - Product price as displayed
  - `currency` (text) - Currency code (USD, EUR, etc.)
  - `brand` (text) - Product brand/manufacturer
  - `description` (text) - Full product description
  - `images` (jsonb) - Array of image URLs
  - `features` (jsonb) - Array of product features/bullet points
  - `specifications` (jsonb) - Object with detailed specifications
  - `availability` (text) - Stock status
  - `rating` (numeric) - Product rating (0-5)
  - `review_count` (integer) - Number of reviews
  - `category` (text) - Product category
  - `tags` (text[]) - Custom tags for organization
  - `raw_data` (jsonb) - Complete raw scraping data for debugging
  - `scrape_method` (text) - "extension" or "bulk" to track source
  - `created_at` (timestamptz) - When product was scraped
  - `updated_at` (timestamptz) - Last update timestamp

  ### `scrape_jobs`
  Track bulk scraping operations:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to auth.users
  - `urls` (text[]) - Array of URLs to scrape
  - `status` (text) - "pending", "processing", "completed", "failed"
  - `progress` (integer) - Number of URLs processed
  - `total` (integer) - Total URLs to process
  - `results` (jsonb) - Summary of scraping results
  - `error_log` (jsonb) - Array of errors encountered
  - `created_at` (timestamptz) - Job creation time
  - `completed_at` (timestamptz) - Job completion time

  ## Security
  - Enable RLS on all tables
  - Users can only access their own products and scrape jobs
  - Authenticated users can create, read, update, and delete their own data
  - Public access is completely blocked

  ## Indexes
  - Index on user_id for fast user-specific queries
  - Index on domain for filtering by website
  - Index on created_at for chronological sorting
  - GIN index on tags for array operations
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  domain text,
  title text,
  price text,
  currency text DEFAULT 'USD',
  brand text,
  description text,
  images jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  specifications jsonb DEFAULT '{}'::jsonb,
  availability text,
  rating numeric(3,2),
  review_count integer DEFAULT 0,
  category text,
  tags text[] DEFAULT ARRAY[]::text[],
  raw_data jsonb,
  scrape_method text DEFAULT 'extension' CHECK (scrape_method IN ('extension', 'bulk')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  urls text[] NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0,
  total integer NOT NULL,
  results jsonb DEFAULT '{}'::jsonb,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_domain ON products(domain);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_id ON scrape_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for scrape_jobs table
CREATE POLICY "Users can view own scrape jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scrape jobs"
  ON scrape_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scrape jobs"
  ON scrape_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scrape jobs"
  ON scrape_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();