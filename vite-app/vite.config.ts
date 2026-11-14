import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the built bundle also runs from a file:// WebView when the
// app is wrapped (Capacitor / Tauri) instead of served from a web root.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['jch-6-0-hangout-vite.v0.build'],
  },
})
