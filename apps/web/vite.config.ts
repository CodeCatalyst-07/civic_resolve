import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@civicresolve/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        timeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: {
                    code: 'service_unavailable',
                    message:
                      'The CivicResolve API server is starting up or temporarily unreachable. Please retry in a moment.',
                  },
                })
              );
            }
          });
        },
      },
    },
  },
  // @ts-expect-error - vitest property recognized by vitest runner
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/test/**/*',
        'src/components/ui/**/*',
      ],
      thresholds: {
        'src/components/**': {
          lines: 85,
          statements: 85,
          branches: 85,
          functions: 80,
        },
        'src/features/**': {
          lines: 85,
          statements: 85,
          branches: 85,
          functions: 80,
        },
      },
      reporter: ['text', 'json', 'html'],
    },
  },
});
