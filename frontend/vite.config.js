import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    include: ['reactflow', 'react-window']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['reactflow', 'lucide-react', 'react-joyride'],
          'zustand': ['zustand']
        }
      }
    }
  }
})