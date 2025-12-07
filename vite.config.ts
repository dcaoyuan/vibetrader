import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/vibetrader/',
    //base: '/',
    build: {
        sourcemap: true,
        minify: true, // TODO, transpile 'minified' indicator code correctly.
    },
})
