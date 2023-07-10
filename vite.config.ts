import * as path from 'path'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'build',
    rollupOptions: {
      input: {
        options: path.resolve('options.html'),
        popup: path.resolve('popup.html'),
        newtab: path.resolve('newtab.html'),
        sidepanel: path.resolve('sidepanel.html'),
      },
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  plugins: [crx({ manifest })],
})
