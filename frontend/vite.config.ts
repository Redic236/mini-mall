import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Uploaded avatar files live on the backend — proxy /uploads too so
      // <img src="/uploads/..." /> resolves in dev the same way it does in
      // the nginx-fronted production setup.
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the "big chunk" warning threshold so the antd chunk (≈900 KB raw
    // / ≈300 KB gzip) stops nagging — it's already the smallest we can make
    // it without deeper tree-shaking, and it's cached long-term.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Stable vendor chunks = better browser cache hit rate. App code
        // changes shouldn't bust react/antd/redux chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // antd ecosystem: antd itself + rc-* / @rc-component (its internals)
          // + @ant-design (icons, etc.). Grouping them avoids a circular
          // antd <-> vendor chunk dependency.
          if (
            id.includes('/antd/') ||
            id.includes('/@ant-design/') ||
            id.includes('/rc-') ||
            id.includes('/@rc-component/')
          ) {
            return 'antd';
          }
          if (id.includes('/react-router')) return 'react-router';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react';
          }
          if (
            id.includes('/@reduxjs/toolkit/') ||
            id.includes('/react-redux/') ||
            id.includes('/redux/')
          ) {
            return 'redux';
          }
          return 'vendor';
        },
      },
    },
  },
});
