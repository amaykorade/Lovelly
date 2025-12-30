import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { colors, spacing, borderRadius, typography } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

export function LandingScreen({ navigation }: Props) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ backgroundColor: colors.primary.warmWhite }}
    >
      <View className="flex-1 justify-center items-center px-6 py-10">
        {/* Logo + App Name */}
        <View className="items-center mb-8">
          <View 
            className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary.softRose }}
          >
            <Text className="text-4xl">💕</Text>
          </View>
          <Text 
            className="text-center"
            style={{
              fontSize: fontSize(typography.sizes.h1),
              fontWeight: typography.weights.bold,
              color: colors.secondary.charcoalGray,
              marginBottom: spacing.sm,
            }}
          >
            Couple Connect
          </Text>
          <Text
            className="text-center"
            style={{
              fontSize: fontSize(typography.sizes.h3),
              fontWeight: typography.weights.regular,
              color: colors.status.offline,
              lineHeight: typography.sizes.h3 * typography.lineHeights.normal,
            }}
          >
            Connect with your love{"\n"}in real-time
          </Text>
        </View>

        {/* Feature Highlights */}
        <View 
          className="rounded-3xl p-6 mb-8 border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: colors.secondary.lightGray,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
            width: "100%",
          }}
        >
          <View className="gap-4">
            {/* Feature 1: Location */}
            <View className="flex-row items-center gap-4">
              <View 
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.primary.dustyPink }}
              >
                <Text className="text-2xl">📍</Text>
              </View>
              <View className="flex-1">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                  }}
                >
                  Share Location
                </Text>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.small),
                    color: colors.status.offline,
                    marginTop: spacing.tiny,
                  }}
                >
                  See where your partner is in real-time
                </Text>
              </View>
            </View>

            {/* Feature 2: Messages */}
            <View className="flex-row items-center gap-4">
              <View 
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.primary.dustyPink }}
              >
                <Text className="text-2xl">💬</Text>
              </View>
              <View className="flex-1">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                  }}
                >
                  Message Anytime
                </Text>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.small),
                    color: colors.status.offline,
                    marginTop: spacing.tiny,
                  }}
                >
                  Private chat just for the two of you
                </Text>
              </View>
            </View>

            {/* Feature 3: Drawing */}
            <View className="flex-row items-center gap-4">
              <View 
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.primary.dustyPink }}
              >
                <Text className="text-2xl">🎨</Text>
              </View>
              <View className="flex-1">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                  }}
                >
                  Draw Together
                </Text>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.small),
                    color: colors.status.offline,
                    marginTop: spacing.tiny,
                  }}
                >
                  Create art together on a shared canvas
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <View className="w-full gap-3">
          <Pressable
            className="rounded-2xl py-4 px-6 items-center justify-center"
            style={{
              backgroundColor: colors.primary.softRose,
              shadowColor: colors.primary.softRose,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.bold,
                color: "#FFFFFF",
              }}
            >
              Get Started
            </Text>
          </Pressable>

          <Pressable
            className="rounded-2xl py-4 px-6 items-center justify-center border-2"
            style={{
              backgroundColor: colors.primary.dustyPink,
              borderColor: colors.primary.softRose,
            }}
            onPress={() => navigation.navigate("Login")}
          >
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.semibold,
                color: colors.secondary.charcoalGray,
              }}
            >
              Login
            </Text>
          </Pressable>
        </View>

        {/* Decorative hearts */}
        <View className="absolute top-20 right-8 opacity-20">
          <Text className="text-6xl">💕</Text>
        </View>
        <View className="absolute bottom-32 left-8 opacity-20">
          <Text className="text-5xl">💖</Text>
        </View>
      </View>
    </ScrollView>
  );
}

