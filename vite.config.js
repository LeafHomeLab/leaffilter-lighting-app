import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      // Exclude Capacitor native platform directories from Vite's file watcher.
      // These contain thousands of generated files that chokidar tries to watch,
      // causing lstat errors — especially on OneDrive-synced folders.
      ignored: ['**/ios/**', '**/android/**', '**/dist/**'],
    },
  },
});
