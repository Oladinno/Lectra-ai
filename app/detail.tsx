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
  TextInput,
  Alert,
  Modal,
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
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'transcript' | 'summary' | 'notes' | 'flashcards' | 'quiz';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
  { key: 'summary', label: 'Summary', icon: 'list-outline' },
  { key: 'notes', label: 'Notes', icon: 'create-outline' },
  { key: 'flashcards', label: 'Flashcards', icon: 'albums-outline' },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
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
// Quiz Card Component
// ─────────────────────────────────────────────────────────────────────────────
function QuizCard({
  question,
  options,
  correctIndex,
  questionNum,
  C,
  onAnswer,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  questionNum: number;
  C: typeof Colors['light'];
  onAnswer: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(idx: number) {
    if (selected !== null) return; // already answered
    setSelected(idx);
    onAnswer(idx === correctIndex);
  }

  function getOptionStyle(idx: number) {
    if (selected === null) return { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant };
    if (idx === correctIndex) return { backgroundColor: '#dcfce7', borderColor: '#16a34a' };
    if (idx === selected && idx !== correctIndex) return { backgroundColor: '#fee2e2', borderColor: '#dc2626' };
    return { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant };
  }

  function getOptionTextColor(idx: number) {
    if (selected === null) return C.onSurface;
    if (idx === correctIndex) return '#15803d';
    if (idx === selected && idx !== correctIndex) return '#dc2626';
    return C.onSurfaceVariant;
  }

  return (
    <View style={[styles.quizCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant }]}>
      <Text style={[styles.quizNum, { color: C.outline }]}>Q{questionNum}</Text>
      <Text style={[styles.quizQuestion, { color: C.primary }]}>{question}</Text>
      <View style={styles.quizOptions}>
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.quizOption, getOptionStyle(idx)]}
            onPress={() => handleSelect(idx)}
            activeOpacity={0.8}
          >
            <View style={[styles.quizOptionBullet, { borderColor: selected !== null && idx === correctIndex ? '#16a34a' : selected === idx && idx !== correctIndex ? '#dc2626' : C.outline }]}>
              {selected !== null && idx === correctIndex && <Ionicons name="checkmark" size={12} color="#16a34a" />}
              {selected !== null && idx === selected && idx !== correctIndex && <Ionicons name="close" size={12} color="#dc2626" />}
            </View>
            <Text style={[styles.quizOptionText, { color: getOptionTextColor(idx) }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected !== null && (
        <View style={[styles.quizResult, { backgroundColor: selected === correctIndex ? '#dcfce7' : '#fee2e2' }]}>
          <Ionicons
            name={selected === correctIndex ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={selected === correctIndex ? '#16a34a' : '#dc2626'}
          />
          <Text style={[styles.quizResultText, { color: selected === correctIndex ? '#15803d' : '#dc2626' }]}>
            {selected === correctIndex ? 'Correct!' : `Incorrect. Answer: ${options[correctIndex]}`}
          </Text>
        </View>
      )}
    </View>
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

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : undefined);
  const playerStatus = useAudioPlayerStatus(player);
  const [audioLoading, setAudioLoading] = useState(false);

  const isPlaying = playerStatus?.playing ?? false;
  const audioPosition = Math.round((playerStatus?.currentTime ?? 0) * 1000);
  const audioDuration = Math.round((playerStatus?.duration ?? 0) * 1000);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Quiz score state
  const [quizAnswered, setQuizAnswered] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const fetchLecture = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/lectures/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLecture(data);
          setEditTitle(data.title || '');
        } else {
          console.warn("Failed to fetch lecture data: status " + response.status);
        }
      } catch (error) {
        logError(error, `DetailScreen/fetchLecture/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchLecture();
    return () => {
      player.release();
    };
  }, [id]);

  // ── Audio playback ──────────────────────────────────────────────────────────
  async function toggleAudio() {
    if (!lecture?.audio_url) return;
    try {
      if (!audioUrl) {
        // First play: set source and begin playback
        setAudioLoading(true);
        await setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        setAudioUrl(lecture.audio_url);
        setAudioLoading(false);
        // Player starts loading; play when ready via useEffect
      } else {
        if (isPlaying) {
          player.pause();
        } else {
          player.play();
        }
      }
    } catch (err) {
      setAudioLoading(false);
      logError(err, 'DetailScreen/toggleAudio');
    }
  }

  // Auto-play once player is loaded from URL
  useEffect(() => {
    if (audioUrl && playerStatus?.isLoaded && !isPlaying) {
      player.play();
    }
  }, [audioUrl, playerStatus?.isLoaded]);

  function formatMs(ms: number) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Save edits ──────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lectures/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLecture(updated);
        setEditMode(false);
      } else {
        Alert.alert('Error', 'Failed to save changes.');
      }
    } catch (err) {
      logError(err, 'DetailScreen/handleSaveEdit');
      Alert.alert('Error', 'Network error while saving.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete lecture ──────────────────────────────────────────────────────────
  function handleDelete() {
    Alert.alert(
      'Delete Lecture',
      `Are you sure you want to permanently delete "${lecture?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await soundRef.current?.unloadAsync();
              const res = await fetch(`${API_BASE_URL}/api/lectures/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (res.ok) {
                router.replace('/(tabs)');
              } else {
                Alert.alert('Error', 'Failed to delete lecture.');
              }
            } catch (err) {
              logError(err, 'DetailScreen/handleDelete');
            }
          },
        },
      ]
    );
  }

  // ── Export helpers ──────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!lecture) return;
    const notesHtml = (lecture.notes || []).map((sec: any) =>
      `<h3>${sec.title}</h3><ul>${(sec.bullets || []).map((b: string) => `<li>${b}</li>`).join('')}</ul>`
    ).join('');
    const summaryHtml = (lecture.summary || []).map((p: string) => `<li>${p}</li>`).join('');
    const html = `
      <html><body style="font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:auto">
        <h1>${lecture.title}</h1>
        <p><em>${new Date(lecture.created_at).toLocaleDateString()} · ${lecture.duration || ''} · ${lecture.accuracy || ''}</em></p>
        <h2>Summary</h2><ul>${summaryHtml}</ul>
        <h2>Study Notes</h2>${notesHtml}
        <h2>Flashcards</h2>
        ${(lecture.flashcards || []).map((fc: any, i: number) => `<p><strong>Q${i+1}. ${fc.q}</strong><br/>${fc.a}</p>`).join('')}
      </body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${lecture.title} — LecVoice AI` });
    } catch (err) {
      logError(err, 'DetailScreen/exportPDF');
      Alert.alert('Export Error', 'Could not generate PDF.');
    }
  }

  async function exportMarkdown() {
    if (!lecture) return;
    const md = [
      `# ${lecture.title}`,
      `> ${new Date(lecture.created_at).toLocaleDateString()} · ${lecture.duration || ''} · ${lecture.accuracy || ''}`,
      '',
      '## Summary',
      ...(lecture.summary || []).map((p: string) => `- ${p}`),
      '',
      '## Notes',
      ...(lecture.notes || []).flatMap((sec: any) => [`### ${sec.title}`, ...(sec.bullets || []).map((b: string) => `- ${b}`), '']),
      '## Flashcards',
      ...(lecture.flashcards || []).map((fc: any, i: number) => `**Q${i+1}.** ${fc.q}\n**A:** ${fc.a}\n`),
    ].join('\n');

    const filename = `${lecture.title.replace(/[^a-z0-9]/gi, '_')}_LecVoice_AI.md`;
    const tempUri = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(tempUri, md, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(tempUri, { mimeType: 'text/markdown', dialogTitle: `${lecture.title} — Markdown` });
    } catch (err) {
      logError(err, 'DetailScreen/exportMarkdown');
      Alert.alert('Export Error', 'Could not export Markdown.');
    }
  }

  async function exportAnkiCSV() {
    if (!lecture) return;
    const csvRows = ['Front,Back', ...(lecture.flashcards || []).map((fc: any) => `"${fc.q.replace(/"/g, '""')}","${fc.a.replace(/"/g, '""')}"`)];
    const csv = csvRows.join('\n');
    const filename = `${lecture.title.replace(/[^a-z0-9]/gi, '_')}_Anki.csv`;
    const tempUri = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(tempUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(tempUri, { mimeType: 'text/csv', dialogTitle: `${lecture.title} — Anki CSV` });
    } catch (err) {
      logError(err, 'DetailScreen/exportAnkiCSV');
      Alert.alert('Export Error', 'Could not export CSV.');
    }
  }

  function showExportOptions() {
    Alert.alert(
      'Export Study Materials',
      'Choose an export format:',
      [
        { text: 'PDF (Summary + Notes)', onPress: exportPDF },
        { text: 'Markdown (.md)', onPress: exportMarkdown },
        { text: 'Anki Flashcards (.csv)', onPress: exportAnkiCSV },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function handleShare() {
    Share.share({ message: `${lecture?.title || 'Lecture'} — Transcript, Summary & Notes from LecVoice AI` });
  }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.secondary} />
        <Text style={{ marginTop: 12, color: C.onSurfaceVariant, fontSize: 14 }}>Loading lecture details...</Text>
      </View>
    );
  }

  const title = lecture?.title || 'Untitled Lecture';
  const duration = lecture?.duration || '—';
  const accuracy = lecture?.accuracy || '—';
  const createdDate = lecture?.created_at
    ? new Date(lecture.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const metaText = `${createdDate} · ${duration} · ${accuracy}`;

  const transcriptData = lecture?.transcript || [];
  const summaryData = lecture?.summary || [];
  const notesData = lecture?.notes || [];
  const flashcardsData = lecture?.flashcards || [];
  const quizData = lecture?.quiz || [];

  const progressPct = audioDuration > 0 ? Math.round((audioPosition / audioDuration) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* App Bar */}
      <View style={[styles.appBar, { backgroundColor: C.surface, paddingTop: insets.top + 12, height: 72 + insets.top + 12 }]}>
        <TouchableOpacity onPress={() => { soundRef.current?.unloadAsync(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {editMode ? (
            <TextInput
              style={[styles.editTitleInput, { color: C.primary, borderColor: C.secondary }]}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />
          ) : (
            <>
              <Text style={[styles.appBarTitle, { color: C.primary }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.appBarSub, { color: C.onSurfaceVariant }]}>{metaText}</Text>
            </>
          )}
        </View>
        {/* Action buttons */}
        <View style={styles.appBarActions}>
          {editMode ? (
            <>
              <TouchableOpacity onPress={() => setEditMode(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={22} color={C.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={styles.iconBtn} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={C.secondary} /> : <Ionicons name="checkmark" size={22} color={C.secondary} />}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setEditMode(true)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={20} color={C.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity onPress={showExportOptions} style={styles.iconBtn}>
                <Ionicons name="share-outline" size={20} color={C.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={C.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Audio Player */}
      {lecture?.audio_url && (
        <View style={[styles.audioPlayer, { backgroundColor: C.surfaceContainerLowest, borderBottomColor: C.outlineVariant }]}>
          <TouchableOpacity style={[styles.audioPlayBtn, { backgroundColor: C.secondary }]} onPress={toggleAudio} disabled={audioLoading}>
            {audioLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            }
          </TouchableOpacity>
          <View style={styles.audioTrack}>
            <View style={[styles.audioTrackBg, { backgroundColor: C.outlineVariant }]}>
              <View style={[styles.audioTrackFill, { backgroundColor: C.secondary, width: `${progressPct}%` }]} />
            </View>
            <View style={styles.audioTimestamps}>
              <Text style={[styles.audioTime, { color: C.onSurfaceVariant }]}>{formatMs(audioPosition)}</Text>
              <Text style={[styles.audioTime, { color: C.onSurfaceVariant }]}>{formatMs(audioDuration)}</Text>
            </View>
          </View>
        </View>
      )}

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
              <Ionicons name={tab.icon as any} size={16} color={active ? C.secondary : C.onSurfaceVariant} />
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
            {transcriptData.length === 0
              ? <Text style={{ color: C.onSurfaceVariant, textAlign: 'center', marginTop: 40 }}>No transcript available yet.</Text>
              : transcriptData.map((para: any, i: number) => (
                <View key={i} style={styles.transcriptPara}>
                  <Text style={[styles.timestamp, { color: C.secondary }]}>{para.time}</Text>
                  <Text style={[styles.transcriptText, { color: C.onSurface }]}>{para.text}</Text>
                </View>
              ))
            }
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
            {summaryData.map((point: string, i: number) => (
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
            {notesData.map((sec: any, si: number) => (
              <View key={si} style={styles.notesBlock}>
                <View style={styles.notesSectionHeader}>
                  <View style={[styles.notesSectionDot, { backgroundColor: C.secondary }]} />
                  <Text style={[styles.notesSectionTitle, { color: C.primary }]}>{sec.title}</Text>
                </View>
                {(sec.bullets || []).map((bullet: string, bi: number) => (
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
            {flashcardsData.map((card: any, i: number) => (
              <View key={i} style={styles.flashCardWrap}>
                <Text style={[styles.flashCardNum, { color: C.outline }]}>#{i + 1}</Text>
                <FlipCard question={card.q} answer={card.a} C={C} />
              </View>
            ))}
          </View>
        )}

        {/* ── QUIZ ───────────────────────────────────────── */}
        {activeTab === 'quiz' && (
          <View style={styles.section}>
            {/* Score Banner */}
            <View style={[styles.quizScoreBanner, { backgroundColor: C.primaryContainer }]}>
              <MaterialIcons name="quiz" size={20} color={C.onPrimaryContainer} />
              <Text style={[styles.quizScoreText, { color: C.onPrimaryContainer }]}>
                {quizAnswered === 0
                  ? `${quizData.length} questions · Select the correct answer`
                  : `Score: ${quizCorrect} / ${quizAnswered} answered`}
              </Text>
            </View>
            {quizData.length === 0 ? (
              <Text style={{ color: C.onSurfaceVariant, textAlign: 'center', marginTop: 20 }}>
                Quiz not available yet.
              </Text>
            ) : (
              quizData.map((q: any, i: number) => (
                <QuizCard
                  key={i}
                  question={q.question}
                  options={q.options}
                  correctIndex={q.correct_answer_index}
                  questionNum={i + 1}
                  C={C}
                  onAnswer={(correct) => {
                    setQuizAnswered((prev) => prev + 1);
                    if (correct) setQuizCorrect((prev) => prev + 1);
                  }}
                />
              ))
            )}
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
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: { padding: 4 },
  appBarTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  appBarSub: { fontSize: 11, marginTop: 1 },
  editTitleInput: {
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 38,
  },
  appBarActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 8 },

  // Audio Player
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTrack: { flex: 1 },
  audioTrackBg: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  audioTrackFill: { height: '100%', borderRadius: 2 },
  audioTimestamps: { flexDirection: 'row', justifyContent: 'space-between' },
  audioTime: { fontSize: 10, fontWeight: '600' },

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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
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
  flipCardContainer: { height: 180, width: '100%' },
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

  // Quiz
  quizScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  quizScoreText: { fontSize: 13, fontWeight: '600', flex: 1 },
  quizCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quizNum: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  quizQuestion: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  quizOptions: { gap: 8 },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  quizOptionBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizOptionText: { flex: 1, fontSize: 13, lineHeight: 18 },
  quizResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  quizResultText: { fontSize: 12, fontWeight: '700', flex: 1 },
});
