import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/raffle': {
        target: 'https://meuringo.com.br',
        changeOrigin: true,
      },
      '/winner': {
        target: 'https://meuringo.com.br',
        changeOrigin: true,
      },
      '/ringo': {
        target: 'https://meuringo.com.br',
        changeOrigin: true,
      },
      '/store': {
        target: 'https://meuringo.com.br',
        changeOrigin: true,
      },
      '/sheet': {
        target: 'https://meuringo.com.br',
        changeOrigin: true,
      }
    }
  }
})
