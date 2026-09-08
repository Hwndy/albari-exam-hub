import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.def176ba5aaa4bf2a711588b116fc44e',
  appName: 'albari-exam-hub',
  webDir: 'dist',
  server: {
    url: 'https://def176ba-5aaa-4bf2-a711-588b116fc44e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;
