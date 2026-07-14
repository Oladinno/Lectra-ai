import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logError } from '@/utils/logger';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 1. Setup Global JS Error Handler
    const defaultHandler = typeof ErrorUtils !== 'undefined' ? ErrorUtils.getGlobalHandler() : null;
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        logError(error, `GlobalJSHandler (isFatal: ${isFatal})`);
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }

    // 2. Setup Unhandled Promise Rejections for Web / Environments that support it
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleUnhandledRejection = (event: any) => {
        logError(event.reason || 'Unhandled Promise Rejection', 'UnhandledPromiseRejection');
      };
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="processing"
            options={{
              headerShown: false,
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="detail"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

