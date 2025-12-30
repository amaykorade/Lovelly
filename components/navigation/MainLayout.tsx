import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { BottomTabBar } from './BottomTabBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface MainLayoutProps {
  children: React.ReactNode;
  tabBarProps?: BottomTabBarProps;
}

// Screens where tab bar should be shown
const TAB_BAR_ROUTES = ['Home', 'Pairing', 'Messages', 'Settings'];

export function MainLayout({ children, tabBarProps }: MainLayoutProps) {
  const route = useRoute();
  const shouldShowTabBar = TAB_BAR_ROUTES.includes(route.name);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      {shouldShowTabBar && tabBarProps && <BottomTabBar {...tabBarProps} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

