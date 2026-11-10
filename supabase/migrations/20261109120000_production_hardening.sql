/*
  Production hardening for databases created before these constraints existed.
  Safe to run more than once.
*/

UPDATE products
SET scrape_method = 'extension'
WHERE scrape_method IS NULL
   OR scrape_method NOT IN ('extension', 'bulk', 'url-scraper');

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_scrape_method_check;
ALTER TABLE products
  ADD CONSTRAINT products_scrape_method_check
  CHECK (scrape_method IN ('extension', 'bulk', 'url-scraper'));

DELETE FROM products WHERE user_id IS NULL;

ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;

DELETE FROM products older
USING products newer
WHERE older.user_id = newer.user_id
  AND older.source_url = newer.source_url
  AND older.id <> newer.id
  AND (
    COALESCE(older.created_at, '-infinity'::timestamptz) < COALESCE(newer.created_at, '-infinity'::timestamptz)
    OR (
      COALESCE(older.created_at, '-infinity'::timestamptz) = COALESCE(newer.created_at, '-infinity'::timestamptz)
      AND older.id < newer.id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_user_source ON products(user_id, source_url);

ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE scrape_jobs SET updated_at = created_at WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS update_scrape_jobs_updated_at ON scrape_jobs;
CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scrape_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;
