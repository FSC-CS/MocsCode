import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { configDefaults } from 'vitest/config';
import { resolve } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/*'],
    testTimeout: 10000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['src/test/**/*', 'src/**/*.test.ts'],
    },
  },
}));
