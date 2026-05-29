import { defineConfig } from 'vite';

// Multi-page app: landing (/), character creation (/create/), game (/game/).
// Clean URLs are preserved by the directory layout of the entry HTML files,
// so the hard-coded navigation strings (`/create/`, `/game/?new=1`) need no edits.
export default defineConfig({
  server: {
    port: 1984,
    // Allow importing the sibling rot-js fork (`link:../rot-js-fork`) and the
    // out-of-src binary-map JSON under `data/` (both live at/above the repo root).
    fs: { allow: ['..'] },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        create: 'create/index.html',
        game: 'game/index.html',
      },
    },
  },
});
