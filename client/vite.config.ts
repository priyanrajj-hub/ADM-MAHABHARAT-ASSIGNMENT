import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@engine': path.resolve(__dirname, '../src/engine'),
            '@scenarios': path.resolve(__dirname, '../src/scenarios'),
        },
    },
});
