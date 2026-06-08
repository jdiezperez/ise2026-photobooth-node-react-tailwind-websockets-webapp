import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    envDir: '../',
    css: {
        postcss: {
            plugins: [tailwindcss()],
        },
    },
    server: {
        port: 5174, // Different from client_ui which is likely on 5173
    }
})
