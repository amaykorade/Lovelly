import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/designSystem';

interface SafeAreaProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  style?: any;
}

export function SafeArea({ 
  children, 
  edges = ['top', 'bottom'], 
  backgroundColor = colors.primary.warmWhite,
  style 
}: SafeAreaProps) {
  return (
    <SafeAreaView 
      edges={edges} 
      style={[styles.container, { backgroundColor }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

