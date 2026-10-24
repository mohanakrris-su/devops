import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the warning threshold and split large vendor deps into separate chunks
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Recharts and its dependencies
          'vendor-recharts': ['recharts'],
          // Lucide icons
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
});
