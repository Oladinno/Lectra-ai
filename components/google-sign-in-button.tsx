import React, { useEffect, useState } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { useAuth } from '@/app/context/auth';
import { API_BASE_URL } from '@/constants/api';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleAuthConfigured,
} from '@/constants/google';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { logError } from '@/utils/logger';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function GoogleSignInButton({ onError, disabled }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const redirectUri = makeRedirectUri({
    scheme: 'lectraai',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Web client is the common denominator for Expo Go and many setups.
    clientId: GOOGLE_WEB_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    redirectUri,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken =
        response.params.id_token ??
        // Some platforms nest credentials
        (response as { authentication?: { idToken?: string } }).authentication?.idToken;

      if (!idToken) {
        onError?.('Google did not return an ID token. Check your OAuth client configuration.');
        setLoading(false);
        return;
      }

      void completeGoogleSignIn(idToken);
    } else if (response.type === 'error') {
      onError?.(response.error?.description ?? (response.error as any)?.message ?? 'Google sign-in failed.');
      setLoading(false);
    } else if (response.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  async function completeGoogleSignIn(idToken: string) {
    setLoading(true);
    try {
      const tokenRes = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json().catch(() => ({}));
        const detail = errorData.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
              : 'Google sign-in failed on the server.';
        throw new Error(message);
      }

      const tokenData = await tokenRes.json();

      const profileRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        throw new Error('Signed in with Google but failed to load your profile.');
      }

      const userData = await profileRes.json();
      await signIn(tokenData.access_token, userData);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      logError(err, 'GoogleSignInButton/completeGoogleSignIn');
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePress() {
    if (!isGoogleAuthConfigured()) {
      onError?.(
        'Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your env.',
      );
      return;
    }
    if (!request) {
      onError?.('Google Sign-In is still preparing. Try again in a moment.');
      return;
    }

    setLoading(true);
    onError?.('');
    try {
      await promptAsync();
    } catch (err: unknown) {
      logError(err, 'GoogleSignInButton/promptAsync');
      const message = err instanceof Error ? err.message : 'Could not open Google Sign-In.';
      onError?.(message);
      setLoading(false);
    }
  }

  if (!isGoogleAuthConfigured()) {
    return null;
  }

  const busy = loading || disabled || !request;

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

      {Platform.OS === 'web' && (
        <Text style={[styles.hint, { color: C.onSurfaceVariant }]}>
          Use the same Google Cloud Web client ID on web and the backend.
        </Text>
      )}
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
  hint: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
