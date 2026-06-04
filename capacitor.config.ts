import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leafhome.lighting',
  appName: 'Lighting by LeafFilter',
  webDir: 'dist',

  // ─── iOS Configuration ──────────────────────────────────────────────
  ios: {
    // Dark-mode WebView: makes the safe-area / status bar background black
    // instead of the default white flash on load
    backgroundColor: '#000000',
    contentInset: 'always',
    // Disable the rubber-band bounce scroll — the app handles its own scrolling
    scrollEnabled: false,
    // Prefer dark keyboard to match the app theme
    preferredContentMode: 'mobile',
  },

  // ─── Android Configuration ──────────────────────────────────────────
  android: {
    backgroundColor: '#000000',
    // Allow mixed content so local HTTP calls to the WLED controller work
    // (the WebView is loaded over capacitor:// which is "secure")
    allowMixedContent: true,
  },

  // ─── Plugin Configuration ──────────────────────────────────────────
  plugins: {
    // Status bar: transparent overlay on the black background
    StatusBar: {
      style: 'DARK',            // Light text on dark background
      backgroundColor: '#000000',
      overlaysWebView: true,
    },
    // Splash screen: match the app's pure-black canvas
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      showSpinner: false,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
    // Keyboard: dark theme to match app
    Keyboard: {
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },

  // ─── Dev Server (for `npx cap run` during development) ─────────────
  // Uncomment the block below when running `npx cap run ios/android`
  // to enable live-reload from the Vite dev server:
  //
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:5173',
  //   cleartext: true,
  // },
};

export default config;
