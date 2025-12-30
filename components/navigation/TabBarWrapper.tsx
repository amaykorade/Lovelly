import React from 'react';
import { useNavigationState } from '@react-navigation/native';
import { BottomTabBar } from './BottomTabBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Screens where tab bar should be shown
const TAB_BAR_ROUTES = ['Home', 'Pairing', 'Messages', 'Settings'];

export function TabBarWrapper(props: BottomTabBarProps) {
  // Get the root navigation state to check current route
  const navigationState = useNavigationState(state => {
    // Navigate up to find the root state
    let current = state;
    while (current?.routes?.[current.index]?.state) {
      current = current.routes[current.index].state as any;
    }
    return current;
  });
  
  // Get current route name from root state
  const getCurrentRouteName = (navState: any): string | null => {
    if (!navState || !navState.routes) return null;
    const route = navState.routes[navState.index];
    if (route.state) {
      return getCurrentRouteName(route.state);
    }
    return route.name;
  };

  const currentRoute = getCurrentRouteName(navigationState);
  const shouldShow = currentRoute && TAB_BAR_ROUTES.includes(currentRoute);

  if (!shouldShow) {
    return null;
  }

  return <BottomTabBar {...props} />;
}
