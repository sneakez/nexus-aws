import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    setupFiles: ['./src/tests/unitSetup.ts'],
    env: {
      // Isolated values let service modules initialise without using a developer's real credentials.
      VITE_SUPABASE_URL: 'https://test.invalid',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
