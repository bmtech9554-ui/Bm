import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase = supabaseUrl && publishableKey?.startsWith('sb_publishable_')
  ? createClient(supabaseUrl, publishableKey, { auth: { flowType: 'pkce' } })
  : null;
