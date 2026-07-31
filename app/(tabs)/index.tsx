import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/context/auth';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { token, user } = useAuth();
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const completedLectures = lectures.filter((l: any) => l.status === 'completed');
  const totalFlashcards = completedLectures.reduce((sum: number, l: any) => sum + (l.flashcards?.length || 0), 0);
  const totalDurationSec = completedLectures.reduce((sum: number, l: any) => {
    if (!l.duration) return sum;
    const parts = l.duration.split(':').map(Number);
    return sum + (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]);
  }, 0);
  const hoursSaved = (totalDurationSec / 3600 * 2).toFixed(1);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchLectures = async () => {
        if (!token) return;
        try {
          const response = await fetch(`${API_BASE_URL}/api/lectures`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (active) {
              setLectures(data);
            }
          }
        } catch (error) {
          logError(error, 'Dashboard/fetchLectures');
        } finally {
          if (active) setLoading(false);
        }
      };

      fetchLectures();
      return () => {
        active = false;
      };
    }, [token])
  );

  const handlePressLecture = (item: any) => {
    if (item.status === 'pending' || item.status === 'processing') {
      router.push({ pathname: '/processing', params: { id: item.id } });
    } else if (item.status === 'failed') {
      Alert.alert("Processing Failed", item.error_message || "This lecture could not be processed.");
    } else {
      router.push({ pathname: '/detail', params: { id: item.id } });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* Top App Bar */}
      <View style={[styles.appBar, { backgroundColor: C.surface, paddingTop: insets.top + 16, height: 64 + insets.top + 16 }]}>
        <View style={styles.appBarLeft}>
          <Ionicons name="menu" size={26} color={C.primary} />
          <Text style={[styles.appBarTitle, { color: C.primary }]}>LecVoice AI</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: C.surfaceContainerHigh, borderColor: C.outlineVariant }]}>
          <Ionicons name="person" size={20} color={C.onSurfaceVariant} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Hero Welcome Card */}
        <View style={[styles.heroCard, { backgroundColor: C.primary }]}>
          <View>
            <Text style={[styles.heroLabel, { color: C.primaryFixedDim }]}>DASHBOARD</Text>
            <Text style={[styles.heroTitle, { color: C.onPrimary }]}>Welcome back, {user?.email?.split('@')[0] || 'Student'}!</Text>
            <Text style={[styles.heroSubtitle, { color: C.onPrimaryContainer }]}>
              You have {lectures.length} lecture{lectures.length !== 1 ? 's' : ''} processed.{'\n'}Ready for the next one?
            </Text>
          </View>
          {/* Decorative glow */}
          <View style={styles.heroGlow} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
            <MaterialIcons name="auto-awesome" size={22} color={C.secondary} />
            <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>Lectures</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>{completedLectures.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
            <Ionicons name="time-outline" size={22} color={C.secondary} />
            <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>Hours Saved</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>{hoursSaved}h</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
            <Ionicons name="layers-outline" size={22} color={C.secondary} />
            <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>Flashcards</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>{totalFlashcards}</Text>
          </View>
        </View>

        {/* Recent Transcripts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>Recent Transcripts</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={C.secondary} style={{ marginVertical: 20 }} />
          ) : lectures.length === 0 ? (
            <Text style={{ color: C.onSurfaceVariant, textAlign: 'center', marginTop: 10 }}>
              No lectures yet. Record or upload one to get started!
            </Text>
          ) : (
            <View style={styles.cardList}>
              {lectures.map((item) => {
                const isProcessing = item.status === 'pending' || item.status === 'processing';
                const isFailed = item.status === 'failed';

                const createdDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '';
                const parts: string[] = [createdDate];
                if (item.duration) parts.push(item.duration);
                if (item.accuracy && !isProcessing) parts.push(item.accuracy);
                const meta = parts.filter(Boolean).join(' · ');

                const accent = isFailed ? C.error : isProcessing ? C.secondary : C.tertiaryFixedDim;

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.transcriptCard,
                      { backgroundColor: C.surfaceContainerLowest, opacity: pressed ? 0.92 : 1 },
                    ]}
                    onPress={() => handlePressLecture(item)}
                    android_ripple={{ color: C.surfaceContainer }}>
                    <View style={[styles.indicator, { backgroundColor: accent }]} />
                    <View style={styles.transcriptInfo}>
                      <Text style={[styles.transcriptTitle, { color: C.primary }]} numberOfLines={1}>{item.title}</Text>
                      {meta ? <Text style={[styles.transcriptMeta, { color: C.onSurfaceVariant }]}>{meta}</Text> : null}
                    </View>

                    {isProcessing && (
                      <View style={[styles.badge, { backgroundColor: C.secondary + '18', marginRight: 6 }]}>
                        <ActivityIndicator size="small" color={C.secondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: C.secondary }]}>AI</Text>
                      </View>
                    )}
                    {isFailed && (
                      <View style={[styles.badge, { backgroundColor: C.error + '18', marginRight: 6 }]}>
                        <Text style={[styles.badgeText, { color: C.error }]}>Failed</Text>
                      </View>
                    )}

                    <Ionicons name="chevron-forward" size={20} color={C.outline} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>



        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appBarTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(70, 72, 212, 0.25)',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 260,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  cardList: { gap: 12 },
  transcriptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  indicator: { width: 4, height: 48, borderRadius: 2 },
  transcriptInfo: { flex: 1 },
  transcriptTitle: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  transcriptMeta: { fontSize: 13 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
