import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, Alert, ActivityIndicator, Pressable, ScrollView, KeyboardAvoidingView, Platform, Share, Modal, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Animated } from "react-native";
import Button from "../components/ui/button";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
  route?: any;
}

type PairingView = "selection" | "generate" | "use";

export function PairingScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PairingView>("selection");
  const [creatingCode, setCreatingCode] = useState(false);
  const [joining, setJoining] = useState(false);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Handle deep link code from route params
  useEffect(() => {
    if (route?.params?.joinCode) {
      const code = route.params.joinCode.toUpperCase().trim();
      setJoinCode(code);
      setView("use");
      // Auto-focus input if available
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [route?.params?.joinCode]);

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not signed in", "Please log in again.");
        navigation.replace("Auth");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.data() || {};

        // Check if user already has a code generated
        if (data.coupleId) {
          // Check if code is in old format (COUPLE-XXX-XXX)
          const isOldFormat = data.coupleId.startsWith("COUPLE-");
          
          if (isOldFormat) {
            // Old format code - clear it so user can generate a new one
            setCoupleId(null);
            setMyCode(null);
          } else {
            // New format code - use it
          setCoupleId(data.coupleId);
          if (!myCode) {
            // User is already paired, show their existing code
            setMyCode(data.coupleId);
            // Set expiration (24 hours from creation, or use a default)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            setCodeExpiresAt(expiresAt);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const generateCode = () => {
    // Generate short 5-character code: XOSUB
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // Calculate time remaining
  useEffect(() => {
    if (!codeExpiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = codeExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [codeExpiresAt]);

  const handleCopyCode = async () => {
    if (!myCode) return;
    
    try {
      await Clipboard.setStringAsync(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert("Error", "Could not copy code to clipboard.");
    }
  };

  const handleShareCode = () => {
    if (!myCode) return;
    // Reset animations first - start from bottom (value 0 = translateY 600, off-screen)
    slideAnim.setValue(0);
    
    // Show modal first
    setShowShareModal(true);
    
    // Animate slide up from bottom
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeShareModal = () => {
    // Animate slide down
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowShareModal(false);
      slideAnim.setValue(0);
    });
  };

  const shareLink = myCode ? `https://lovelly.app/join/${myCode}` : '';
  const shareMessage = myCode ? `💕 Join me on Lovelly!\n\nUse this code: ${myCode}\n\nOr tap this link to connect:\n${shareLink}\n\nLet's stay connected! 💑` : '';

  const handleShareWhatsApp = async () => {
    if (!myCode) return;
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        await Linking.openURL(webUrl);
      }
      closeShareModal();
    } catch (error) {
      Alert.alert("Error", "Could not open WhatsApp.");
    }
  };

  const handleShareInstagram = async () => {
    if (!myCode) return;
    try {
      // Instagram doesn't support direct sharing via URL scheme for text
      // We'll copy to clipboard and show a message
      await Clipboard.setStringAsync(shareMessage);
      Alert.alert(
        "Copied! 📋", 
        "Share message copied to clipboard!\n\nPaste it in your Instagram story or DM to share with your partner.",
        [{ text: "OK" }]
      );
      closeShareModal();
    } catch (error) {
      Alert.alert("Error", "Could not copy to clipboard.");
    }
  };

  const handleShareSMS = async () => {
    if (!myCode) return;
    const url = `sms:?body=${encodeURIComponent(shareMessage)}`;
    try {
      await Linking.openURL(url);
      closeShareModal();
    } catch (error) {
      Alert.alert("Error", "Could not open Messages.");
    }
  };

  const handleShareEmail = async () => {
    if (!myCode) return;
    const url = `mailto:?subject=Join me on Lovelly&body=${encodeURIComponent(shareMessage)}`;
    try {
      await Linking.openURL(url);
      closeShareModal();
    } catch (error) {
      Alert.alert("Error", "Could not open Email.");
    }
  };

  const handleCopyLink = async () => {
    if (!myCode) return;
    try {
      await Clipboard.setStringAsync(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      Alert.alert("Error", "Could not copy link to clipboard.");
    }
  };

  const handleNativeShare = async () => {
    if (!myCode) return;
    try {
      await Share.share({
        message: shareMessage,
        title: 'Lovelly Pairing Code',
      });
      closeShareModal();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not share code.");
    }
  };

  const handleCreateCode = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    // Check if user already has a coupleId
    if (coupleId) {
      Alert.alert(
        "Already paired",
        "You're already connected with a partner. If you want to create a new code, please disconnect first.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setCreatingCode(true);
      let code = "";
      let attempts = 0;

      while (attempts < 5) {
        code = generateCode();
        const coupleRef = doc(db, "couples", code);
        const existing = await getDoc(coupleRef);
        if (!existing.exists()) {
          await setDoc(coupleRef, {
            code,
            ownerId: user.uid,
            partnerId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Mark this user as part of this couple (owner)
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            coupleId: code,
            updatedAt: serverTimestamp(),
          });

          setMyCode(code);
          setCoupleId(code);
          // Set expiration to 24 hours from now
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          setCodeExpiresAt(expiresAt);
          // Don't change view - stay on selection screen to show both options
          return;
        }
        attempts += 1;
      }

      Alert.alert(
        "Could not create code",
        "We couldn’t generate a unique code. Please try again."
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not create pairing code.");
    } finally {
      setCreatingCode(false);
    }
  };

  const handleJoinByCode = async () => {
    let trimmed = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // Validate code length (should be 5 characters)
    if (!trimmed || trimmed.length !== 5) {
      Alert.alert("Invalid code", "Please enter a valid 5-character code.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    // Check if user already has a coupleId - verify couple document exists and has partner
    if (coupleId && coupleId !== trimmed) {
      try {
        const existingCoupleRef = doc(db, "couples", coupleId);
        const existingCoupleSnap = await getDoc(existingCoupleRef);
        
        if (existingCoupleSnap.exists()) {
          const coupleData = existingCoupleSnap.data();
          const partnerId = coupleData.ownerId === user.uid 
            ? coupleData.partnerId 
            : coupleData.ownerId;
          
          if (partnerId) {
            Alert.alert(
              "Already paired",
              "You're already connected with a partner. If you want to join a different couple, please disconnect first.",
              [{ text: "OK" }]
            );
            return;
          } else {
            // Couple exists but no partner - allow reconnecting
            console.log("Couple exists but no partner, allowing reconnect");
          }
        } else {
          // Couple document doesn't exist - clear invalid coupleId
          console.log("Couple document doesn't exist, clearing invalid coupleId");
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            coupleId: null,
            updatedAt: serverTimestamp(),
          });
          setCoupleId(null);
        }
      } catch (error) {
        console.error("Error checking existing couple:", error);
        // Continue with join process if check fails
      }
    }

    // If already paired with this code, just show success
    if (coupleId === trimmed) {
      Alert.alert("Already connected", "You're already connected with this partner!");
      setJoinCode("");
      return;
    }

    try {
      setJoining(true);
      const coupleRef = doc(db, "couples", trimmed);
      const snap = await getDoc(coupleRef);
      if (!snap.exists()) {
        Alert.alert("Invalid code", "We couldn’t find a couple with that code. Check with your partner.");
        return;
      }

      const data = snap.data() || {};
      if (data.ownerId === user.uid) {
        Alert.alert("This is your code", "Share this code with your partner instead of joining it.");
        setJoinCode(""); // Clear the input
        return;
      }

      // Check if already has a partner
      if (data.partnerId && data.partnerId !== user.uid) {
        Alert.alert("Code already used", "This code has already been used by another partner. Please ask your partner to generate a new code.");
        setJoinCode(""); // Clear the input
        return;
      }

      // Attach this user as partner
      await updateDoc(coupleRef, {
        partnerId: user.uid,
        updatedAt: serverTimestamp(),
      });

      // Update current user
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        coupleId: trimmed,
        updatedAt: serverTimestamp(),
      });

      // Ensure owner also has coupleId set (idempotent)
      if (data.ownerId) {
        const ownerRef = doc(db, "users", data.ownerId);
        await updateDoc(ownerRef, {
          coupleId: trimmed,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      // Update local state
      setCoupleId(trimmed);
      setMyCode(trimmed);
      setJoinCode(""); // Clear the input

      Alert.alert("Success!", "You're now linked with your partner!", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to Home and refresh
            navigation.navigate("Home");
          },
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not join with this code.");
    } finally {
      setJoining(false);
    }
  };

  // Render selection screen with both options
  const renderSelection = () => (
    <ScrollView className="flex-1">
      <View className="gap-6">
        {/* Generate Code Section */}
        <View className="rounded-2xl p-5 border" style={{
          backgroundColor: "#FFFFFF",
          borderColor: colors.secondary.lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.secondary.charcoalGray }}>
            Generate Your Code
          </Text>
          
          {myCode ? (
            <View className="gap-4">
              <View className="rounded-xl p-6 border items-center" style={{
                backgroundColor: colors.primary.rose,
                borderColor: colors.primary.accent,
                borderWidth: 2,
                shadowColor: colors.primary.rose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}>
                <Text className="text-xs mb-3 uppercase tracking-wider" style={{ 
                  color: "#FFFFFF", 
                  opacity: 0.95,
                  fontSize: fontSize(typography.sizes.caption),
                  fontWeight: typography.weights.semibold,
                  letterSpacing: 1.5,
                }}>
                  Your pairing code
              </Text>
                <View className="w-full items-center mb-4 px-2">
                  <Text
                    style={{ 
                      fontSize: fontSize(typography.sizes.h2),
                      fontWeight: typography.weights.bold,
                      letterSpacing: 3,
                      color: "#FFFFFF",
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {myCode}
                  </Text>
                </View>
                <View style={{ 
                  flexDirection: 'row', 
                  gap: wp(spacing.sm),
                  width: '100%',
                }}>
                <Pressable
                  onPress={handleCopyCode}
                    style={{ 
                      flex: 1,
                      borderRadius: wp(borderRadius.md),
                      paddingVertical: hp(spacing.sm),
                      paddingHorizontal: wp(spacing.md),
                      backgroundColor: colors.primary.rose,
                      borderWidth: 2,
                      borderColor: colors.primary.softRose,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: wp(spacing.xs),
                      shadowColor: colors.primary.rose,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons 
                      name={copied ? "checkmark" : "copy-outline"} 
                      size={fontSize(18)} 
                      color="#FFFFFF" 
                    />
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.semibold,
                      color: "#FFFFFF",
                    }}>
                      {copied ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShareCode}
                    style={{ 
                      flex: 1,
                      borderRadius: wp(borderRadius.md),
                      paddingVertical: hp(spacing.sm),
                      paddingHorizontal: wp(spacing.md),
                      backgroundColor: colors.primary.coral,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: wp(spacing.xs),
                      shadowColor: colors.primary.coral,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons 
                      name="share-outline" 
                      size={fontSize(18)} 
                      color="#FFFFFF" 
                    />
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.semibold,
                      color: "#FFFFFF",
                    }}>
                      Share
                  </Text>
                </Pressable>
                </View>
              </View>
              {codeExpiresAt && (
                <Text className="text-xs text-center" style={{ color: colors.status.offline }}>
                  ⏱️ Expires in: {timeRemaining}
                </Text>
              )}
            </View>
          ) : (
            <Pressable
              style={{
                borderRadius: wp(borderRadius.lg),
                paddingVertical: hp(spacing.md),
                paddingHorizontal: wp(spacing.xl),
                backgroundColor: colors.primary.rose,
                shadowColor: colors.primary.rose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: hp(48),
                width: '100%',
                opacity: (creatingCode || !!coupleId) ? 0.6 : 1,
              }}
              onPress={handleCreateCode}
              disabled={creatingCode || !!coupleId}
            >
              <Text style={{ 
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.semibold,
                color: "#FFFFFF",
                textAlign: 'center',
                includeFontPadding: false,
              }}>
                {creatingCode ? "Generating..." : coupleId ? "Already Connected" : "Generate My Code"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Divider */}
        <View className="flex-row items-center gap-4">
          <View className="flex-1 h-px" style={{ backgroundColor: colors.secondary.lightGray }} />
          <Text style={{ color: colors.status.offline }}>OR</Text>
          <View className="flex-1 h-px" style={{ backgroundColor: colors.secondary.lightGray }} />
        </View>

        {/* Enter Partner's Code Section */}
        <View className="rounded-2xl p-5 border" style={{
          backgroundColor: "#FFFFFF",
          borderColor: colors.secondary.lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.secondary.charcoalGray }}>
            Enter Partner's Code
          </Text>
          
              <TextInput
            ref={inputRef}
            className="rounded-2xl px-4 py-4 text-lg border text-center tracking-wider mb-4"
            style={{
              backgroundColor: colors.input.background,
              borderColor: colors.input.border,
              borderWidth: 2,
              color: colors.input.text,
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
            placeholder="XOSUB"
            placeholderTextColor={colors.input.placeholder}
                autoCapitalize="characters"
                value={joinCode}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5);
              setJoinCode(cleaned);
            }}
            onFocus={() => {
              // Scroll to bottom when input is focused to ensure it's visible above keyboard
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
            maxLength={5}
          />

          <Text className="text-xs mb-4 text-center" style={{ color: colors.status.offline }}>
            Don't have a code? Ask your partner to generate one
          </Text>

          <Pressable
            className="rounded-2xl py-4 items-center"
            style={{
              backgroundColor: (joining || !joinCode.trim()) ? colors.primary.dustyPink : colors.primary.softRose,
              shadowColor: colors.primary.softRose,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: (joining || !joinCode.trim()) ? 0 : 0.3,
              shadowRadius: 12,
              elevation: (joining || !joinCode.trim()) ? 0 : 4,
              opacity: (joining || !joinCode.trim()) ? 0.6 : 1,
            }}
            disabled={joining || !joinCode.trim()}
                onPress={handleJoinByCode}
              >
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.bold,
                color: (joining || !joinCode.trim()) ? colors.secondary.charcoalGray : "#FFFFFF",
              }}
            >
              {joining ? "Connecting..." : "Connect with Partner"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  // Render generate code screen
  const renderGenerate = () => (
    <View className="flex-1 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-extrabold mb-2" style={{ color: colors.secondary.charcoalGray }}>
          Your Pairing Code
        </Text>
      </View>

      <View className="gap-6">
        <Text className="text-center text-sm" style={{ color: colors.status.offline }}>
          Share this with your partner
        </Text>

        <View className="rounded-2xl p-6 border items-center" style={{
          backgroundColor: colors.primary.dustyPink,
          borderColor: colors.primary.softRose,
          borderWidth: 2,
        }}>
          <Text
            className="text-2xl font-extrabold mb-4 tracking-wider text-center"
            style={{ color: colors.secondary.charcoalGray }}
          >
            {myCode || ""}
          </Text>
          <Pressable
            onPress={handleCopyCode}
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: colors.primary.softRose }}
          >
            <Text className="font-semibold" style={{ color: "#FFFFFF" }}>
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Text>
          </Pressable>
            </View>

        {codeExpiresAt && (
          <View className="items-center">
            <Text className="text-sm" style={{ color: colors.status.offline }}>
              ⏱️ Code expires in: {timeRemaining}
            </Text>
          </View>
        )}

        <Button
          className="rounded-2xl py-4 items-center"
          style={{
            backgroundColor: colors.primary.softRose,
            shadowColor: colors.primary.softRose,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
          onPress={() => navigation.navigate("Home")}
        >
          <Text
            style={{
                fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            Done, Send to Partner
          </Text>
        </Button>
      </View>
    </View>
  );

  // Render use code screen
  const renderUseCode = () => (
    <View className="flex-1 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-extrabold mb-2" style={{ color: colors.secondary.charcoalGray }}>
          Enter Partner's Code
        </Text>
      </View>

      <View className="gap-6">
        <TextInput
          className="rounded-2xl px-4 py-4 text-lg border text-center tracking-wider"
          style={{
            backgroundColor: colors.input.background,
            borderColor: colors.input.border,
            borderWidth: 2,
            color: colors.input.text,
            fontFamily: "monospace",
            letterSpacing: 2,
          }}
          placeholder="XOSUB"
          placeholderTextColor={colors.input.placeholder}
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5);
            setJoinCode(cleaned);
          }}
          maxLength={5}
        />

        <View className="gap-2">
          <Text className="text-sm text-center" style={{ color: colors.status.offline }}>
            Don't have a code?
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.status.offline }}>
            Ask your partner to generate one
          </Text>
        </View>

        <Button
          className="rounded-2xl py-4 items-center"
          style={{
            backgroundColor: colors.primary.softRose,
            shadowColor: colors.primary.softRose,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
          disabled={joining || !joinCode.trim()}
          onPress={handleJoinByCode}
        >
          <Text
            style={{
                fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            {joining ? "Connecting..." : "Connect"}
          </Text>
        </Button>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ backgroundColor: colors.primary.warmWhite }}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        style={{ backgroundColor: colors.primary.warmWhite }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="flex-1 px-6 py-10">
        {/* Back Button */}
        <Pressable
          onPress={() => {
            if (view === "selection") {
              navigation.goBack();
            } else {
              setView("selection");
            }
          }}
          className="mb-6"
        >
          <Text className="text-base" style={{ color: colors.primary.softRose }}>
            ← Back
          </Text>
        </Pressable>

        {loading ? (
          <View className="items-center justify-center mt-10">
            <ActivityIndicator size="large" color={colors.primary.softRose} />
            <Text className="mt-4 text-sm" style={{ color: colors.status.offline }}>
              Loading your pairing status…
            </Text>
          </View>
        ) : view === "selection" ? (
          renderSelection()
        ) : view === "generate" ? (
          renderGenerate()
        ) : (
          renderUseCode()
        )}
        </View>
      </ScrollView>

      {/* Share Modal - Bottom Sheet */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeShareModal}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={closeShareModal}
        >
          <Animated.View
            style={{
              backgroundColor: colors.background.surface,
              borderTopLeftRadius: wp(borderRadius.xl),
              borderTopRightRadius: wp(borderRadius.xl),
              maxHeight: '90%',
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1000, 0], // Start off-screen at bottom, slide to 0
                  }),
                },
              ],
            }}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: hp(spacing.xl),
                paddingTop: hp(spacing.md),
              }}
            >
              {/* Handle bar */}
              <View style={{ alignItems: 'center', marginBottom: hp(spacing.md) }}>
                <View
                  style={{
                    width: wp(40),
                    height: hp(4),
                    borderRadius: wp(2),
                    backgroundColor: colors.secondary.lightGray,
                  }}
                />
              </View>

              {/* Title */}
              <View style={{ paddingHorizontal: wp(spacing.lg), marginBottom: hp(spacing.lg) }}>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.h3),
                    fontWeight: typography.weights.bold,
                    color: colors.text.primary,
                    marginBottom: hp(spacing.xs),
                  }}
                >
                  Share Your Code
                </Text>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.small),
                    color: colors.text.secondary,
                  }}
                >
                  Choose how you'd like to share your pairing code
                </Text>
              </View>

              {/* Share Options */}
              <View style={{ paddingHorizontal: wp(spacing.lg), marginBottom: hp(spacing.lg) }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* WhatsApp */}
                  <Pressable
                    onPress={handleShareWhatsApp}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: wp(spacing.xs),
                    }}
                  >
                    <View
                      style={{
                        width: wp(48),
                        height: wp(48),
                        borderRadius: wp(24),
                        backgroundColor: colors.background.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: hp(spacing.xs),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={fontSize(24)} color="#25D366" />
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.tiny),
                        fontWeight: typography.weights.medium,
                        color: colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      WhatsApp
                    </Text>
                  </Pressable>

                  {/* Instagram */}
                  <Pressable
                    onPress={handleShareInstagram}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: wp(spacing.xs),
                    }}
                  >
                    <View
                      style={{
                        width: wp(48),
                        height: wp(48),
                        borderRadius: wp(24),
                        backgroundColor: colors.background.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: hp(spacing.xs),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="logo-instagram" size={fontSize(24)} color="#E4405F" />
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.tiny),
                        fontWeight: typography.weights.medium,
                        color: colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      Instagram
                    </Text>
                  </Pressable>

                  {/* SMS */}
                  <Pressable
                    onPress={handleShareSMS}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: wp(spacing.xs),
                    }}
                  >
                    <View
                      style={{
                        width: wp(48),
                        height: wp(48),
                        borderRadius: wp(24),
                        backgroundColor: colors.background.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: hp(spacing.xs),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={fontSize(24)} color={colors.primary.rose} />
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.tiny),
                        fontWeight: typography.weights.medium,
                        color: colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      Messages
                    </Text>
                  </Pressable>

                  {/* Email */}
                  <Pressable
                    onPress={handleShareEmail}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: wp(spacing.xs),
                    }}
                  >
                    <View
                      style={{
                        width: wp(48),
                        height: wp(48),
                        borderRadius: wp(24),
                        backgroundColor: colors.background.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: hp(spacing.xs),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="mail-outline" size={fontSize(24)} color={colors.primary.rose} />
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.tiny),
                        fontWeight: typography.weights.medium,
                        color: colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      Email
                    </Text>
                  </Pressable>

                  {/* More (Native Share) */}
                  <Pressable
                    onPress={handleNativeShare}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: wp(spacing.xs),
                    }}
                  >
                    <View
                      style={{
                        width: wp(48),
                        height: wp(48),
                        borderRadius: wp(24),
                        backgroundColor: colors.background.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: hp(spacing.xs),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="share-outline" size={fontSize(24)} color={colors.primary.rose} />
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.tiny),
                        fontWeight: typography.weights.medium,
                        color: colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      More
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Link Section */}
              <View
                style={{
                  marginHorizontal: wp(spacing.lg),
                  marginBottom: hp(spacing.md),
                  padding: wp(spacing.md),
                  borderRadius: wp(borderRadius.md),
                  backgroundColor: colors.background.card,
                  borderWidth: 1,
                  borderColor: colors.secondary.lightGray,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.small),
                    fontWeight: typography.weights.semibold,
                    color: colors.text.secondary,
                    marginBottom: hp(spacing.xs),
                  }}
                >
                  Shareable Link
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.sm) }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: fontSize(typography.sizes.body),
                      color: colors.text.primary,
                      fontFamily: 'monospace',
                    }}
                    numberOfLines={1}
                  >
                    {shareLink}
                  </Text>
                  <Pressable
                    onPress={handleCopyLink}
                    style={{
                      borderRadius: wp(borderRadius.md),
                      paddingVertical: hp(spacing.xs),
                      paddingHorizontal: wp(spacing.md),
                      backgroundColor: linkCopied ? colors.secondary.successGreen : colors.primary.rose,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: wp(spacing.xs),
                    }}
                  >
                    <Ionicons
                      name={linkCopied ? "checkmark" : "copy-outline"}
                      size={fontSize(16)}
                      color="#FFFFFF"
                    />
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.small),
                        fontWeight: typography.weights.semibold,
                        color: "#FFFFFF",
                      }}
                    >
                      {linkCopied ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Close Button */}
              <View style={{ paddingHorizontal: wp(spacing.lg) }}>
                <Pressable
                  onPress={closeShareModal}
                  style={{
                    borderRadius: wp(borderRadius.md),
                    paddingVertical: hp(spacing.md),
                    paddingHorizontal: wp(spacing.lg),
                    backgroundColor: colors.secondary.lightGray,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize(typography.sizes.body),
                      fontWeight: typography.weights.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}


