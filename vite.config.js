import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['@monaco-editor/react'],
          'react-vendor': ['react', 'react-dom'],
          'xterm': ['xterm', '@xterm/addon-fit', '@xterm/addon-search', '@xterm/addon-web-links']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5174
  }
}));
