import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const sourcePath = (path: string) => fileURLToPath(new URL('./src/' + path, import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const mock = (process.env.VITE_DATA_MODE ?? env.VITE_DATA_MODE) === 'mock';
  return {
    plugins: [react(), {
      name: 'verify-live-runtime',
      generateBundle() {
        if (mock) return;
        const forbidden = [...this.getModuleIds()].filter(id => {
          const path = id.split(String.fromCharCode(92)).join('/');
          return this.getModuleInfo(id)?.isIncluded
            && (path.includes('/src/mock/') || path.includes('/src/stores/'));
        });
        if (forbidden.length) this.error('Mock modules included in live build: ' + forbidden.join(', '));
      },
    }],
    resolve: {
      alias: [
        ...(!mock ? [
          { find: '@/providers/AuthProvider', replacement: sourcePath('providers/LiveAuthProvider.tsx') },
          { find: '@/lib/supabase', replacement: sourcePath('lib/liveSupabase.ts') },
          { find: '@/components/layout/Topbar', replacement: sourcePath('components/layout/LiveTopbar.tsx') },
          { find: '@/features/auth', replacement: sourcePath('features/auth/live.ts') },
          { find: '../layout/AppShell', replacement: sourcePath('app/layout/LiveAppShell.tsx') },
        ] : []),
        { find: '@', replacement: sourcePath('') },
      ],
    },
    optimizeDeps: { include: ['lucide-react'] },
  };
});
