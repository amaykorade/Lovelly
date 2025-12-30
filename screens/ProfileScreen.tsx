import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, TextInput, ActivityIndicator, Platform } from "react-native";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { deleteUser, signOut } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, storage } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

export function ProfileScreen({ navigation }: Props) {
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [initialName, setInitialName] = useState<string>("");
  const [initialGender, setInitialGender] = useState<string>("");
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigation.goBack();
        return;
      }

      try {
        setEmail(user.email || "");
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData) {
          const userName = userData.name || "";
          const userGender = userData.gender || "";
          const userAvatarUrl = userData.avatarUrl || null;
          
          setName(userName);
          setGender(userGender);
          setAvatarUrl(userAvatarUrl);
          setCoupleId(userData.coupleId || null);
          
          // Store initial values for comparison
          setInitialName(userName);
          setInitialGender(userGender);
          setInitialAvatarUrl(userAvatarUrl);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        Alert.alert("Error", "Failed to load profile information");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please grant camera/photo library access");
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadAvatar = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
      await uploadBytes(avatarRef, blob);
      const downloadURL = await getDownloadURL(avatarRef);
      setAvatarUrl(downloadURL);
      // Auto-save after avatar upload
      await saveProfile(downloadURL);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert("Error", "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async (newAvatarUrl?: string | null) => {
    const user = auth.currentUser;
    if (!user) return;

    // Don't save if nothing has changed
    const currentAvatar = newAvatarUrl !== undefined ? newAvatarUrl : avatarUrl;
    if (name === initialName && gender === initialGender && currentAvatar === initialAvatarUrl) {
      return;
    }

    if (!name.trim()) {
      return; // Don't save if name is empty
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updateData: any = {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      };

      if (gender) {
        updateData.gender = gender.trim();
      }

      if (currentAvatar) {
        updateData.avatarUrl = currentAvatar;
      }

      await updateDoc(userRef, updateData);
      
      // Update initial values after successful save
      setInitialName(name.trim());
      setInitialGender(gender);
      if (newAvatarUrl !== undefined) {
        setInitialAvatarUrl(newAvatarUrl);
      } else {
        setInitialAvatarUrl(currentAvatar);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      // Don't show alert for auto-save, just log error
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when name or gender changes (with debounce)
  useEffect(() => {
    if (loading) return; // Don't save on initial load
    
    const timer = setTimeout(() => {
      saveProfile();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, gender]);


  const handleUnpair = async () => {
    Alert.alert(
      "Unpair from Partner",
      "Are you sure you want to unpair from your partner? This will disconnect both of you and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpair",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user || !coupleId) {
              Alert.alert("Error", "Unable to unpair. Please try again.");
              return;
            }

            try {
              const coupleRef = doc(db, "couples", coupleId);
              const coupleSnap = await getDoc(coupleRef);

              if (coupleSnap.exists()) {
                const coupleData = coupleSnap.data();
                const partnerId = coupleData.user1Id === user.uid ? coupleData.user2Id : coupleData.user1Id;

                // Remove coupleId from both users
                await updateDoc(doc(db, "users", user.uid), {
                  coupleId: null,
                  updatedAt: serverTimestamp(),
                });

                if (partnerId) {
                  await updateDoc(doc(db, "users", partnerId), {
                    coupleId: null,
                    updatedAt: serverTimestamp(),
                  });
                }

                // Delete the couple document
                await deleteDoc(coupleRef);

                Alert.alert("Unpaired", "You have been unpaired from your partner.", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              } else {
                // Couple document doesn't exist, just clear coupleId
                await updateDoc(doc(db, "users", user.uid), {
                  coupleId: null,
                  updatedAt: serverTimestamp(),
                });
                Alert.alert("Unpaired", "You have been unpaired.", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              }
            } catch (error) {
              console.error("Error unpairing:", error);
              Alert.alert("Error", "Could not unpair. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This will permanently delete all your data and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
              // First, unpair if connected
              if (coupleId) {
                const coupleRef = doc(db, "couples", coupleId);
                const coupleSnap = await getDoc(coupleRef);

                if (coupleSnap.exists()) {
                  const coupleData = coupleSnap.data();
                  const partnerId = coupleData.user1Id === user.uid ? coupleData.user2Id : coupleData.user1Id;

                  if (partnerId) {
                    await updateDoc(doc(db, "users", partnerId), {
                      coupleId: null,
                      updatedAt: serverTimestamp(),
                    });
                  }

                  await deleteDoc(coupleRef);
                }
              }

              // Delete user's data
              const userRef = doc(db, "users", user.uid);
              
              // Delete avatar from storage if exists
              if (avatarUrl) {
                try {
                  const avatarRef = ref(storage, avatarUrl);
                  await deleteObject(avatarRef);
                } catch (error) {
                  console.error("Error deleting avatar:", error);
                }
              }

              // Delete user document
              await deleteDoc(userRef);

              // Delete auth account
              await deleteUser(user);

              Alert.alert("Account Deleted", "Your account has been permanently deleted.", [
                { text: "OK", onPress: async () => {
                  await signOut(auth);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Landing" }],
                  });
                }},
              ]);
            } catch (error: any) {
              console.error("Error deleting account:", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert("Authentication Required", "Please sign in again to delete your account.");
              } else {
                Alert.alert("Error", "Could not delete account. Please try again.");
              }
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.main, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary.rose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.main }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp(spacing.lg),
        paddingTop: hp(spacing.xl),
        paddingBottom: hp(spacing.md),
        borderBottomWidth: 1,
        borderBottomColor: colors.secondary.lightGray,
        position: 'relative',
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            {
              padding: wp(spacing.sm),
              position: 'absolute',
              left: 0,
              top: hp(spacing.xl),
              bottom: hp(spacing.md),
              justifyContent: 'center',
              paddingLeft: wp(spacing.md),
              opacity: pressed ? 0.5 : 1,
            }
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Ionicons 
            name="chevron-back" 
            size={fontSize(24)} 
            color={colors.text.secondary} 
          />
        </Pressable>
        <Text style={{
          fontSize: fontSize(typography.sizes.body),
          fontWeight: typography.weights.regular,
          color: colors.text.secondary,
        }}>
          My Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: wp(spacing.lg),
          paddingVertical: hp(spacing.xl),
        }}
      >
        {/* Profile Picture Section */}
        <View style={{
          alignItems: 'center',
          marginBottom: hp(spacing.xl),
        }}>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Change Profile Picture",
                "Choose an option",
                [
                  { text: "Take Photo", onPress: () => handlePickImage(true) },
                  { text: "Choose from Gallery", onPress: () => handlePickImage(false) },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
            disabled={uploadingAvatar}
            style={{
              width: wp(80),
              height: wp(80),
              borderRadius: wp(40),
              backgroundColor: colors.background.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.primary.rose,
              shadowColor: colors.primary.rose,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
              marginBottom: hp(spacing.sm),
            }}
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={{
                  width: wp(76),
                  height: wp(76),
                  borderRadius: wp(38),
                }}
              />
            ) : (
              <View style={{
                width: wp(76),
                height: wp(76),
                borderRadius: wp(38),
                backgroundColor: colors.primary.softRose,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: fontSize(typography.sizes.h2),
                  fontWeight: typography.weights.bold,
                  color: colors.primary.rose,
                }}>
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={{
                position: 'absolute',
                width: wp(76),
                height: wp(76),
                borderRadius: wp(38),
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
            {!uploadingAvatar && (
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: wp(24),
                height: wp(24),
                borderRadius: wp(12),
                backgroundColor: colors.primary.rose,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.background.main,
              }}>
                <Ionicons name="camera" size={fontSize(12)} color={colors.text.inverse} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Name Input */}
        <View style={{ marginBottom: hp(spacing.md) }}>
          <Text style={{
            fontSize: fontSize(typography.sizes.small),
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            marginBottom: hp(spacing.xs),
          }}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.text.tertiary}
            style={{
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              borderRadius: wp(borderRadius.md),
              paddingVertical: hp(spacing.sm),
              paddingHorizontal: wp(spacing.md),
              fontSize: fontSize(typography.sizes.body),
              color: colors.text.primary,
            }}
          />
            </View>

        {/* Gender Input */}
        <View style={{ marginBottom: hp(spacing.md) }}>
          <Text style={{
            fontSize: fontSize(typography.sizes.small),
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            marginBottom: hp(spacing.xs),
          }}>
            Gender
          </Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Select Gender",
                "Choose your gender",
                [
                  { text: "Male", onPress: () => setGender("Male") },
                  { text: "Female", onPress: () => setGender("Female") },
                  { text: "Other", onPress: () => setGender("Other") },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
            style={{
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              borderRadius: wp(borderRadius.md),
              paddingVertical: hp(spacing.sm),
              paddingHorizontal: wp(spacing.md),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              color: gender ? colors.text.primary : colors.text.tertiary,
            }}>
              {gender || "Select gender"}
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={fontSize(16)} 
              color={colors.text.secondary} 
            />
          </Pressable>
        </View>

        {/* Email Display (Read-only) */}
        <View style={{ marginBottom: hp(spacing.lg) }}>
          <Text style={{
            fontSize: fontSize(typography.sizes.small),
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            marginBottom: hp(spacing.xs),
          }}>
            Email
          </Text>
          <View style={{
            backgroundColor: colors.background.surface,
            borderWidth: 1,
            borderColor: colors.secondary.lightGray,
            borderRadius: wp(borderRadius.md),
            paddingVertical: hp(spacing.sm),
            paddingHorizontal: wp(spacing.md),
          }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              color: colors.text.secondary,
            }}>
              {email || "Not set"}
              </Text>
          </View>
            </View>

        {/* Saving Indicator */}
        {saving && (
          <View style={{
            alignItems: 'center',
            marginBottom: hp(spacing.md),
          }}>
            <ActivityIndicator size="small" color={colors.primary.rose} />
            <Text style={{
              fontSize: fontSize(typography.sizes.caption),
              color: colors.text.secondary,
              marginTop: hp(spacing.xs),
            }}>
              Saving...
            </Text>
            </View>
          )}

        {/* Unpair Button */}
        {coupleId && (
          <Pressable
            onPress={handleUnpair}
            style={({ pressed }) => [
              {
                borderRadius: wp(borderRadius.md),
                paddingVertical: hp(spacing.sm),
                paddingHorizontal: wp(spacing.md),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: hp(spacing.md),
                opacity: pressed ? 0.7 : 1,
              }
            ]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
          >
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              fontWeight: typography.weights.regular,
              color: colors.text.secondary,
            }}>
              Unpair
            </Text>
          </Pressable>
      )}

        {/* Delete Account Button */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            {
              borderRadius: wp(borderRadius.md),
              paddingVertical: hp(spacing.sm),
              paddingHorizontal: wp(spacing.md),
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            }
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
        >
          <Text style={{
            fontSize: fontSize(typography.sizes.small),
            fontWeight: typography.weights.regular,
            color: colors.text.secondary,
          }}>
            Delete Account
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
