import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const SUPABASE_PROJECT_ID = 'pklukpdoymfmzamdyjbt';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

if (!supabasePublishableKey) {
  throw new Error(
    '[ProDG] Supabase anon key is missing.\n\n' +
      'Add a .env file in the project root (see .env.example):\n' +
      `  VITE_SUPABASE_URL=${DEFAULT_SUPABASE_URL}\n` +
      '  VITE_SUPABASE_PUBLISHABLE_KEY=<anon public key from Supabase>\n\n' +
      'Dashboard: Project Settings → API → Project API keys → anon public.\n' +
      'Production: set these on your host before npm run build (Vite embeds VITE_* at build time).'
  );
}

/** Single client for the app + password recovery (PKCE + URL hash). */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export { supabaseUrl, supabasePublishableKey };
