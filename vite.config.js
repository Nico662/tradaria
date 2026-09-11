import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'

// Injects a unique cache name into dist/sw.js after every build so the
// activate handler purges stale assets automatically on each deploy.
function swVersionPlugin() {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const version = `tradiko-${Date.now()}`
      const swPath = 'dist/sw.js'
      const content = readFileSync(swPath, 'utf8')
      writeFileSync(swPath, content.replace('__SW_CACHE_VERSION__', version))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    historyApiFallback: true,
  },
})
