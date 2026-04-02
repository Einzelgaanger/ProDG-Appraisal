import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const FALLBACK_SUPABASE_URL = 'https://sfwltphcerfsfyrtiwwk.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd2x0cGhjZXJmc2Z5cnRpd3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Njk3NjAsImV4cCI6MjA5MDQ0NTc2MH0.6Y6q3rRYIbR6RSy2CFqF_wKMtqqii2G3I2HQiiUaFoo';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
