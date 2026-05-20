import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api/datago': {
                target: 'https://apis.data.go.kr',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/datago/, ''),
            },
            '/api/kamis': {
                target: 'http://www.kamis.or.kr',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/kamis/, ''),
            },
            '/api/naver': {
                target: 'https://openapi.naver.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/naver/, ''),
            },
        },
    },
})
