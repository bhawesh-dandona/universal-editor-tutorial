import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],

  build: {
    lib: {
      entry:
        'src/react/product-grid.jsx',
      formats: ['es'],
      fileName:
        () =>
        'product-grid.js',
    },

    outDir:
      'dist/react',
  },
});