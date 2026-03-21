import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

function readBackendPortFromRootEnv(): string | null {
  try {
    const envPath = fileURLToPath(new URL('../.env', import.meta.url))
    const content = readFileSync(envPath, 'utf8')
    const line = content
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.startsWith('PORT='))

    if (!line) return null
    const value = line.slice('PORT='.length).trim().replace(/^['"]|['"]$/g, '')
    return value || null
  } catch {
    return null
  }
}

const backendPort = process.env.PORT || readBackendPortFromRootEnv() || '3000'
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || `http://127.0.0.1:${backendPort}`

console.log(`[vite] API proxy target: ${apiProxyTarget}`)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
