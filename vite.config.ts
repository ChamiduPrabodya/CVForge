import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const proxy = {
    '/api': { target: `http://127.0.0.1:${env.PORT || 4000}`, changeOrigin: true },
  }
  return { plugins: [react()], server: { proxy }, preview: { proxy } }
})
