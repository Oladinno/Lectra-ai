import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';

const STEPS = [
  {
    headline: 'Analyzing lecture…',
    subtext: 'Our AI is processing your audio to extract key insights and definitions.',
    progress: 0.3,
  },
  {
    headline: 'Generating smart notes…',
    subtext: 'Creating a structured summary and flashcards from your lecture data.',
    progress: 0.65,
  },
  {
    headline: 'Finishing touches…',
    subtext: 'Finalizing your study materials. Just a few more seconds.',
    progress: 0.95,
  },
];

const STEP_LABELS = [
  'Transcribing Audio',
  'Identifying Key Topics',
  'Formatting Smart Notes',
];

export default function ProcessingScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  
  const { id } = useLocalSearchParams<{ id: string }>();

  const [stepIndex, setStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pulse rings
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;
  const ring1Op = useRef(new Animated.Value(0.25)).current;
  const ring2Op = useRef(new Animated.Value(0.15)).current;
  const ring3Op = useRef(new Animated.Value(0.08)).current;

  // Orb shimmer
  const shimmer = useRef(new Animated.Value(0)).current;

  // Progress bar
  const progressAnim = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    // Continuous ring pulse
    Animated.loop(
      Animated.stagger(600, [
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring1, { toValue: 1.6, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(ring1Op, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring1, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ring1Op, { toValue: 0.25, duration: 0, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring2, { toValue: 1.6, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(ring2Op, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring2, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ring2Op, { toValue: 0.15, duration: 0, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring3, { toValue: 1.6, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(ring3Op, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring3, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ring3Op, { toValue: 0.08, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      ])
    ).start();

    // Shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Poll backend status
  useEffect(() => {
    if (!id) {
      // Fallback preview mode
      const t = setTimeout(() => router.replace('/detail'), 3500);
      return () => clearTimeout(t);
    }

    let intervalId: any;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/lectures/${id}/status`);
        if (!response.ok) {
          throw new Error(`Server returned error status ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status === 'pending') {
          setStepIndex(0);
          Animated.timing(progressAnim, {
            toValue: STEPS[0].progress,
            duration: 600,
            useNativeDriver: false,
          }).start();
        } else if (data.status === 'processing') {
          setStepIndex(1);
          Animated.timing(progressAnim, {
            toValue: STEPS[1].progress,
            duration: 600,
            useNativeDriver: false,
          }).start();
        } else if (data.status === 'completed') {
          setStepIndex(2);
          Animated.timing(progressAnim, {
            toValue: STEPS[2].progress,
            duration: 600,
            useNativeDriver: false,
          }).start();
          clearInterval(intervalId);
          // Small delay before redirecting to show complete bar
          setTimeout(() => {
            router.replace({ pathname: '/detail', params: { id } });
          }, 1000);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setErrorMsg(data.error_message || "Lecture processing failed in backend pipeline.");
        }
      } catch (err: any) {
        logError(err, 'ProcessingScreen/checkStatus');
        console.error("Polling error: ", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [id]);

  if (errorMsg) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <View style={styles.center}>
          <View style={[styles.orb, { backgroundColor: C.errorContainer, shadowColor: C.error, marginBottom: 24 }]}>
            <Ionicons name="alert-circle-outline" size={48} color={C.error} />
          </View>
          <Text style={[styles.headline, { color: C.error }]}>Processing Failed</Text>
          <Text style={[styles.subtext, { color: C.onSurfaceVariant, marginBottom: 32 }]}>{errorMsg}</Text>
          
          <TouchableOpacity
            style={[styles.stepRow, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant, width: 200, justifyContent: 'center' }]}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={C.primary} />
            <Text style={[styles.stepLabel, { color: C.primary, fontWeight: '700' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const step = STEPS[stepIndex] || STEPS[0];
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.35] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>

      {/* Background blobs */}
      <View style={[styles.blob1, { backgroundColor: C.secondary + '14' }]} />
      <View style={[styles.blob2, { backgroundColor: C.tertiaryFixedDim + '18' }]} />

      <View style={styles.center}>
        {/* Orb with rings */}
        <View style={styles.orbWrap}>
          <Animated.View style={[styles.ring, { width: 260, height: 260, borderRadius: 130, backgroundColor: C.secondary, transform: [{ scale: ring3 }], opacity: ring3Op }]} />
          <Animated.View style={[styles.ring, { width: 210, height: 210, borderRadius: 105, backgroundColor: C.secondary, transform: [{ scale: ring2 }], opacity: ring2Op }]} />
          <Animated.View style={[styles.ring, { width: 160, height: 160, borderRadius: 80, backgroundColor: C.secondary, transform: [{ scale: ring1 }], opacity: ring1Op }]} />

          {/* Core orb */}
          <View style={[styles.orb, { backgroundColor: C.secondary, shadowColor: C.secondary }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 60, backgroundColor: '#FFFFFF', opacity: shimmerOpacity }]} />
            <MaterialIcons name="auto-awesome" size={48} color="#FFFFFF" />
          </View>
        </View>

        {/* Text */}
        <Text style={[styles.headline, { color: C.primary }]}>{step.headline}</Text>
        <Text style={[styles.subtext, { color: C.onSurfaceVariant }]}>{step.subtext}</Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: C.surfaceContainerHighest }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.secondary, width: progressWidth }]} />
        </View>

        {/* Steps */}
        <View style={styles.stepsList}>
          {STEP_LABELS.map((label, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            const pending = i > stepIndex;
            return (
              <View
                key={label}
                style={[
                  styles.stepRow,
                  { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant + '88', opacity: pending ? 0.45 : 1 },
                ]}>
                {done && <Ionicons name="checkmark-circle" size={20} color={C.secondary} />}
                {active && <MaterialIcons name="pending" size={20} color={C.secondary} />}
                {pending && <Ionicons name="ellipse-outline" size={20} color={C.outline} />}
                <Text style={[styles.stepLabel, { color: C.onSurface }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blob1: { position: 'absolute', top: '8%', left: '5%', width: 280, height: 280, borderRadius: 140 },
  blob2: { position: 'absolute', bottom: '15%', right: '3%', width: 320, height: 320, borderRadius: 160 },
  center: { alignItems: 'center', paddingHorizontal: 32 },
  orbWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring: { position: 'absolute' },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  headline: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center', marginBottom: 10 },
  subtext: { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 280, marginBottom: 24 },
  progressTrack: { width: 240, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', borderRadius: 3 },
  stepsList: { gap: 10, width: '100%' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stepLabel: { fontSize: 13, fontWeight: '600' },
});
