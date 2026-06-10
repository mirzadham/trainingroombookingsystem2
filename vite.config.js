import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const basePath = env.VITE_BASE_PATH 
        ? `${env.VITE_BASE_PATH.replace(/\/$/, '')}/build/` 
        : '/build/';

    return {
        base: basePath,
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.jsx'],
                refresh: true,
            }),
            react(),
            tailwindcss(),
        ],
        server: {
            host: '127.0.0.1',
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
        resolve: {
            alias: {
                '@': '/resources/js',
            },
        },
    };
});
