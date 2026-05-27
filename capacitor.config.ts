import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.paratuzaqi.game',
  appName: 'Is Imparatorlugu',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    AdMob: {
      appId: process.env.VITE_ADMOB_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
      testingDevices: [],
      initializeForTesting: process.env.NODE_ENV !== 'production',
    },
  },
}

export default config
