import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  user_id: string;
  source_url: string;
  domain: string | null;
  title: string | null;
  price: string | null;
  currency: string;
  brand: string | null;
  description: string | null;
  images: string[];
  features: string[];
  specifications: Record<string, any>;
  availability: string | null;
  rating: number | null;
  review_count: number;
  category: string | null;
  tags: string[];
  raw_data: any;
  scrape_method: 'extension' | 'bulk';
  created_at: string;
  updated_at: string;
};

export type ScrapeJob = {
  id: string;
  user_id: string;
  urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  results: Record<string, any>;
  error_log: any[];
  created_at: string;
  completed_at: string | null;
};
