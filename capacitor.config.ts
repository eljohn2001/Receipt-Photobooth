import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.receiptbooth.app',
  appName: 'Receipt Booth',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['photoreceipt.stoodioph.com']
  }
};

export default config;
