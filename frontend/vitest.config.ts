import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    setupFiles: ['./src/tests/unitSetup.ts'],
    env: {
      VITE_DATA_MODE: 'mock',
      VITE_SUPABASE_URL: 'https://mock.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
    },
  },
});
