import React, { useState } from "react";
import { ScrollView, View, Text, TextInput, Alert, Image, Pressable } from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import { auth, db, storage } from "../lib/firebase";
import { colors, spacing, borderRadius, typography } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

export function ProfileSetupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Format date input as DD/MM/YYYY
  const formatDateInput = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDateOfBirth(formatted);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Media library permission is required to choose a photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setProfilePicture(asset.uri);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing info", "Please enter your name.");
      return;
    }

    if (!dateOfBirth.trim()) {
      Alert.alert("Missing info", "Please enter your date of birth.");
      return;
    }

    // Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dateOfBirth.trim())) {
      Alert.alert("Invalid date", "Please enter the date in DD/MM/YYYY format (e.g., 15/06/2000).");
      return;
    }

    // Validate that the date is in the past (date of birth should be in the past)
    const [day, month, year] = dateOfBirth.trim().split('/');
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    if (birthDate >= today) {
      Alert.alert("Invalid date", "Date of birth must be in the past.");
      return;
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD for storage
    const formattedDate = `${year}-${month}-${day}`;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    try {
      setSaving(true);
      let avatarUrl = null;

      // Upload profile picture if selected
      if (profilePicture) {
        try {
          setUploading(true);
          const response = await fetch(profilePicture);
          const blob = await response.blob();
          const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
          await uploadBytes(avatarRef, blob);
          avatarUrl = await getDownloadURL(avatarRef);
        } catch (uploadError: any) {
          console.error("Error uploading image:", uploadError);
          Alert.alert("Upload error", "Could not upload profile picture. Continuing without it.");
        } finally {
          setUploading(false);
        }
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: name.trim(),
          dateOfBirth: formattedDate, // Store as YYYY-MM-DD
          avatarUrl,
          email: user.email || null,
          profileComplete: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // After saving profile, the App.js will automatically navigate to Home
      // based on hasProfile state change, so we don't need to navigate manually
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 px-6 py-10"
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ backgroundColor: colors.primary.warmWhite }}
    >
      {/* Header with Progress */}
      <View className="mb-8">
        <Text
          className="text-3xl font-extrabold mb-2"
          style={{ color: colors.secondary.charcoalGray }}
        >
          Complete Your Profile
        </Text>
        <Text
          className="text-sm"
          style={{ color: colors.status.offline }}
        >
          Step 1/2
      </Text>
      </View>

      {/* Profile Picture Upload */}
      <View className="items-center mb-8">
        <Pressable
          className="w-32 h-32 rounded-2xl items-center justify-center border-2"
          style={{
            borderColor: colors.secondary.lightGray,
            backgroundColor: colors.primary.dustyPink,
            borderWidth: 2,
            borderStyle: "dashed",
          }}
          onPress={handlePickImage}
        >
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} className="w-full h-full rounded-2xl" />
          ) : (
            <View className="items-center">
              <Text className="text-4xl mb-2">📷</Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.secondary.charcoalGray }}
              >
                Upload Photo
      </Text>
            </View>
          )}
        </Pressable>
        {uploading && (
          <Text className="text-xs mt-2" style={{ color: colors.status.offline }}>Uploading...</Text>
        )}
      </View>

      <View className="gap-6">

        {/* Name Input */}
        <View>
          <Text
            className="mb-2 text-base font-semibold"
            style={{ color: colors.secondary.charcoalGray }}
          >
            Your Name
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3 text-base border"
            style={{
              backgroundColor: colors.input.background,
              borderColor: colors.input.border,
              borderWidth: 2,
              color: colors.input.text,
            }}
            placeholder="Sarah"
            placeholderTextColor={colors.input.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Date of Birth Input */}
        <View>
          <Text
            className="mb-2 text-base font-semibold"
            style={{ color: colors.secondary.charcoalGray }}
          >
            Your Date of Birth
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3 text-base border"
            style={{
              backgroundColor: colors.input.background,
              borderColor: colors.input.border,
              borderWidth: 2,
              color: colors.input.text,
            }}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.input.placeholder}
            value={dateOfBirth}
            onChangeText={handleDateChange}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text
            className="mt-1 text-xs"
            style={{ color: colors.status.offline }}
          >
            We'll use this to calculate your age and show special moments
          </Text>
        </View>

        {/* Next Button */}
        <Pressable
          className="rounded-2xl py-4 px-6 items-center justify-center mt-4"
          style={{
            backgroundColor: colors.primary.softRose,
            shadowColor: colors.primary.softRose,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
            opacity: (saving || uploading) ? 0.6 : 1,
          }}
          disabled={saving || uploading}
          onPress={handleSave}
        >
          <Text
            style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            {saving ? "Saving..." : uploading ? "Uploading..." : "Next"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}


