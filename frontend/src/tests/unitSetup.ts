import { vi } from 'vitest';

// Unit tests must never inherit the developer's live Supabase settings.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.invalid');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubGlobal('fetch', vi.fn(() => {
  throw new Error('Network is disabled in unit tests. Use an explicit HTTP fixture or the local API lab.');
}));
