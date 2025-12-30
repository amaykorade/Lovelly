import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Switch, TextInput, ActivityIndicator, Modal, Animated, InteractionManager } from "react-native";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { deleteUser } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, storage } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";
import Button from "../components/ui/button";
// import { startWidget, stopWidget } from "../lib/widgetService"; // Disabled widgets for now

interface Props {
  navigation: any;
}

interface PartnerInfo {
  name: string;
  avatarUrl?: string;
  userId: string;
}

const SettingsScreen = React.memo(function SettingsScreen({ navigation }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [connectionDate, setConnectionDate] = useState<string | null>(null);
  
  // Settings popup state
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current; // Start off-screen to the left

  // Open popup with smooth animation - optimized
  const openSettingsPopup = useCallback(() => {
    setShowSettingsPopup(true);
    // Use InteractionManager for smoother animation start
    const interaction = require('react-native').InteractionManager;
    interaction.runAfterInteractions(() => {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65, // Increased for snappier response
        friction: 7, // Reduced for smoother animation
        useNativeDriver: true,
        velocity: 0, // Start from rest
      }).start();
    });
  }, [slideAnim]);

  // Close popup with smooth animation - optimized
  const closeSettingsPopup = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200, // Faster close animation
      useNativeDriver: true,
    }).start((finished) => {
      if (finished) {
        slideAnim.setValue(-300);
        setShowSettingsPopup(false);
      }
    });
  }, [slideAnim]);
  
  // Edit profile states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingAvatar, setEditingAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Settings states
  const [locationSharing, setLocationSharing] = useState(true);
  const [shareOnlineStatus, setShareOnlineStatus] = useState(true);
  const [endToEndEncryption, setEndToEndEncryption] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [locationUpdates, setLocationUpdates] = useState(true);
  const [shareLocationWithPartner, setShareLocationWithPartner] = useState(true);
  const [typingStatus, setTypingStatus] = useState(false);
  const [showDistanceWidget, setShowDistanceWidget] = useState(false);
  const [showAnniversaryWidget, setShowAnniversaryWidget] = useState(false);
  const [showBirthdayWidget, setShowBirthdayWidget] = useState(false);

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    let coupleUnsubscribe: (() => void) | null = null;
    let partnerUnsubscribe: (() => void) | null = null;
    let currentCoupleId: string | null = null;
    let currentPartnerId: string | null = null;

    const user = auth.currentUser;
    if (!user) {
      navigation.navigate("Home");
      return;
    }

    const setupPartnerListener = (coupleId: string, partnerId: string, coupleData: any) => {
      // Only set up if partner changed
      if (currentPartnerId === partnerId && partnerUnsubscribe) {
        // Update connection date if needed
        if (coupleData.createdAt) {
          const date = coupleData.createdAt.toDate ? coupleData.createdAt.toDate() : new Date(coupleData.createdAt);
          setConnectionDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
        return;
      }

      // Clean up old listener
      if (partnerUnsubscribe) {
        partnerUnsubscribe();
      }

      const partnerRef = doc(db, "users", partnerId);
      
      partnerUnsubscribe = onSnapshot(partnerRef, (partnerSnap) => {
        const partnerData = partnerSnap.data() || {};
        
        setPartner({
          name: partnerData.name || "Partner",
          avatarUrl: partnerData.avatarUrl || null,
          userId: partnerId,
        });
      });

      // Get connection date
      if (coupleData.createdAt) {
        const date = coupleData.createdAt.toDate ? coupleData.createdAt.toDate() : new Date(coupleData.createdAt);
        setConnectionDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      }

      currentPartnerId = partnerId;
    };

    try {
      const userRef = doc(db, "users", user.uid);
      
      // Real-time listener for user data
      userUnsubscribe = onSnapshot(userRef, (snap) => {
        const data = snap.data() || {};
        
        setName(data.name || null);
        setAvatarUrl(data.avatarUrl || null);
        setCoupleId(data.coupleId || null);

        // Load user settings (real-time updates)
        setLocationSharing(data.settings?.locationSharing ?? true);
        setShareOnlineStatus(data.settings?.shareOnlineStatus ?? true);
        setEndToEndEncryption(data.settings?.endToEndEncryption ?? true);
        setMessageNotifications(data.settings?.messageNotifications ?? true);
        setLocationUpdates(data.settings?.locationUpdates ?? true);
        setShareLocationWithPartner(data.settings?.shareLocationWithPartner ?? true);
        setTypingStatus(data.settings?.typingStatus ?? false);
        setShowDistanceWidget(data.settings?.showDistanceWidget ?? false);
        setShowAnniversaryWidget(data.settings?.showAnniversaryWidget ?? false);
        setShowBirthdayWidget(data.settings?.showBirthdayWidget ?? false);

        // Only set up couple listener if coupleId changed
        if (data.coupleId && currentCoupleId !== data.coupleId) {
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
          }
          if (partnerUnsubscribe) {
            partnerUnsubscribe();
            partnerUnsubscribe = null;
          }

          currentCoupleId = data.coupleId;
          const coupleRef = doc(db, "couples", data.coupleId);
          
          coupleUnsubscribe = onSnapshot(coupleRef, (coupleSnap) => {
            const coupleData = coupleSnap.data();

            // If couple document deleted (disconnected), clear partner immediately
            if (!coupleData || !coupleSnap.exists()) {
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              setPartner(null);
              setConnectionDate(null);
              setCoupleId(null);
              return;
            }

            // Find partner ID
            const partnerId = coupleData.ownerId === user.uid 
              ? coupleData.partnerId 
              : coupleData.ownerId;

            if (partnerId) {
              setupPartnerListener(data.coupleId, partnerId, coupleData);
            } else {
              // No partner ID - clear partner
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              setPartner(null);
              setConnectionDate(null);
            }
          });
        } else if (!data.coupleId) {
          // Clean up listeners if no couple
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
            coupleUnsubscribe = null;
          }
          if (partnerUnsubscribe) {
            partnerUnsubscribe();
            partnerUnsubscribe = null;
          }
          setPartner(null);
          setConnectionDate(null);
          currentCoupleId = null;
          currentPartnerId = null;
        }
      });
    } catch (error) {
      console.error("Error setting up listeners:", error);
    }

    // Cleanup
    return () => {
      if (userUnsubscribe) userUnsubscribe();
      if (coupleUnsubscribe) coupleUnsubscribe();
      if (partnerUnsubscribe) partnerUnsubscribe();
    };
  }, [navigation]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect from Partner",
      "Are you sure you want to disconnect from your partner? This will disconnect both of you and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user || !coupleId) {
                Alert.alert("Error", "Unable to disconnect. Please try again.");
                return;
              }

              // Get couple document to find partner ID
              const coupleRef = doc(db, "couples", coupleId);
              const coupleSnap = await getDoc(coupleRef);
              const coupleData = coupleSnap.data();

              if (!coupleData) {
                // Couple document doesn't exist, just remove coupleId from current user
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                  coupleId: null,
                  updatedAt: serverTimestamp(),
                });
                Alert.alert("Disconnected", "You have been disconnected.", [
                  { text: "OK", onPress: () => navigation.navigate("Home") },
                ]);
                return;
              }

              // Find partner ID
              const partnerId = coupleData.ownerId === user.uid 
                ? coupleData.partnerId 
                : coupleData.ownerId;

              // Disconnect both users
              const userRef = doc(db, "users", user.uid);
              const partnerRef = partnerId ? doc(db, "users", partnerId) : null;

              // Update both users in parallel - ensure both are set to null
              const userUpdate = updateDoc(userRef, {
                coupleId: null,
                updatedAt: serverTimestamp(),
              });

              const partnerUpdate = partnerRef 
                ? updateDoc(partnerRef, {
                    coupleId: null,
                    updatedAt: serverTimestamp(),
                  }).catch((error) => {
                    console.error("Error updating partner:", error);
                    // Continue even if partner update fails
                  })
                : Promise.resolve();

              // Wait for both updates to complete
              await Promise.all([userUpdate, partnerUpdate]);

              // Delete the couple document to clean up
              // Do this after updating both users so the listeners can detect the change
              try {
                await deleteDoc(coupleRef);
              } catch (error) {
                console.error("Error deleting couple document:", error);
                // Continue even if deletion fails - the coupleId null updates are more important
              }

              Alert.alert(
                "Disconnected", 
                "You and your partner have been disconnected successfully.",
                [
                  { text: "OK", onPress: () => navigation.navigate("Home") },
                ]
              );
            } catch (error) {
              console.error("Error disconnecting:", error);
              Alert.alert("Error", "Could not disconnect. Please try again.");
            }
          },
        },
      ]
    );
  }, [coupleId, navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            auth.signOut();
          },
        },
      ]
    );
  }, []);

  const handleDeleteAccount = useCallback(async () => {
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
                  const partnerId = coupleData?.ownerId === user.uid 
                    ? coupleData?.partnerId 
                    : coupleData?.ownerId;

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
                  const avatarRef = ref(storage, `avatars/${user.uid}`);
                  await deleteObject(avatarRef);
                } catch (error) {
                  console.error("Error deleting avatar:", error);
                }
              }

              // Delete user document
              await deleteDoc(userRef);

              // Delete auth account
              await deleteUser(user);

              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
            } catch (error: any) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", error.message || "Could not delete account. Please try again.");
            }
          },
        },
      ]
    );
  }, []);

  const updateSetting = useCallback(async (setting: string, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    // Use InteractionManager for smooth UI updates
    InteractionManager.runAfterInteractions(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const currentData = (await getDoc(userRef)).data() || {};
        const currentSettings = currentData.settings || {};

        const updateData: any = {
          settings: {
            ...currentSettings,
            [setting]: value,
          },
          updatedAt: serverTimestamp(),
        };

        // If shareOnlineStatus is being disabled, set online to false immediately
        if (setting === 'shareOnlineStatus' && !value) {
          updateData.online = false;
          updateData.lastSeen = serverTimestamp();
        }

        await updateDoc(userRef, updateData);

        // Handle widget settings
        // DISABLED: Widgets are disabled for now
        // if (setting === 'showDistanceWidget') {
        //   if (value) {
        //     await startWidget('distance');
        //   } else {
        //     await stopWidget('distance');
        //   }
        // }

        // if (setting === 'showAnniversaryWidget') {
        //   if (value) {
        //     await startWidget('anniversary');
        //   } else {
        //     await stopWidget('anniversary');
        //   }
        // }

        // if (setting === 'showBirthdayWidget') {
        //   if (value) {
        //     await startWidget('birthday');
        //   } else {
        //     await stopWidget('birthday');
        //   }
        // }
      } catch (error) {
        console.error("Error updating setting:", error);
      }
    });
  }, []);

  const handlePickImage = useCallback(async (fromCamera: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    try {
      setUploadingAvatar(true);

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Camera permission is required to take a photo.");
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Media library permission is required to choose a photo.");
          return;
        }
      }

      const result = fromCamera
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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setEditingAvatar(asset.uri);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Could not pick image.");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  // Optimized navigation handlers
  const handleNavigateToProfile = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Profile');
    });
  }, [navigation]);

  const handleNavigateToPairing = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Pairing');
    });
  }, [navigation]);

  const handleOpenEditProfile = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setShowEditProfile(true);
    });
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const trimmedName = (editingName || "").trim();

    if (!trimmedName) {
      Alert.alert("Missing info", "Please enter your name.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    try {
      setSavingProfile(true);
      let newAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (editingAvatar && editingAvatar !== avatarUrl) {
        try {
          const response = await fetch(editingAvatar);
          const blob = await response.blob();
          const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
          await uploadBytes(avatarRef, blob);
          newAvatarUrl = await getDownloadURL(avatarRef);
        } catch (uploadError: any) {
          console.error("Error uploading image:", uploadError);
          Alert.alert("Upload error", "Could not upload profile picture. Continuing without it.");
        }
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: trimmedName,
        avatarUrl: newAvatarUrl,
        updatedAt: serverTimestamp(),
      });

      setName(trimmedName);
      setAvatarUrl(newAvatarUrl);
      setShowEditProfile(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  }, [editingName, editingAvatar, name, avatarUrl, setName, setAvatarUrl, setShowEditProfile]);

  const openEditProfile = useCallback(() => {
    setEditingName(name || "");
    setEditingAvatar(avatarUrl);
    setShowEditProfile(true);
  }, [name, avatarUrl, setEditingName, setEditingAvatar, setShowEditProfile]);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text
      className="text-sm font-semibold mb-3 mt-6"
      style={{ 
        color: colors.primary.rose,
        fontSize: fontSize(typography.sizes.small),
        fontWeight: typography.weights.semibold,
      }}
    >
      {title}
    </Text>
  );

  const SettingRow = ({ 
    label, 
    value, 
    onValueChange, 
    settingKey 
  }: { 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
    settingKey?: string;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: hp(spacing.sm),
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary.lightGray,
    }}>
      <Text style={{ 
        fontSize: fontSize(typography.sizes.body), 
        color: colors.text.primary,
        fontWeight: typography.weights.medium,
      }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={(newValue) => {
          onValueChange(newValue);
          if (settingKey) {
            updateSetting(settingKey, newValue);
          }
        }}
        trackColor={{ false: colors.secondary.lightGray, true: colors.primary.rose }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.main }}>
    <ScrollView
      className="flex-1"
        style={{ backgroundColor: colors.background.main }}
        contentContainerStyle={{ paddingBottom: hp(spacing.xl) }}
    >
        <View style={{
          paddingHorizontal: wp(spacing.lg),
          paddingVertical: hp(spacing.xl),
        }}>
          {/* Settings Icon in Upper Right */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: hp(spacing.md),
          }}>
            <Pressable
            style={{
                padding: wp(spacing.xs),
              }}
              onPress={openSettingsPopup}
            >
              <Ionicons 
                name="settings-outline" 
                size={fontSize(18)} 
                color={colors.text.primary} 
              />
          </Pressable>
        </View>

        {/* Profiles Section - Enhanced */}
        <View style={{
          marginBottom: hp(spacing.xl),
        }}>
          <View style={{
            flexDirection: 'row',
            gap: wp(spacing.md),
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: hp(spacing.md),
          }}>
            {/* User Profile */}
            <Pressable
              onPress={handleOpenEditProfile}
                style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{
                width: wp(60),
                height: wp(60),
                borderRadius: wp(30),
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
                marginBottom: hp(spacing.xs),
              }}>
                {avatarUrl ? (
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={{
                      width: wp(56),
                      height: wp(56),
                      borderRadius: wp(28),
                    }}
                  />
                ) : (
                  <View style={{
                    width: wp(56),
                    height: wp(56),
                    borderRadius: wp(28),
                    backgroundColor: colors.primary.softRose,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: fontSize(typography.sizes.h3),
                      fontWeight: typography.weights.bold,
                      color: colors.primary.rose,
                    }}>
                      {name ? name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
              </View>
              <Text style={{
                fontSize: fontSize(typography.sizes.small),
                fontWeight: typography.weights.medium,
                color: colors.text.primary,
                textAlign: 'center',
              }}>
                {name || 'You'}
              </Text>
            </Pressable>

            {/* Heart Icon */}
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons 
                name="heart" 
                size={fontSize(24)} 
                color={colors.primary.rose} 
              />
            </View>

            {/* Partner Profile */}
            {partner ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  width: wp(60),
                  height: wp(60),
                  borderRadius: wp(30),
                  backgroundColor: colors.background.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.primary.coral,
                  shadowColor: colors.primary.coral,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                  marginBottom: hp(spacing.xs),
                }}>
                  {partner.avatarUrl ? (
                    <Image 
                      source={{ uri: partner.avatarUrl }} 
                style={{
                        width: wp(56),
                        height: wp(56),
                        borderRadius: wp(28),
                      }}
                    />
                  ) : (
                    <View style={{
                      width: wp(56),
                      height: wp(56),
                      borderRadius: wp(28),
                      backgroundColor: colors.primary.softRose,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{
                        fontSize: fontSize(typography.sizes.h3),
                        fontWeight: typography.weights.bold,
                        color: colors.primary.rose,
                      }}>
                        {partner.name ? partner.name.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
                  )}
          </View>
                <Text style={{
                  fontSize: fontSize(typography.sizes.small),
                  fontWeight: typography.weights.medium,
                  color: colors.text.primary,
                  textAlign: 'center',
                }}>
                  {partner.name || 'Partner'}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleNavigateToPairing}
              style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: wp(80),
                  height: wp(80),
                  borderRadius: wp(30),
                  backgroundColor: colors.background.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.secondary.lightGray,
                  borderStyle: 'dashed',
                  marginBottom: hp(spacing.xs),
                }}>
                  <Ionicons 
                    name="add" 
                    size={fontSize(28)} 
                    color={colors.text.secondary} 
                  />
                </View>
                <Text style={{
                  fontSize: fontSize(typography.sizes.small),
                fontWeight: typography.weights.medium,
                  color: colors.text.secondary,
                  textAlign: 'center',
                }}>
                  Add Partner
            </Text>
          </Pressable>
            )}
          </View>
        </View>

        {/* FAQs Section */}
        <SectionHeader title="Frequently Asked Questions" />
        <View style={{
          borderRadius: wp(borderRadius.lg),
          padding: wp(spacing.lg),
          borderWidth: 1,
          marginBottom: hp(spacing.lg),
          backgroundColor: colors.background.surface,
          borderColor: colors.secondary.lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ marginBottom: hp(spacing.lg) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.xs),
            }}>
              How do I connect with my partner?
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.small) * 1.5,
            }}>
              Go to the pairing page and share your unique code with your partner, or enter their code to connect.
            </Text>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.secondary.lightGray,
            marginVertical: hp(spacing.md),
          }} />

          <View style={{ marginBottom: hp(spacing.lg) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.xs),
            }}>
              Can I change my profile information?
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.small) * 1.5,
            }}>
              Yes! Tap on your profile picture or name to edit your profile information, including your name and profile picture.
            </Text>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.secondary.lightGray,
            marginVertical: hp(spacing.md),
          }} />

          <View style={{ marginBottom: hp(spacing.lg) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.xs),
            }}>
              How does location sharing work?
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.small) * 1.5,
            }}>
              Location sharing is optional. You can enable or disable it in Settings. When enabled, your partner can see your location on the map.
            </Text>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.secondary.lightGray,
            marginVertical: hp(spacing.md),
          }} />

          <View style={{ marginBottom: hp(spacing.lg) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.xs),
            }}>
              What are widgets?
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.small) * 1.5,
            }}>
              Widgets allow you to see important information like distance to your partner, anniversaries, and birthdays directly on your home screen.
            </Text>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.secondary.lightGray,
            marginVertical: hp(spacing.md),
          }} />

          <View>
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.xs),
            }}>
              How do I unpair from my partner?
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.small) * 1.5,
            }}>
              You can unpair from your partner by going to Settings and selecting "Unpair". This will disconnect you from your partner.
            </Text>
          </View>
        </View>

        {/* About Section */}
        <SectionHeader title="About" />
        <View style={{
          borderRadius: wp(borderRadius.lg),
          padding: wp(spacing.md),
          borderWidth: 1,
          marginBottom: hp(spacing.md),
          backgroundColor: colors.background.surface,
          borderColor: colors.secondary.lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ marginBottom: hp(spacing.md) }}>
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                color: colors.text.secondary,
              }}
            >
              App Version: 1.0.0
            </Text>
          </View>
          <View style={{ 
            flexDirection: 'row', 
            gap: wp(spacing.md),
            marginBottom: hp(spacing.md),
          }}>
            <Pressable onPress={() => Alert.alert("Feedback", "Feedback feature coming soon!")}>
              <Text style={{ 
                color: colors.primary.rose, 
                fontWeight: typography.weights.semibold,
                fontSize: fontSize(typography.sizes.body),
              }}>
                Feedback
              </Text>
            </Pressable>
            <Pressable onPress={() => Alert.alert("Terms", "Terms of Service coming soon!")}>
              <Text style={{ 
                color: colors.primary.rose, 
                fontWeight: typography.weights.semibold,
                fontSize: fontSize(typography.sizes.body),
              }}>
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => Alert.alert("Policy", "Privacy Policy coming soon!")}>
              <Text style={{ 
                color: colors.primary.rose, 
                fontWeight: typography.weights.semibold,
                fontSize: fontSize(typography.sizes.body),
              }}>
                Policy
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onPress={() => setShowEditProfile(false)}
        >
          <View style={{
            flex: 1,
            paddingHorizontal: wp(spacing.lg),
            paddingVertical: hp(spacing.xl),
            justifyContent: 'center',
          }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                borderRadius: wp(borderRadius.xl),
                padding: wp(spacing.lg),
                borderWidth: 1,
                backgroundColor: colors.background.main,
                borderColor: colors.secondary.lightGray,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: hp(spacing.lg),
              }}>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.h2),
                    fontWeight: typography.weights.bold,
                    color: colors.text.primary,
                  }}
                >
                  Edit Profile
                </Text>
                <Pressable onPress={() => setShowEditProfile(false)}>
                  <Text style={{ 
                    fontSize: fontSize(28),
                    color: colors.text.secondary,
                  }}>×</Text>
                </Pressable>
              </View>

              {/* Profile Picture */}
              <View style={{
                alignItems: 'center',
                marginBottom: hp(spacing.lg),
              }}>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Change photo",
                      "How would you like to update your photo?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Take photo", onPress: () => handlePickImage(true) },
                        { text: "Choose from gallery", onPress: () => handlePickImage(false) },
                      ]
                    );
                  }}
                  style={{
                    width: wp(96),
                    height: wp(96),
                    borderRadius: wp(48),
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderColor: colors.primary.rose,
                    backgroundColor: colors.primary.softRose,
                  }}
                >
                  {editingAvatar ? (
                    <Image 
                      source={{ uri: editingAvatar }} 
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: fontSize(36),
                        fontWeight: typography.weights.bold,
                        color: colors.primary.rose,
                      }}
                    >
                      {(editingName || "U").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </Pressable>
                {uploadingAvatar && (
                  <View style={{ marginTop: hp(spacing.xs) }}>
                    <ActivityIndicator size="small" color={colors.primary.rose} />
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.tiny),
                      marginTop: hp(spacing.tiny),
                      color: colors.text.secondary,
                    }}>
                      Uploading...
                    </Text>
                  </View>
                )}
              </View>

              {/* Name Input */}
              <View style={{ marginBottom: hp(spacing.lg) }}>
                <Text
                  style={{
                    marginBottom: hp(spacing.xs),
                    fontSize: fontSize(typography.sizes.small),
                    fontWeight: typography.weights.semibold,
                    color: colors.text.primary,
                  }}
                >
                  Your Name
                </Text>
                <TextInput
                  style={{
                    borderRadius: wp(borderRadius.lg),
                    paddingHorizontal: wp(spacing.md),
                    paddingVertical: hp(spacing.sm),
                    fontSize: fontSize(typography.sizes.body),
                    borderWidth: 2,
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    color: colors.input.text,
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.input.placeholder}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoCapitalize="words"
                />
              </View>

              {/* Buttons */}
              <View style={{
                flexDirection: 'row',
                gap: wp(spacing.sm),
              }}>
                <Button
                  className="flex-1 rounded-2xl py-3 items-center"
                  style={{
                    backgroundColor: colors.primary.softRose,
                  }}
                  onPress={() => setShowEditProfile(false)}
                  disabled={savingProfile}
                >
                  <Text style={{ color: colors.secondary.charcoalGray }}>Cancel</Text>
                </Button>
                <Button
                  className="flex-1 rounded-2xl py-3 items-center"
                  style={{
                    backgroundColor: colors.primary.softRose,
                    shadowColor: colors.primary.softRose,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="font-semibold" style={{ color: "#FFFFFF" }}>
                      Save
                    </Text>
                  )}
                </Button>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}
    </ScrollView>

      {/* Settings Popup Modal */}
      <Modal
        visible={showSettingsPopup}
        transparent={true}
        animationType="none"
        onRequestClose={closeSettingsPopup}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={closeSettingsPopup}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: wp(280),
              backgroundColor: colors.background.surface,
              transform: [{ translateX: slideAnim }],
              shadowColor: "#000",
              shadowOffset: { width: 2, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1 }}>
                {/* User Profile at Top */}
                <View style={{
                  padding: wp(spacing.lg),
                  borderBottomWidth: 1,
                  borderBottomColor: colors.secondary.lightGray,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: wp(spacing.md),
                }}>
                  {avatarUrl ? (
                    <Image 
                      source={{ uri: avatarUrl }} 
                      style={{
                        width: wp(56),
                        height: wp(56),
                        borderRadius: wp(28),
                      }}
                    />
                  ) : (
                    <View style={{
                      width: wp(56),
                      height: wp(56),
                      borderRadius: wp(28),
                      backgroundColor: colors.primary.softRose,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{
                        fontSize: fontSize(typography.sizes.h3),
                        fontWeight: typography.weights.bold,
                        color: colors.primary.rose,
                      }}>
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={{
                    fontSize: fontSize(typography.sizes.small),
                    fontWeight: typography.weights.regular,
                    color: colors.text.primary,
                    flex: 1,
                  }}>
                    {name || 'User'}
                  </Text>
                </View>

              {/* Menu Items */}
              <View style={{ paddingVertical: hp(spacing.sm) }}>
                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      closeSettingsPopup();
                      navigation.navigate('Profile');
                    }}
                  >
                    <Ionicons 
                      name="person-outline" 
                      size={fontSize(18)} 
                      color={colors.primary.rose} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.text.primary,
                    }}>
                      My Profile
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      // Navigate to partner profile or show partner info
                      closeSettingsPopup();
                    }}
                  >
                    <Ionicons 
                      name="people-outline" 
                      size={fontSize(18)} 
                      color={colors.primary.rose} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.text.primary,
                    }}>
                      Partner's Profile
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      // Navigate to notifications settings
                      closeSettingsPopup();
                    }}
                  >
                    <Ionicons 
                      name="notifications-outline" 
                      size={fontSize(18)} 
                      color={colors.primary.rose} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.text.primary,
                    }}>
                      Notifications
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      // Navigate to language settings
                      closeSettingsPopup();
                    }}
                  >
                    <Ionicons 
                      name="language-outline" 
                      size={fontSize(18)} 
                      color={colors.primary.rose} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.text.primary,
                    }}>
                      Languages
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      closeSettingsPopup();
                      InteractionManager.runAfterInteractions(() => {
                        navigation.navigate('SettingsPage');
                      });
                    }}
                  >
                    <Ionicons 
                      name="settings-outline" 
                      size={fontSize(18)} 
                      color={colors.text.primary} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.text.primary,
                    }}>
                      Settings
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Bottom Actions - Always at bottom */}
              <View style={{
                borderTopWidth: 1,
                borderTopColor: colors.secondary.lightGray,
                paddingTop: hp(spacing.sm),
                paddingBottom: hp(spacing.md),
              }}>
                {/* Unpair */}
                {coupleId && (
                  <Pressable
                    style={{
                      paddingVertical: hp(spacing.md),
                      paddingHorizontal: wp(spacing.lg),
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      closeSettingsPopup();
                      handleDisconnect();
                    }}
                  >
                    <Ionicons 
                      name="link-outline" 
                      size={fontSize(18)} 
                      color={colors.primary.rose} 
                      style={{ marginRight: wp(spacing.md) }}
                    />
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.regular,
                      color: colors.primary.rose,
                    }}>
                      Unpair
                    </Text>
                  </Pressable>
                )}

                {/* Logout */}
                <Pressable
                  style={{
                    paddingVertical: hp(spacing.md),
                    paddingHorizontal: wp(spacing.lg),
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    closeSettingsPopup();
                    handleLogout();
                  }}
                >
                  <Ionicons 
                    name="log-out-outline" 
                    size={fontSize(18)} 
                    color={colors.text.secondary} 
                    style={{ marginRight: wp(spacing.md) }}
                  />
                  <Text style={{
                    fontSize: fontSize(typography.sizes.small),
                    fontWeight: typography.weights.regular,
                    color: colors.text.secondary,
                  }}>
                    Logout
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
});

export { SettingsScreen };

