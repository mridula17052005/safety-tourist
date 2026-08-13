import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetour.ai',
  appName: 'SafeTour AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0f766e',
    allowMixedContent: true,
  webContentsDebuggingEnabled: true,
  captureInput: true,
  graphicsMode: 'compatibility',
  initialBackgroundFadeDuration: 500,
  resizeMode: 'interactive',
  scalePageToFit: true,
  hideScrollbars: true,
  disableScrolling: false,
    },
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f766e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
