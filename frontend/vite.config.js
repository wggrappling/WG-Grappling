import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
    },
    preview: {
        port: 5173,
        host: '0.0.0.0',
        allowedHosts: ['wg-grappling.onrender.com'],
        proxy: {
            '/api': {
                target: 'https://wg-grappling-backend.onrender.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
});
