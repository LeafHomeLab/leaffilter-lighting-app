import { defineConfig } from 'vite';

// WLED controller IP — update this when switching networks.
// Hotspot: 172.20.10.13 | Home WiFi: check with arp -a or WLED app.
const WLED_IP = process.env.WLED_IP || '172.20.10.13';

export default defineConfig({
  server: {
    host: true,
    proxy: {
      // Proxy WLED API requests so remote devices (phone via tunnel) can
      // control the lights without direct network access to the controller.
      // Laptop still uses direct http://<IP> connections — this is only
      // used when the app detects it's running on a non-localhost origin.
      '/wled-proxy': {
        target: `http://${WLED_IP}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wled-proxy/, ''),
      },
    },
    watch: {
      // Exclude Capacitor native platform directories from Vite's file watcher.
      // These contain thousands of generated files that chokidar tries to watch,
      // causing lstat errors — especially on OneDrive-synced folders.
      ignored: ['**/ios/**', '**/android/**', '**/dist/**'],
    },
  },
});
