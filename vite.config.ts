import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import comlink from 'vite-plugin-comlink';

export default defineConfig({
  base: '/ddz-solver/',
  plugins: [
    comlink(),
    react(),
    tailwindcss(),
  ],
  worker: {
    plugins: () => [comlink()],
  },
});
