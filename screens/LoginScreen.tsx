import React, { useState } from "react";
import { View, Text, TextInput, Alert, Pressable, ScrollView } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../lib/firebase";
import Button from "../components/ui/button";
import { colors, spacing, borderRadius, typography } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      // Navigation will be handled by App.js based on auth state
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        Alert.alert(
          "Account not found",
          "We couldn't find an account with that email and password. Please check your details or sign up first."
        );
        return;
      }
      if (error.code === "auth/wrong-password") {
        Alert.alert("Wrong password", "The password doesn't match this account. Try again.");
        return;
      }

      Alert.alert("Login error", error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ backgroundColor: colors.primary.warmWhite }}
    >
      <View className="flex-1 px-6 py-10">
        {/* Back Button */}
        <Pressable
          onPress={() => navigation.goBack()}
          className="mb-6"
        >
          <Text className="text-base" style={{ color: colors.primary.softRose }}>
            ← Back
          </Text>
        </Pressable>

        {/* Header */}
        <View className="mb-8">
          <Text
            className="text-3xl font-extrabold"
            style={{ color: colors.secondary.charcoalGray }}
          >
            Welcome Back
          </Text>
          <Text
            className="text-sm mt-2"
            style={{ color: colors.status.offline }}
          >
            Sign in to continue your journey together
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          {/* Email */}
          <View>
            <Text className="mb-1 text-sm font-semibold" style={{ color: colors.secondary.charcoalGray }}>
              Email
            </Text>
            <TextInput
              className="rounded-2xl px-4 py-3 text-base border"
              style={{
                backgroundColor: colors.input.background,
                borderColor: colors.input.border,
                borderWidth: 2,
                color: colors.input.text,
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.input.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View>
            <Text className="mb-1 text-sm font-semibold" style={{ color: colors.secondary.charcoalGray }}>
              Password
            </Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 rounded-2xl px-4 py-3 text-base border"
                style={{
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  borderWidth: 2,
                  color: colors.input.text,
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.input.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4"
              >
                <Text className="text-lg">{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Remember Me Checkbox */}
          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
            className="flex-row items-center gap-3 mt-2"
          >
            <View
              className="w-5 h-5 rounded border-2 items-center justify-center"
              style={{
                borderColor: rememberMe ? colors.primary.softRose : colors.secondary.lightGray,
                backgroundColor: rememberMe ? colors.primary.softRose : "transparent",
              }}
            >
              {rememberMe && (
                <Text className="text-white text-xs">✓</Text>
              )}
            </View>
            <Text className="text-sm" style={{ color: colors.secondary.charcoalGray }}>
              Remember me
            </Text>
          </Pressable>
        </View>

        {/* Forgot Password Link */}
        <Pressable
          onPress={() => {
            Alert.alert(
              "Forgot Password",
              "Password reset feature coming soon. Please contact support if you need help.",
              [{ text: "OK" }]
            );
          }}
          className="mb-6"
        >
          <Text
            className="text-sm font-semibold text-right"
            style={{ color: colors.primary.softRose }}
          >
            Forgot Password?
          </Text>
        </Pressable>

        {/* Login Button */}
        <Button
          className="rounded-2xl py-4 items-center mb-4"
          style={{
            backgroundColor: colors.primary.softRose,
            shadowColor: colors.primary.softRose,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
          disabled={loading}
          onPress={handleLogin}
        >
          <Text
            style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </Text>
        </Button>

        {/* Sign Up Link */}
        <View className="flex-row justify-center">
          <Text className="text-sm" style={{ color: colors.status.offline }}>
            Don't have an account?{" "}
          </Text>
          <Pressable onPress={() => navigation.navigate("SignUp")}>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.primary.softRose }}
            >
              Sign Up
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

