import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function buildTimestampLabel() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const buildTimestamp = buildTimestampLabel()

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: true,
    },
    define: {
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(env.VITE_BUILD_VERSION || 'mobile-v1.0.0'),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(env.VITE_BUILD_TIMESTAMP || buildTimestamp),
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(env.VITE_BUILD_ID || 'mobile-v1.0.0'),
      'import.meta.env.VITE_SW_CACHE_VERSION': JSON.stringify(env.VITE_SW_CACHE_VERSION || 'v3'),
      'import.meta.env.VITE_DELIVERY_DATE': JSON.stringify(env.VITE_DELIVERY_DATE || '2026-07-17'),
    },
    test: {
      environment: 'node',
      include: ['tests/foundation/**/*.test.js'],
      fileParallelism: false,
    },
  }
})
