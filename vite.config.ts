import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  define: {
    // Define global constants
    'process.env': {},
    'process.platform': '"browser"',
    'process.version': JSON.stringify('18.0.0'),
    'global': 'window',
    'browser': 'true',
  },
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
