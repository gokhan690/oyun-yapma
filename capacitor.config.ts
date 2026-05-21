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
      appId: 'ca-app-pub-3940256099942544~3347511713',
      testingDevices: [],
      initializeForTesting: true,
    },
  },
}

export default config
