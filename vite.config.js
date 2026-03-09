import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
server: {
  host: '127.0.0.1',
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
    },
  },
},

build: {
  rollupOptions: {
    input: {
      home: resolve(__dirname, 'index.html'),
      bmi: resolve(__dirname, 'bmi.html'),
      viikoteh: resolve(__dirname, 'viikkotehtavat.html'),
    },
  },
},

base: './',
});
