import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build         -> dist/, for any static host (base './' keeps paths relative, so
//                          GitHub Pages works from a project subpath)
// npm run build:single  -> dist-single/index.html: the whole game in one file that opens
//                          straight from disk, handy for sending to a friend
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    // three.js alone is ~600 kB, so the default 500 kB warning would fire on every build
    chunkSizeWarningLimit: 1000,
    // the minifier drops license comments; three.js's MIT license asks that its notice travel
    // with copies of it, so a banner is added after minification
    rolldownOptions: { output: { postBanner: '/*! Lanternfall | includes three.js (https://threejs.org), Copyright 2010-2026 Three.js Authors, MIT License */' } },
    ...(mode === 'single' ? { outDir: 'dist-single' } : {}),
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
}));
