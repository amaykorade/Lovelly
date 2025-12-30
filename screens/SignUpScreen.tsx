import React, { useState } from "react";
import { View, Text, TextInput, Alert, Pressable, ScrollView } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import Button from "../components/ui/button";
import { colors, spacing, borderRadius, typography } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

export function SignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert("Missing info", "Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Missing info", "Please enter your email.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Missing info", "Please enter a password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match. Please try again.");
      return;
    }

    if (!agreedToTerms) {
      Alert.alert("Terms required", "Please agree to the Terms & Privacy Policy to continue.");
      return;
    }

    try {
      setLoading(true);

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: fullName.trim(),
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Navigation will be handled by App.js based on auth state
    } catch (error: any) {
      console.error(error);

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
      if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid email", "Please enter a valid email address.");
        return;
      }

      Alert.alert("Sign up error", error.message || "Something went wrong. Please try again.");
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
            Create Your Account
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          {/* Full Name */}
          <View>
            <Text className="mb-1 text-sm font-semibold" style={{ color: colors.secondary.charcoalGray }}>
              Full Name
            </Text>
            <TextInput
              className="rounded-2xl px-4 py-3 text-base border"
              style={{
                backgroundColor: colors.input.background,
                borderColor: colors.input.border,
                borderWidth: 2,
                color: colors.input.text,
              }}
              placeholder="John Doe"
              placeholderTextColor={colors.input.placeholder}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

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
            {password.length > 0 && password.length < 6 && (
              <Text className="text-xs mt-1" style={{ color: colors.primary.deepRose }}>
                Password must be at least 6 characters
              </Text>
            )}
          </View>

          {/* Confirm Password */}
          <View>
            <Text className="mb-1 text-sm font-semibold" style={{ color: colors.secondary.charcoalGray }}>
              Confirm Password
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
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4"
              >
                <Text className="text-lg">{showConfirmPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </Pressable>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text className="text-xs mt-1" style={{ color: colors.primary.deepRose }}>
                Passwords do not match
              </Text>
            )}
          </View>

          {/* Terms Checkbox */}
          <Pressable
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            className="flex-row items-center gap-3 mt-2"
          >
            <View
              className="w-5 h-5 rounded border-2 items-center justify-center"
              style={{
                borderColor: agreedToTerms ? colors.primary.softRose : colors.secondary.lightGray,
                backgroundColor: agreedToTerms ? colors.primary.softRose : "transparent",
              }}
            >
              {agreedToTerms && (
                <Text className="text-white text-xs">✓</Text>
              )}
            </View>
            <Text className="text-sm flex-1" style={{ color: colors.secondary.charcoalGray }}>
              I agree to{" "}
              <Text style={{ color: colors.primary.softRose }}>Terms & Privacy</Text>
            </Text>
          </Pressable>
        </View>

        {/* Sign Up Button */}
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
          onPress={handleSignUp}
        >
          <Text
            style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Text>
        </Button>

        {/* Login Link */}
        <View className="flex-row justify-center">
          <Text className="text-sm" style={{ color: colors.status.offline }}>
            Already have account?{" "}
          </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.primary.softRose }}
            >
              Login
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

