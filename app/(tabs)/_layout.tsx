import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.secondary,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: C.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#031635',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.4,
          marginTop: 2,
        },
        tabBarIconStyle: { marginBottom: -2 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeChip, { backgroundColor: C.secondaryContainer + '33' }] : null}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeChip, { backgroundColor: C.secondaryContainer + '33' }] : null}>
              <Ionicons name={focused ? 'mic' : 'mic-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.uploadFab, { backgroundColor: C.secondary }]}>
              <MaterialIcons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeChip, { backgroundColor: C.secondaryContainer + '33' }] : null}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#4648d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
