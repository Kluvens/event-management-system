import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5266',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5266',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target modern browsers — avoids legacy-JS transforms that inflate bundle size
    target: 'es2020',
    rollupOptions: {
      output: {
        // Without manualChunks, Rollup promotes every package shared across
        // multiple lazy pages into the entry chunk, inflating it to ~240 KB
        // gzip.  We pin the heaviest libraries that are:
        //   (a) only imported by lazy page chunks, never by the app shell, and
        //   (b) self-contained with no circular imports back to the entry.
        // This moves them from the entry into deferred named chunks that only
        // download when the first route that needs them is visited.
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // framer-motion (~38 KB gzip) — page animations, not used by app shell
          if (id.includes('framer-motion')) return 'vendor-motion'

          // react-markdown + unified ecosystem (~33 KB gzip) — event descriptions
          if (
            id.includes('react-markdown') ||
            id.includes('remark-') ||
            id.includes('rehype-') ||
            id.includes('micromark') ||
            id.includes('/mdast-') ||
            id.includes('/hast-') ||
            id.includes('/unist-')
          )
            return 'vendor-markdown'
        },
      },
    },
  },
})
