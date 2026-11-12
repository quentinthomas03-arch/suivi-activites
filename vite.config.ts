/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// L'appli est servie depuis https://<compte>.github.io/suivi-activites/
export default defineConfig({
  base: '/suivi-activites/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  test: { environment: 'node' },
});
