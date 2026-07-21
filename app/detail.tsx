import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { logError } from '@/utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/context/auth';

const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'transcript' | 'summary' | 'notes' | 'flashcards';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
  { key: 'summary', label: 'Summary', icon: 'list-outline' },
  { key: 'notes', label: 'Notes', icon: 'create-outline' },
  { key: 'flashcards', label: 'Flashcards', icon: 'albums-outline' },
];

const TRANSCRIPT_PARAGRAPHS = [
  { time: '00:00', text: "Welcome to Computer Science 101. Today we're going to explore the fundamentals of algorithms and data structures — two of the most critical pillars in all of computer science." },
  { time: '02:15', text: "An algorithm is simply a sequence of well-defined instructions for solving a problem. The key properties we look for are correctness, efficiency, and clarity." },
  { time: '05:40', text: "Let's dive into Big-O notation. O(n) means the runtime grows linearly with input size. O(n²) signals a quadratic relationship — quite common in naive sorting algorithms such as bubble sort." },
  { time: '12:03', text: "Data structures are the containers we use to organise data. Arrays, linked lists, stacks, queues, trees, and graphs all carry different trade-offs in time and space complexity." },
  { time: '20:45', text: "Recursion is a technique where a function calls itself. It is the backbone of many elegant algorithms — think binary search, quicksort, and tree traversal." },
];

const SUMMARY_POINTS = [
  'Algorithms are finite instruction sets for solving problems, evaluated by correctness and efficiency.',
  'Big-O notation quantifies growth rate: O(1) constant, O(log n) logarithmic, O(n) linear, O(n²) quadratic.',
  'Core data structures covered: Arrays, Linked Lists, Stacks, Queues, Trees, and Graphs.',
  'Recursion enables elegant problem solving and underpins divide-and-conquer strategies.',
  'Time complexity and space complexity are always trade-offs — understanding both is key to engineering sound solutions.',
];

const NOTES_SECTIONS = [
  {
    title: 'Algorithms',
    bullets: [
      'Finite sequence of steps to solve a problem',
      'Evaluated via correctness, efficiency, and readability',
      'Examples: Sorting, searching, pathfinding',
    ],
  },
  {
    title: 'Big-O Complexity',
    bullets: [
      'O(1) — Constant: array index lookup',
      'O(log n) — Logarithmic: binary search',
      'O(n) — Linear: traversing a list',
      'O(n²) — Quadratic: bubble sort',
    ],
  },
  {
    title: 'Core Data Structures',
    bullets: [
      'Array: contiguous memory, O(1) access',
      'Linked List: dynamic size, O(n) search',
      'Stack: LIFO — used in undo and recursion',
      'Queue: FIFO — used in BFS',
      'Tree: hierarchical, enables O(log n) search (BST)',
    ],
  },
];

const FLASHCARDS = [
  { q: 'What is an algorithm?', a: 'A finite, ordered sequence of well-defined instructions for solving a problem.' },
  { q: 'What does O(n) mean?', a: 'The runtime grows linearly with the size of the input — doubling input doubles the time.' },
  { q: 'Define a Stack data structure.', a: 'A Last-In-First-Out (LIFO) structure. Push adds to the top; pop removes from the top.' },
  { q: 'What is recursion?', a: 'A technique where a function calls itself with a smaller sub-problem until reaching a base case.' },
  { q: 'What is the time complexity of binary search?', a: 'O(log n) — it halves the search space at each step, making it very efficient on sorted arrays.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// FlipCard Component
// ─────────────────────────────────────────────────────────────────────────────
function FlipCard({ question, answer, C }: { question: string; answer: string; C: typeof Colors['light'] }) {
  const flip = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);

  function handleFlip() {
    flip.value = withTiming(flipped ? 0 : 1, { duration: 500 });
    setFlipped(!flipped);
  }

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity: flip.value < 0.5 ? 1 : 0,
      position: 'absolute',
      width: '100%',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity: flip.value >= 0.5 ? 1 : 0,
      position: 'absolute',
      width: '100%',
    };
  });

  return (
    <Pressable onPress={handleFlip} style={styles.flipCardContainer}>
      {/* Front */}
      <Animated.View style={[styles.flipCardFace, { backgroundColor: C.primary }, frontStyle]}>
        <Text style={[styles.flipCardHint, { color: C.primaryFixedDim }]}>QUESTION</Text>
        <Text style={[styles.flipCardText, { color: C.onPrimary }]}>{question}</Text>
        <View style={[styles.flipTap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="sync-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.flipTapText}>Tap to reveal</Text>
        </View>
      </Animated.View>

      {/* Back */}
      <Animated.View style={[styles.flipCardFace, { backgroundColor: C.secondaryContainer }, backStyle]}>
        <Text style={[styles.flipCardHint, { color: C.primaryFixed }]}>ANSWER</Text>
        <Text style={[styles.flipCardText, { color: C.onSecondaryContainer }]}>{answer}</Text>
        <View style={[styles.flipTap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="sync-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.flipTapText}>Tap to flip back</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function DetailScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchLecture = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/lectures/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLecture(data);
        } else {
          console.warn("Failed to fetch lecture data: status " + response.status);
        }
      } catch (error) {
        logError(error, `DetailScreen/fetchLecture/${id}`);
        console.error("Error fetching lecture details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLecture();
  }, [id]);

  function handleShare() {
    const lectureTitle = lecture?.title || 'Computer Science 101';
    Share.share({ message: `${lectureTitle} — Transcript, Summary & Notes from LectureAI` });
  }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.secondary} />
        <Text style={{ marginTop: 12, color: C.onSurfaceVariant, fontSize: 14 }}>Loading lecture details...</Text>
      </View>
    );
  }

  const title = lecture?.title || 'Computer Science 101';
  const duration = lecture?.duration || '45 mins';
  const accuracy = lecture?.accuracy || '98% Accuracy';
  const createdDate = lecture?.created_at 
    ? new Date(lecture.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
    : 'Sept 12';
  
  const metaText = `${createdDate} · ${duration} · ${accuracy}`;

  const transcriptData = lecture?.transcript || TRANSCRIPT_PARAGRAPHS;
  const summaryData = lecture?.summary || SUMMARY_POINTS;
  const notesData = lecture?.notes || NOTES_SECTIONS;
  const flashcardsData = lecture?.flashcards || FLASHCARDS;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* App Bar */}
      <View style={[styles.appBar, { backgroundColor: C.surface, paddingTop: insets.top + 16, height: 72 + insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarTitle, { color: C.primary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.appBarSub, { color: C.onSurfaceVariant }]}>{metaText}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={C.secondary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabBar, { backgroundColor: C.surface }]}
        style={{ flexGrow: 0 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                active && { backgroundColor: C.secondary + '1A', borderBottomColor: C.secondary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}>
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={active ? C.secondary : C.onSurfaceVariant}
              />
              <Text style={[styles.tabLabel, { color: active ? C.secondary : C.onSurfaceVariant }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>


      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── TRANSCRIPT ────────────────────────────────── */}
        {activeTab === 'transcript' && (
          <View style={styles.section}>
            {transcriptData.map((para, i) => (
              <View key={i} style={styles.transcriptPara}>
                <Text style={[styles.timestamp, { color: C.secondary }]}>{para.time}</Text>
                <Text style={[styles.transcriptText, { color: C.onSurface }]}>{para.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── SUMMARY ────────────────────────────────────── */}
        {activeTab === 'summary' && (
          <View style={styles.section}>
            <View style={[styles.summaryHero, { backgroundColor: C.primaryContainer }]}>
              <MaterialIcons name="auto-awesome" size={22} color={C.onPrimaryContainer} />
              <Text style={[styles.summaryHeroText, { color: C.onPrimaryContainer }]}>
                AI-generated summary of {title}
              </Text>
            </View>
            {summaryData.map((point, i) => (
              <View key={i} style={[styles.summaryPoint, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant }]}>
                <View style={[styles.bulletDot, { backgroundColor: C.secondary }]} />
                <Text style={[styles.summaryText, { color: C.onSurface }]}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── NOTES ──────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <View style={styles.section}>
            {notesData.map((sec, si) => (
              <View key={si} style={styles.notesBlock}>
                <View style={styles.notesSectionHeader}>
                  <View style={[styles.notesSectionDot, { backgroundColor: C.secondary }]} />
                  <Text style={[styles.notesSectionTitle, { color: C.primary }]}>{sec.title}</Text>
                </View>
                {sec.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.noteBulletRow}>
                    <View style={[styles.noteBullet, { backgroundColor: C.outline }]} />
                    <Text style={[styles.noteBulletText, { color: C.onSurfaceVariant }]}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── FLASHCARDS ─────────────────────────────────── */}
        {activeTab === 'flashcards' && (
          <View style={styles.section}>
            <View style={styles.flashHeader}>
              <Text style={[styles.flashCount, { color: C.onSurfaceVariant }]}>
                {flashcardsData.length} cards · Tap to flip
              </Text>
            </View>
            {flashcardsData.map((card, i) => (
              <View key={i} style={styles.flashCardWrap}>
                <Text style={[styles.flashCardNum, { color: C.outline }]}>#{i + 1}</Text>
                <FlipCard question={card.q} answer={card.a} C={C} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: { padding: 4 },
  appBarTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  appBarSub: { fontSize: 12, marginTop: 1 },
  shareBtn: { padding: 8 },
  tabBar: {
    paddingHorizontal: 16,
    gap: 4,
    paddingBottom: 0,
    height: 52,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  section: { gap: 14 },

  // Transcript
  transcriptPara: { gap: 6 },
  timestamp: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  transcriptText: { fontSize: 15, lineHeight: 26 },

  // Summary
  summaryHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  summaryHeroText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  summaryPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  bulletDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 7 },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 22 },

  // Notes
  notesBlock: { gap: 8, marginBottom: 8 },
  notesSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  notesSectionDot: { width: 10, height: 10, borderRadius: 5 },
  notesSectionTitle: { fontSize: 16, fontWeight: '700' },
  noteBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 20 },
  noteBullet: { width: 5, height: 5, borderRadius: 2.5, marginTop: 9, opacity: 0.5 },
  noteBulletText: { flex: 1, fontSize: 14, lineHeight: 22 },

  // Flashcards
  flashHeader: { marginBottom: 4 },
  flashCount: { fontSize: 13, fontWeight: '600' },
  flashCardWrap: { gap: 4 },
  flashCardNum: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  flipCardContainer: {
    height: 180,
    width: '100%',
  },
  flipCardFace: {
    height: 180,
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    backfaceVisibility: 'hidden',
  },
  flipCardHint: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  flipCardText: { fontSize: 16, fontWeight: '600', lineHeight: 24, flex: 1, paddingVertical: 8 },
  flipTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  flipTapText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
