import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.receiptbooth.app',
  appName: 'Receipt Booth',
  webDir: 'dist',
  server: {
    url: 'https://photoreceipt.stoodioph.com/',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
