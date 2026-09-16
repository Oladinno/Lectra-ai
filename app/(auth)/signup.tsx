import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Call registration endpoint
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed. Please try again.');
      }

      const tokenData = await response.json();
      
      // 2. Fetch profile info
      const profileResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to load user profile after registration.');
      }

      const userData = await profileResponse.json();
      await signUp(tokenData.access_token, userData);
      
      // 3. Navigate to home tabs
      router.replace('/(tabs)');
    } catch (err: any) {
      logError(err, 'SignUpScreen/handleSignUp');
      setErrorMsg(err.message || 'An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.heroSection}>
          <View style={[styles.logoIconBg, { backgroundColor: C.primary }]}>
            <Ionicons name="school" size={40} color={C.onPrimary} />
          </View>
          <Text style={[styles.brandName, { color: C.primary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: C.onSurfaceVariant }]}>
            Get automated study notes, transcripts, and flashcards for your lectures.
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.formContainer}>
          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: C.errorContainer, borderColor: C.error }]}>
              <Ionicons name="alert-circle" size={18} color={C.error} />
              <Text style={[styles.errorText, { color: C.onErrorContainer }]}>{errorMsg}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputWrap}>
            <Text style={[styles.inputLabel, { color: C.onSurfaceVariant }]}>Email Address</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: C.surfaceContainerLowest,
                  borderColor: emailFocused ? C.primary : C.outlineVariant,
                  borderWidth: emailFocused ? 2 : 1,
                },
              ]}>
              <Ionicons name="mail-outline" size={20} color={emailFocused ? C.primary : C.outline} style={styles.fieldIcon} />
              <TextInput
                style={[styles.textInput, { color: C.onSurface }]}
                placeholder="email@example.com"
                placeholderTextColor={C.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrap}>
            <Text style={[styles.inputLabel, { color: C.onSurfaceVariant }]}>Password</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: C.surfaceContainerLowest,
                  borderColor: passwordFocused ? C.primary : C.outlineVariant,
                  borderWidth: passwordFocused ? 2 : 1,
                },
              ]}>
              <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? C.primary : C.outline} style={styles.fieldIcon} />
              <TextInput
                style={[styles.textInput, { color: C.onSurface }]}
                placeholder="Must be 6+ characters"
                placeholderTextColor={C.outline}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={C.outline}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputWrap}>
            <Text style={[styles.inputLabel, { color: C.onSurfaceVariant }]}>Confirm Password</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: C.surfaceContainerLowest,
                  borderColor: confirmFocused ? C.primary : C.outlineVariant,
                  borderWidth: confirmFocused ? 2 : 1,
                },
              ]}>
              <Ionicons name="lock-closed-outline" size={20} color={confirmFocused ? C.primary : C.outline} style={styles.fieldIcon} />
              <TextInput
                style={[styles.textInput, { color: C.onSurface }]}
                placeholder="Re-enter password"
                placeholderTextColor={C.outline}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={C.outline}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: C.primary }]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={C.onPrimary} size="small" />
            ) : (
              <>
                <Text style={[styles.buttonText, { color: C.onPrimary }]}>Create Account</Text>
                <Ionicons name="person-add-outline" size={18} color={C.onPrimary} />
              </>
            )}
          </TouchableOpacity>

          <GoogleSignInButton
            disabled={loading}
            onError={(msg) => setErrorMsg(msg || null)}
          />

          {/* Redirect Link */}
          <View style={styles.redirectContainer}>
            <Text style={[styles.redirectText, { color: C.onSurfaceVariant }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signin')}>
              <Text style={[styles.redirectLink, { color: C.secondary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  heroSection: { alignItems: 'center', marginBottom: 28 },
  logoIconBg: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  brandName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  formContainer: { width: '100%' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 18,
    gap: 8,
  },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1 },
  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  fieldIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 14, height: '100%' },
  eyeIcon: { padding: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 52,
    marginTop: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  redirectContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  redirectText: { fontSize: 13 },
  redirectLink: { fontSize: 13, fontWeight: '700' },
});
