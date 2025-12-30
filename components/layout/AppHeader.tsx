import React from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "../../theme/designSystem";

interface Props {
  title?: string;
  onAccountPress?: () => void;
  userInitial?: string | null;
}

export function AppHeader({ title = "Lovelly", onAccountPress, userInitial }: Props) {
  const initial = (userInitial || "U").toUpperCase().charAt(0);

  return (
    <View className="w-full flex-row items-center justify-between mb-6">
      <View className="flex-row items-center gap-2">
        <View 
          className="w-9 h-9 rounded-2xl items-center justify-center"
          style={{ backgroundColor: colors.primary.softRose }}
        >
          <Text className="text-xs font-bold tracking-[0.15em]" style={{ color: "#FFFFFF" }}>LV</Text>
        </View>
        <View>
          <Text className="text-xs tracking-[0.25em] uppercase" style={{ color: colors.primary.softRose }}>
            LOVELLY
          </Text>
          {title ? (
            <Text className="text-xs mt-0.5" style={{ color: colors.status.offline }}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={onAccountPress}
        className="w-9 h-9 rounded-full border-2 items-center justify-center"
        style={{ 
          borderColor: colors.primary.softRose,
          backgroundColor: colors.primary.dustyPink,
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: colors.primary.softRose }}>
          {initial}
        </Text>
      </Pressable>
    </View>
  );
}


