import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 8787 },
  preview: { host: '127.0.0.1', port: 8787 },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [
    {
      name: 'github-pages-spa',
      closeBundle() {
        const dist = path.resolve('dist');
        if (!fs.existsSync(dist)) return;
        fs.writeFileSync(path.join(dist, '.nojekyll'), '');
        const indexPath = path.join(dist, 'index.html');
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, path.join(dist, '404.html'));
        }
      },
    },
  ],
});
