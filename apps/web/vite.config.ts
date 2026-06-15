import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Project GitHub Pages serve from /<repo>/. Override with VITE_BASE for a custom domain or root.
const base = process.env.VITE_BASE ?? '/AIEngineerCV/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022', outDir: 'dist' },
});
