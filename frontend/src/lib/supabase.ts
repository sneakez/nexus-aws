import { createClient } from '@supabase/supabase-js';
import { isMockMode } from './config';
import { mockSupabaseClient } from '@/mock/mockSupabaseAdapter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

const realSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// If DATA_MODE=mock, route all queries seamlessly to the Centralized Mock Store
export const supabase = isMockMode() ? (mockSupabaseClient as unknown as typeof realSupabase) : realSupabase;
