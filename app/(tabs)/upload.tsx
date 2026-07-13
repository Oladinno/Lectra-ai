import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL } from '@/constants/api';

const RECENT_UPLOADS = [
  {
    id: '1',
    title: 'Microeconomics L04',
    meta: 'Oct 24 · 45:12',
    status: 'Processed',
  },
  {
    id: '2',
    title: 'Advanced Calculus - Series',
    meta: 'Oct 22 · 58:30',
    status: 'Processed',
  },
  {
    id: '3',
    title: 'Organic Chemistry 3',
    meta: 'Oct 20 · 1:02:14',
    status: 'Processed',
  },
];

export default function UploadScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [activeUploadXHR, setActiveUploadXHR] = useState<XMLHttpRequest | null>(null);

  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setFileName(file.name);
      setUploading(true);
      setProgress(0);
      progressWidth.value = 0;

      const formData = new FormData();
      
      // Setup file structure for react native upload
      const fileUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
      formData.append('file', {
        uri: fileUri,
        name: file.name || 'lecture.m4a',
        type: file.mimeType || 'audio/x-m4a',
      } as any);

      const defaultTitle = file.name ? file.name.replace(/\.[^/.]+$/, "") : 'Untitled Lecture';
      formData.append('title', defaultTitle);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      setActiveUploadXHR(xhr);

      // Track actual upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const p = Math.round((event.loaded / event.total) * 100);
          setProgress(p);
          progressWidth.value = withTiming(p, { duration: 150 });
        }
      });

      xhr.onload = () => {
        setUploading(false);
        setActiveUploadXHR(null);
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          // Navigate to processing screen, passing the database lecture ID
          router.push({ pathname: '/processing', params: { id: response.id } });
        } else {
          Alert.alert("Upload Failed", `Server returned status ${xhr.status}: ${xhr.responseText}`);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setActiveUploadXHR(null);
        Alert.alert("Upload Error", "An error occurred connecting to the backend server.");
      };

      xhr.send(formData);
    } catch (error: any) {
      setUploading(false);
      Alert.alert("Error", error.message || "Failed to pick file");
    }
  }

  function handleCancelUpload() {
    if (activeUploadXHR) {
      activeUploadXHR.abort();
      setActiveUploadXHR(null);
    }
    setUploading(false);
    setProgress(0);
    progressWidth.value = 0;
  }


  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* App Bar */}
      <View style={[styles.appBar, { backgroundColor: C.surface }]}>
        <Text style={[styles.appBarTitle, { color: C.primary }]}>Upload Lecture</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero text */}
        <Text style={[styles.heroSub, { color: C.onSurfaceVariant }]}>
          Transform your audio recordings into structured academic insights.
        </Text>

        {/* Drop Zone */}
        <TouchableOpacity
          style={[styles.dropZone, { borderColor: uploading ? C.secondary : C.outlineVariant, backgroundColor: C.surfaceContainerLowest }]}
          onPress={handlePickFile}
          activeOpacity={0.85}>
          <View style={[styles.iconCircle, { backgroundColor: C.secondary + '18' }]}>
            <MaterialIcons name="cloud-upload" size={48} color={C.secondary} />
          </View>
          <Text style={[styles.dropTitle, { color: C.primary }]}>Tap to choose a recording</Text>
          <Text style={[styles.dropSub, { color: C.onSurfaceVariant }]}>
            Supported formats: .mp3, .wav, .m4a (Max 100MB)
          </Text>
          <View style={[styles.chooseBtn, { backgroundColor: C.primary }]}>
            <Text style={[styles.chooseBtnText, { color: C.onPrimary }]}>Choose File</Text>
          </View>
        </TouchableOpacity>

        {/* Upload progress */}
        {uploading && (
          <View style={[styles.progressCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.secondary }]}>
            <View style={styles.progressTop}>
              <View style={styles.progressLeft}>
                <MaterialIcons name="audio-file" size={22} color={C.secondary} />
                <Text style={[styles.progressFileName, { color: C.primary }]} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>
              <Text style={[styles.progressPercent, { color: C.secondary }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceContainerHighest }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: C.secondary }, progressStyle]} />
            </View>
            <View style={styles.progressBottom}>
              <View style={styles.progressStatusRow}>
                <Ionicons name="sync" size={14} color={C.onSurfaceVariant} />
                <Text style={[styles.progressStatus, { color: C.onSurfaceVariant }]}>
                  Analyzing audio quality…
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancelUpload}>
                <Text style={[styles.cancelText, { color: C.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tip chips */}
        <View style={styles.tipsGrid}>
          {[
            { icon: 'mic-outline' as const, title: 'Clear Audio', desc: 'Place device close to the speaker.' },
            { icon: 'timer-outline' as const, title: 'Up to 3h', desc: 'Upload up to 3 hours of content.' },
            { icon: 'flash-outline' as const, title: 'AI Ready', desc: 'Instant summary after upload.' },
          ].map((tip) => (
            <View key={tip.title} style={[styles.tipChip, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant }]}>
              <View style={[styles.tipIconBg, { backgroundColor: C.secondary + '18' }]}>
                <Ionicons name={tip.icon} size={18} color={C.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: C.primary }]}>{tip.title}</Text>
                <Text style={[styles.tipDesc, { color: C.onSurfaceVariant }]}>{tip.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Uploads */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>Recent Uploads</Text>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: C.secondary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.uploadList}>
            {RECENT_UPLOADS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.uploadItem,
                  { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => router.push('/detail')}
                android_ripple={{ color: C.surfaceContainer }}>
                <View style={[styles.uploadIcon, { backgroundColor: C.surfaceContainerHigh }]}>
                  <Ionicons name="document-text-outline" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uploadTitle, { color: C.primary }]}>{item.title}</Text>
                  <Text style={[styles.uploadMeta, { color: C.onSurfaceVariant }]}>{item.meta}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: C.tertiaryFixedDim + '44' }]}>
                  <Text style={[styles.badgeText, { color: C.onTertiaryFixedVariant }]}>{item.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.outline} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  heroSub: { fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: { fontSize: 17, fontWeight: '700' },
  dropSub: { fontSize: 13, textAlign: 'center' },
  chooseBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  chooseBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  progressFileName: { fontSize: 13, fontWeight: '600', flex: 1 },
  progressPercent: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressStatus: { fontSize: 12 },
  cancelText: { fontSize: 12, fontWeight: '700' },
  tipsGrid: { gap: 10, marginBottom: 28 },
  tipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  tipIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  tipDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  sectionLink: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  uploadList: { gap: 10 },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 13, fontWeight: '700' },
  uploadMeta: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
});
