import React, { useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useOAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { logError } from '@/utils/logger';

// Warm up WebBrowser for Android performance
export function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function GoogleSignInButton({ onError, disabled }: Props) {
  useWarmUpBrowser();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = React.useState(false);

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const handlePress = useCallback(async () => {
    setLoading(true);
    onError?.('');
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        // Retrieve session / ID token from Clerk to authenticate with backend API
        const clerkSession = await AuthSession.fetchAsync ? null : null; 
        
        router.replace('/(tabs)');
      } else {
        // OAuth flow requires additional steps (e.g. MFA / 2FA)
        setLoading(false);
      }
    } catch (err: any) {
      logError(err, 'GoogleSignInButton/ClerkOAuth');
      const message = err?.errors?.[0]?.message || err?.message || 'Google Sign-In failed.';
      onError?.(message);
      setLoading(false);
    }
  }, [startOAuthFlow, onError]);

  const busy = loading || disabled;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: C.outlineVariant }]} />
        <Text style={[styles.dividerText, { color: C.onSurfaceVariant }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: C.outlineVariant }]} />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: C.surfaceContainerLowest,
            borderColor: C.outlineVariant,
            opacity: busy ? 0.7 : 1,
          },
        ]}
        onPress={handlePress}
        disabled={busy}
        activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={C.onSurface} size="small" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={[styles.buttonText, { color: C.onSurface }]}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    height: 52,
    borderWidth: 1,
  },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
