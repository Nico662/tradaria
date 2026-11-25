import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function swVersionPlugin() {
  return {
    name: 'sw-version',
    closeBundle() {
      const swPath = path.resolve('dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const version = `tradiko-${Date.now()}`
      const content = fs.readFileSync(swPath, 'utf8')
      fs.writeFileSync(swPath, content.replace('__SW_CACHE_VERSION__', version))
      console.log(`[sw-version] CACHE_NAME → ${version}`)
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
