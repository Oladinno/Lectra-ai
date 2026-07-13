import { Platform } from 'react-native';

// Standard React Native development URL
// For Android emulator, use 10.0.2.2. For iOS emulator or Web, use localhost.
// Change this to your local IP (e.g., http://192.168.1.50:8000) if debugging on a physical device.
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});
