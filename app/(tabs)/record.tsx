import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/context/auth';

type RecordingState = 'idle' | 'recording' | 'paused';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RecordScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Pulse animation refs
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (state === 'recording') {
      pulseAnim.current = Animated.loop(
        Animated.stagger(400, [
          Animated.sequence([
            Animated.timing(pulse1, { toValue: 1.5, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(pulse1, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulse2, { toValue: 1.7, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(pulse2, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulse3, { toValue: 1.9, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(pulse3, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
        ])
      );
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      Animated.parallel([
        Animated.timing(pulse1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(pulse3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    return () => pulseAnim.current?.stop();
  }, [state]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state === 'recording') {
      interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  async function startRecording() {
    try {
      const { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        const { granted: newGranted } = await requestRecordingPermissionsAsync();
        if (!newGranted) {
          Alert.alert("Permission Required", "Microphone access is needed to record lectures.");
          return;
        }
      }

      await setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch (err) {
      logError(err, 'RecordScreen/startRecording');
      console.error('Failed to start recording', err);
      Alert.alert("Error", "Could not start audio recording.");
    }
  }

  async function pauseRecording() {
    try {
      recorder.pause();
      setState('paused');
    } catch (err) {
      logError(err, 'RecordScreen/pauseRecording');
      console.error('Failed to pause recording', err);
    }
  }

  async function resumeRecording() {
    try {
      recorder.record();
      setState('recording');
    } catch (err) {
      logError(err, 'RecordScreen/resumeRecording');
      console.error('Failed to resume recording', err);
    }
  }

  async function handleStartStop() {
    if (state === 'idle') {
      await startRecording();
    } else if (state === 'recording') {
      await pauseRecording();
    } else {
      await resumeRecording();
    }
  }

  async function handleSave() {
    try {
      setLoading(true);
      await recorder.stop();
      const uri = recorder.uri;
      setState('idle');
      setElapsed(0);

      if (!uri) {
        throw new Error("No recording URI resolved");
      }

      // Prepare multi-part form upload
      const formData = new FormData();
      const filename = `recording_${Date.now()}.m4a`;
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: 'audio/x-m4a',
      } as any);

      const defaultTitle = `Lecture ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      formData.append('title', defaultTitle);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const resData = await response.json();
      setLoading(false);
      router.push({ pathname: '/processing', params: { id: resData.id } });
    } catch (err: any) {
      setLoading(false);
      logError(err, 'RecordScreen/handleSave');
      Alert.alert("Upload Error", err.message || "Failed to upload recording to backend server.");
    }
  }

  async function handleDiscard() {
    try {
      await recorder.stop();
    } catch (e) {}
    setState('idle');
    setElapsed(0);
  }

  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isActive = isRecording || isPaused;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* App Bar */}
      <View style={[styles.appBar, { backgroundColor: C.surface, paddingTop: insets.top + 16, height: 64 + insets.top + 16 }]}>
        <Text style={[styles.appBarTitle, { color: C.primary }]}>Record Lecture</Text>
      </View>

      <View style={styles.centreContainer}>
        {/* Pulsing rings */}
        <View style={styles.orbContainer}>
          <Animated.View
            style={[
              styles.ring,
              {
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: C.secondary,
                opacity: isRecording ? 0.08 : 0,
                transform: [{ scale: pulse3 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: C.secondary,
                opacity: isRecording ? 0.12 : 0,
                transform: [{ scale: pulse2 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: C.secondary,
                opacity: isRecording ? 0.18 : 0,
                transform: [{ scale: pulse1 }],
              },
            ]}
          />
          {/* Core orb */}
          <TouchableOpacity
            style={[
              styles.orbCore,
              {
                backgroundColor: isRecording ? C.secondary : isPaused ? C.primaryContainer : C.surfaceContainerHigh,
                shadowColor: isRecording ? C.secondary : '#031635',
              },
            ]}
            onPress={handleStartStop}
            activeOpacity={0.85}>
            <Ionicons
              name={isRecording ? 'pause' : isPaused ? 'play' : 'mic'}
              size={44}
              color={isActive ? '#FFFFFF' : C.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        <Text style={[styles.timer, { color: C.primary }]}>
          {formatDuration(elapsed)}
        </Text>
        <Text style={[styles.statusText, { color: C.onSurfaceVariant }]}>
          {state === 'idle' && 'Tap the mic to start recording'}
          {state === 'recording' && '● Recording…'}
          {state === 'paused' && '▐▐ Paused — tap to resume'}
        </Text>

        {/* Action buttons */}
        {isActive && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.errorContainer }]}
              onPress={handleDiscard}
              disabled={loading}>
              <Ionicons name="trash-outline" size={22} color={C.error} />
              <Text style={[styles.actionBtnLabel, { color: C.error }]}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, { backgroundColor: C.secondary }]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                  <Text style={[styles.actionBtnLabel, { color: '#FFFFFF' }]}>Save & Process</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tips card */}
      {state === 'idle' && (
        <View style={[styles.tipsCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant }]}>
          <View style={styles.tipRow}>
            <Ionicons name="volume-high-outline" size={18} color={C.secondary} />
            <Text style={[styles.tipText, { color: C.onSurfaceVariant }]}>Place your phone close to the speaker for best accuracy.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="infinite-outline" size={18} color={C.secondary} />
            <Text style={[styles.tipText, { color: C.onSurfaceVariant }]}>Lectures up to 3 hours are supported.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="flash-outline" size={18} color={C.secondary} />
            <Text style={[styles.tipText, { color: C.onSurfaceVariant }]}>AI insights are generated automatically after saving.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  appBarTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  centreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  orbContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
  },
  orbCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  timer: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -2,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 40,
    letterSpacing: 0.2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveBtn: {
    flex: 2,
    shadowColor: '#4648d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnLabel: { fontSize: 14, fontWeight: '700' },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 120,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
