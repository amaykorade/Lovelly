import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/designSystem';
import { wp, hp, fontSize } from '../../lib/responsive';

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const tabs: TabItem[] = [
  { name: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'Pairing', label: 'Match', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'Messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'Settings', label: 'Account', icon: 'person-outline', iconActive: 'person' },
];

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Split tabs into left and right groups for logo in center
  const leftTabs = tabs.slice(0, 2); // Home, Match
  const rightTabs = tabs.slice(2); // Messages, Account

  const renderTab = (tab: TabItem) => {
    const route = state.routes.find(r => r.name === tab.name);
    if (!route) return null;
    
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.findIndex(r => r.name === tab.name);
    const iconName = isFocused ? tab.iconActive : tab.icon;

    return (
      <Pressable
        key={tab.name}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            // Always navigate, even if already focused (matches top button behavior)
            navigation.navigate(route.name);
          }
        }}
        style={({ pressed }) => [
          styles.tab,
          pressed && styles.tabPressed,
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={fontSize(26)}
            color={isFocused ? colors.text.primary : '#9E9E9E'}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, hp(spacing.sm)),
          paddingTop: hp(spacing.sm),
        },
      ]}
    >
      {/* Left tabs */}
      <View style={styles.tabsGroup}>
        {leftTabs.map(renderTab)}
      </View>

      {/* Center Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>💕</Text>
        </View>
      </View>

      {/* Right tabs */}
      <View style={styles.tabsGroup}>
        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.secondary.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(spacing.xs),
    paddingHorizontal: wp(spacing.sm),
    minHeight: hp(60),
    minWidth: wp(60),
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: wp(72), // Fixed width to match logo size + padding
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: wp(56),
    height: wp(56),
    borderRadius: wp(28),
    backgroundColor: colors.primary.softRose,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.rose,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: fontSize(28),
  },
});
