import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const loadSiteUrl = () =>
  loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', __dirname, 'VITE_').VITE_SITE_URL ||
  'https://www.elevarepropertypartners.com';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      /* index.html uses %SITE_URL% for canonical / hreflang / JSON-LD; set VITE_SITE_URL to the live domain */
      name: 'site-url',
      transformIndexHtml: html =>
        html.replaceAll('%SITE_URL%', (process.env.VITE_SITE_URL || loadSiteUrl()).replace(/\/+$/, ''))
    },
    /* the WhatsApp number and other contact details come from the database (dashboard → Website settings) */
    {
      name: 'patch-sec-fetch-dest',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? '';
          const isModule = /\.[mc]?[jt]sx?(\?|$)/.test(url) || url.includes('/@vite/') || url.includes('/@fs/');
          if (isModule && !req.headers['sec-fetch-dest']) {
            req.headers['sec-fetch-dest'] = 'script';
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  base: '/',
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    cssTarget: 'chrome87'
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    /* the Express API in ../backend (npm run dev there) */
    proxy: {
      /* changeOrigin off: the API compares the browser's Origin with the Host it sees (CSRF check) */
      '/api': {target: 'http://localhost:4000', changeOrigin: false},
      '/uploads': {target: 'http://localhost:4000', changeOrigin: false},
      /* generated from the database by the API */
      '/sitemap.xml': {target: 'http://localhost:4000', changeOrigin: false}
    }
  }
});
