import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATS = [
  { label: 'Lectures', value: '24' },
  { label: 'Hours Saved', value: '12.5h' },
  { label: 'Flashcards', value: '342' },
];

const SETTINGS = [
  { icon: 'notifications-outline' as const, label: 'Notifications' },
  { icon: 'language-outline' as const, label: 'Language' },
  { icon: 'moon-outline' as const, label: 'Dark Mode', toggle: true },
  { icon: 'cloud-download-outline' as const, label: 'Auto-Download Results' },
  { icon: 'shield-checkmark-outline' as const, label: 'Privacy Policy' },
  { icon: 'help-circle-outline' as const, label: 'Help & Support' },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.appBar, { backgroundColor: C.surface, paddingTop: insets.top + 16, height: 64 + insets.top + 16 }]}>
        <Text style={[styles.appBarTitle, { color: C.primary }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: C.primary }]}>
          <View style={[styles.avatarCircle, { backgroundColor: C.secondary }]}>
            <Ionicons name="person" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.profileName, { color: C.onPrimary }]}>Alex Johnson</Text>
          <Text style={[styles.profileEmail, { color: C.onPrimaryContainer }]}>alex.johnson@university.edu</Text>
          <View style={[styles.planBadge, { backgroundColor: C.secondary + '33' }]}>
            <MaterialIcons name="auto-awesome" size={14} color={C.secondaryFixedDim} />
            <Text style={[styles.planBadgeText, { color: C.secondaryFixedDim }]}>Pro Plan · 84% Credits</Text>
          </View>
          <View style={styles.heroGlow} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.surfaceContainer }]}>
              <Text style={[styles.statValue, { color: C.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: C.onSurfaceVariant }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={[styles.settingsCard, { backgroundColor: C.surfaceContainerLowest, borderColor: C.outlineVariant }]}>
          {SETTINGS.map((item, index) => (
            <React.Fragment key={item.label}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIconBg, { backgroundColor: C.secondary + '18' }]}>
                  <Ionicons name={item.icon} size={18} color={C.secondary} />
                </View>
                <Text style={[styles.settingLabel, { color: C.onSurface }]}>{item.label}</Text>
                <View style={styles.settingRight}>
                  {item.toggle ? (
                    <Switch
                      trackColor={{ false: C.outlineVariant, true: C.secondary }}
                      thumbColor={C.onPrimary}
                      value={false}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={C.outline} />
                  )}
                </View>
              </View>
              {index < SETTINGS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: C.outlineVariant }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={[styles.signOutBtn, { borderColor: C.error + '66' }]}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={[styles.signOutText, { color: C.error }]}>Sign Out</Text>
        </TouchableOpacity>

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
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  profileCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    right: -50,
    bottom: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(70,72,212,0.22)',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  profileName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, letterSpacing: 0.1 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  planBadgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#031635',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  settingRight: {},
  divider: { height: 1, marginHorizontal: 16, opacity: 0.5 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 8,
  },
  signOutText: { fontSize: 14, fontWeight: '700' },
});
