/**
 * Google OAuth client IDs for Expo Auth Session.
 *
 * Create OAuth 2.0 Client IDs in Google Cloud Console:
 * https://console.cloud.google.com/apis/credentials
 *
 * - Web client ID: required (used by Expo Go / backend verification)
 * - iOS / Android client IDs: recommended for production builds
 *
 * Also set GOOGLE_CLIENT_IDS on the backend (comma-separated) to the same IDs.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '662167792212-7ba4fjf2to1fsov0ql2vv2nnmo3uq2nc.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '662167792212-4p944fpphvbb7p9spm7keh5jilm7cou0.apps.googleusercontent.com';

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID);
}
