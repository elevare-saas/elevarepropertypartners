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
    {
      /* WhatsApp is the site's first contact: never ship a build whose WhatsApp buttons go nowhere */
      name: 'require-whatsapp',
      configResolved(config) {
        const n = String(config.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
        if (config.command === 'build' && n.length < 8)
          throw new Error(
            'VITE_WHATSAPP_NUMBER is missing. Add it to elevare-frontend/.env (digits only, e.g. 66812345678) and build again.'
          );
      }
    },
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
