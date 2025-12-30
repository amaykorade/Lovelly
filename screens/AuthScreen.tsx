import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../lib/firebase";
import Button from "../components/ui/button";
import { colors } from "../theme/designSystem";

interface Props {
  navigation?: any;
  route?: any;
}

export function AuthScreen({ navigation, route }: Props) {
  // Get initial mode from route params, default to login
  const initialMode = route?.params?.mode || "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  // Update mode when route params change
  useEffect(() => {
    if (route?.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route?.params?.mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Google sign-in is disabled for now - focus on email/password
  // Can be enabled later when Google OAuth is properly configured
  const hasGoogleConfig = false;

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
    } catch (error: any) {
      console.error(error);

      if (mode === "login") {
        // Friendlier messages for login errors
        if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
          Alert.alert(
            "Account not found",
            "We couldn’t find an account with that email and password. Please check your details or sign up first."
          );
          return;
        }
        if (error.code === "auth/wrong-password") {
          Alert.alert("Wrong password", "The password doesn’t match this account. Try again.");
          return;
        }
      } else if (mode === "signup") {
        // Friendlier messages for signup errors
        if (error.code === "auth/email-already-in-use") {
          Alert.alert(
            "Email already used",
            "There is already an account with this email. Try logging in instead."
          );
          return;
        }
        if (error.code === "auth/weak-password") {
          Alert.alert("Weak password", "Please choose a stronger password (at least 6 characters).");
          return;
        }
      }

      Alert.alert("Auth error", error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 px-6 py-10" style={{ backgroundColor: colors.primary.warmWhite }}>
      <View className="flex-1 justify-center">
        <View className="mb-8">
          <Text className="text-xs tracking-[0.2em] uppercase" style={{ color: colors.primary.softRose }}>
            LOVELLY
          </Text>
          <Text className="text-4xl font-extrabold mt-2" style={{ color: colors.secondary.charcoalGray }}>
            {mode === "signup" ? "Create your love space" : "Welcome back"}
          </Text>
          <Text className="text-sm mt-2" style={{ color: colors.status.offline }}>
            {mode === "signup" 
              ? "Sign up to connect with your person and start your journey together."
              : "Sign in to continue your journey together."}
          </Text>
        </View>

        <View className="rounded-3xl p-5 border shadow-xl" style={{ 
          backgroundColor: "#FFFFFF",
          borderColor: colors.secondary.lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View className="gap-4">
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

            <View>
              <Text className="mb-1 text-sm font-semibold" style={{ color: colors.secondary.charcoalGray }}>
                Password
              </Text>
              <TextInput
                className="rounded-2xl px-4 py-3 text-base border"
                style={{
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  borderWidth: 2,
                  color: colors.input.text,
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.input.placeholder}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Button
              className="mt-2 rounded-2xl py-3 items-center"
              style={{
                backgroundColor: colors.primary.softRose,
                shadowColor: colors.primary.softRose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              }}
              disabled={loading}
              onPress={handleSubmit}
            >
              <Text className="font-semibold" style={{ color: "#FFFFFF" }}>
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
              </Text>
            </Button>

            <View className="flex-row justify-center mt-3">
              <Text className="text-sm" style={{ color: colors.status.offline }}>
                {mode === "signup" ? "Already have an account? " : "New here? "}
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.primary.softRose }}
                onPress={() => setMode(mode === "signup" ? "login" : "signup")}
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </Text>
            </View>

          </View>
        </View>
      </View>
    </View>
  );
}


