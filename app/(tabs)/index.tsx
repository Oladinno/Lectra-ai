import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';

const RECENT_TRANSCRIPTS = [
  {
    id: '1',
    title: 'Computer Science 101',
    meta: 'Sept 12 · 45 mins · 98% Accuracy',
    accentColor: '#4648d4',
    status: 'completed',
  },
  {
    id: '2',
    title: 'History of Art',
    meta: 'Sept 11 · 52 mins · 95% Accuracy',
    accentColor: '#6063EE',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Macroeconomics 202',
    meta: 'Sept 10 · 38 mins · 99% Accuracy',
    accentColor: '#6BD8CB',
    status: 'completed',
  },
];

const QUICK_INSIGHTS = [
  {
    id: '1',
    label: 'Generate Flashcards for CS101',
    icon: 'help-circle-outline' as const,
    bg: '#6063EE',
    fg: '#FFFBFF',
  },
  {
    id: '2',
    label: 'Summarize Art History week 2',
    icon: 'document-text-outline' as const,
    bg: '#1A2B4B',
    fg: '#8293B8',
  },
  {
    id: '3',
    label: 'Connect Economics with History',
    icon: 'git-merge-outline' as const,
    bg: '#E6E8EA',
    fg: '#031635',
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];

  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchLectures = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/lectures`);
          if (response.ok) {
            const data = await response.json();
            if (active) {
              setLectures(data);
            }
          }
        } catch (error) {
          logError(error, 'Dashboard/fetchLectures');
          console.error("Error fetching lectures list:", error);
        } finally {
          if (active) setLoading(false);
        }
      };

      fetchLectures();
      return () => {
        active = false;
      };
    }, [])
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
      <View style={[styles.appBar, { backgroundColor: C.surface }]}>
        <View style={styles.appBarLeft}>
          <Ionicons name="menu" size={26} color={C.primary} />
          <Text style={[styles.appBarTitle, { color: C.primary }]}>LectureAI</Text>
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
            <Text style={[styles.heroTitle, { color: C.onPrimary }]}>Welcome back, Alex!</Text>
            <Text style={[styles.heroSubtitle, { color: C.onPrimaryContainer }]}>
              You have {lectures.length > 0 ? lectures.length : 3} lectures processed.{'\n'}Ready for the next one?
            </Text>
          </View>
          {/* Decorative glow */}
          <View style={styles.heroGlow} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
            <MaterialIcons name="auto-awesome" size={22} color={C.secondary} />
            <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>AI Credits</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>84%</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
            <Ionicons name="time-outline" size={22} color={C.secondary} />
            <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>Hours Saved</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>12.5h</Text>
          </View>
        </View>

        {/* Recent Transcripts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>Recent Transcripts</Text>
            {lectures.length === 0 && (
              <TouchableOpacity>
                <Text style={[styles.sectionLink, { color: C.secondary }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardList}>
            {(lectures.length > 0 ? lectures : RECENT_TRANSCRIPTS).map((item) => {
              const isProcessing = item.status === 'pending' || item.status === 'processing';
              const isFailed = item.status === 'failed';
              
              const createdDate = item.created_at 
                ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                : 'Sept 12';
              const duration = item.duration || (isProcessing ? 'Processing...' : '45 mins');
              const accuracy = item.accuracy || (isProcessing ? '' : '98% Accuracy');
              
              let meta = item.meta || `${createdDate} · ${duration}`;
              if (accuracy && !isProcessing) {
                meta += ` · ${accuracy}`;
              }

              const accent = item.accentColor || (isFailed ? C.error : isProcessing ? C.secondary : C.tertiaryFixedDim);

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
                    <Text style={[styles.transcriptMeta, { color: C.onSurfaceVariant }]}>{meta}</Text>
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
        </View>

        {/* Quick AI Insights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.primary }]}>Quick AI Insights</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightScroll}>
            {QUICK_INSIGHTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.insightCard, { backgroundColor: item.bg }]}
                activeOpacity={0.85}>
                <Ionicons name={item.icon} size={26} color={item.fg} />
                <Text style={[styles.insightLabel, { color: item.fg }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  sectionLink: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
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
  insightScroll: { paddingRight: 20, gap: 14 },
  insightCard: {
    width: 180,
    height: 120,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  insightLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, lineHeight: 18 },
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
