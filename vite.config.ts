import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/pages',
  publicDir: '../../public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/pages/index.html'),
        create: resolve(__dirname, 'src/pages/create.html'),
        game: resolve(__dirname, 'src/pages/game.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
