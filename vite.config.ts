import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `base: './'` + hash routing lets the same build run from `/`, from a
// GitHub Pages project path like `/horse-racing/`, or from a single file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [vue(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
  },
}))
