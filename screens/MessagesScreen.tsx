import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
  route?: any;
}

interface PartnerInfo {
  name: string;
  avatarUrl?: string;
  online?: boolean;
  lastSeen?: any;
  userId: string;
}

interface LastMessage {
  text: string;
  timestamp: any;
  senderId: string;
  read?: boolean;
}

export function MessagesScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [lastMessage, setLastMessage] = useState<LastMessage | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let userUnsubscribe: (() => void) | null = null;
    let coupleUnsubscribe: (() => void) | null = null;
    let partnerUnsubscribe: (() => void) | null = null;
    let messagesUnsubscribe: (() => void) | null = null;
    let currentCoupleId: string | null = null;
    let currentPartnerId: string | null = null;

      const user = auth.currentUser;
      if (!user) {
        navigation.navigate("Home");
        return () => {};
      }

      const setupPartnerListeners = (coupleId: string, partnerId: string) => {
      // Only set up if partner changed
      if (currentPartnerId === partnerId && partnerUnsubscribe) {
        return;
      }

      // Clean up old listeners
      if (partnerUnsubscribe) partnerUnsubscribe();
      if (messagesUnsubscribe) messagesUnsubscribe();

      // Real-time listener for partner info
      const partnerRef = doc(db, "users", partnerId);
      partnerUnsubscribe = onSnapshot(partnerRef, (partnerSnap) => {
        const partnerData = partnerSnap.data() || {};
        
        // Check if partner has "Share Online Status" enabled
        const shareOnlineStatus = partnerData.settings?.shareOnlineStatus ?? true;
        const isOnline = shareOnlineStatus ? (partnerData.online || false) : false;

        setPartner({
          name: partnerData.name || "Partner",
          avatarUrl: partnerData.avatarUrl || null,
          online: isOnline,
          lastSeen: partnerData.lastSeen || null,
          userId: partnerId,
        });
      });

        // Real-time listener for last message and unread count
      const messagesRef = collection(db, "couples", coupleId, "messages");
        const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(50));
      
      messagesUnsubscribe = onSnapshot(messagesQuery, (messagesSnap) => {
        if (!messagesSnap.empty) {
          const messageDoc = messagesSnap.docs[0];
          const messageData = messageDoc.data();
          setLastMessage({
            text: messageData.text || "",
            timestamp: messageData.createdAt,
            senderId: messageData.senderId || "",
              read: messageData.read || false,
            });
            
            // Count unread messages (messages from partner that are unread)
            let unread = 0;
            messagesSnap.forEach((doc) => {
              const data = doc.data();
              if (data.senderId === partnerId && !data.read) {
                unread++;
              }
          });
            setUnreadCount(unread);
        } else {
          setLastMessage(null);
            setUnreadCount(0);
        }
      });

        currentPartnerId = partnerId;
      };

      try {
        const userRef = doc(db, "users", user.uid);
      
        // Real-time listener for user data
        userUnsubscribe = onSnapshot(userRef, (userSnap) => {
          const userData = userSnap.data() || {};
        const userCoupleId = userData.coupleId;

        if (!userCoupleId) {
          // Not paired yet - clean up listeners
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
            coupleUnsubscribe = null;
          }
          if (partnerUnsubscribe) {
            partnerUnsubscribe();
            partnerUnsubscribe = null;
          }
          if (messagesUnsubscribe) {
            messagesUnsubscribe();
            messagesUnsubscribe = null;
          }
          setCoupleId(null);
          setPartner(null);
          setLastMessage(null);
            setUnreadCount(0);
          setLoading(false);
          currentCoupleId = null;
          currentPartnerId = null;
          return;
        }

        // Only set up couple listener if coupleId changed
        if (currentCoupleId !== userCoupleId) {
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
          }

          setCoupleId(userCoupleId);
          currentCoupleId = userCoupleId;

          // Real-time listener for couple data
          const coupleRef = doc(db, "couples", userCoupleId);
          coupleUnsubscribe = onSnapshot(coupleRef, (coupleSnap) => {
            const coupleData = coupleSnap.data();

            // If couple document deleted (disconnected), clear partner immediately
            if (!coupleData || !coupleSnap.exists()) {
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
              }
              setPartner(null);
              setLastMessage(null);
              setCoupleId(null);
                setUnreadCount(0);
              return;
            }

            // Find partner ID
            const partnerId = coupleData.ownerId === user.uid 
              ? coupleData.partnerId 
              : coupleData.ownerId;

            if (partnerId) {
              setupPartnerListeners(userCoupleId, partnerId);
            } else {
              // No partner ID - clear partner
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
              }
              setPartner(null);
              setLastMessage(null);
                setUnreadCount(0);
            }
          });
        }
        });
      } catch (error) {
        console.error("Error setting up listeners:", error);
      } finally {
        setLoading(false);
      }

      // Cleanup
      return () => {
        if (userUnsubscribe) userUnsubscribe();
        if (coupleUnsubscribe) coupleUnsubscribe();
        if (partnerUnsubscribe) partnerUnsubscribe();
        if (messagesUnsubscribe) messagesUnsubscribe();
      };
    }, [navigation])
  );

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return "";
    }
  };

  const handleConversationPress = () => {
    if (partner && coupleId) {
      navigation.navigate("Chat", { 
        partnerId: partner.userId, 
        partnerName: partner.name,
        coupleId: coupleId
      });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.main }}>
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
        justifyContent: 'space-between',
        paddingHorizontal: wp(spacing.lg),
        paddingTop: hp(spacing.xl),
        paddingBottom: hp(spacing.md),
        borderBottomWidth: 1,
        borderBottomColor: colors.secondary.lightGray,
      }}>
        <Pressable 
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
          style={({ pressed }) => [
            {
              padding: wp(spacing.sm),
              opacity: pressed ? 0.6 : 1,
            }
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Ionicons 
            name="chevron-back" 
            size={fontSize(24)} 
            color={colors.text.primary} 
          />
        </Pressable>
        <Text style={{
          fontSize: fontSize(typography.sizes.body),
          fontWeight: typography.weights.regular,
          color: colors.text.secondary,
        }}>
          Messages
        </Text>
        <View style={{ width: wp(40) }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {!coupleId ? (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: hp(20),
            paddingHorizontal: wp(spacing.lg),
          }}>
            <Ionicons 
              name="chatbubbles-outline" 
              size={fontSize(64)} 
              color={colors.text.tertiary} 
            />
            <Text style={{
              fontSize: fontSize(typography.sizes.body),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginTop: hp(spacing.md),
              marginBottom: hp(spacing.xs),
            }}>
              Not Connected
            </Text>
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              textAlign: 'center',
              marginBottom: hp(spacing.xl),
            }}>
              Connect with your partner to start messaging
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Pairing")}
              style={({ pressed }) => [
                {
                  borderRadius: wp(borderRadius.md),
                  paddingVertical: hp(spacing.md),
                  paddingHorizontal: wp(spacing.xl),
                  backgroundColor: colors.primary.rose,
                  shadowColor: colors.primary.rose,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 5,
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Text style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.semibold,
                color: colors.text.inverse,
              }}>
                Connect with Partner
              </Text>
            </Pressable>
          </View>
        ) : !partner ? (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: hp(20),
          }}>
            <ActivityIndicator size="large" color={colors.primary.rose} />
            <Text style={{
              fontSize: fontSize(typography.sizes.small),
              color: colors.text.secondary,
              marginTop: hp(spacing.md),
            }}>
              Loading partner information...
            </Text>
          </View>
        ) : (
          <View style={{ padding: wp(spacing.md) }}>
            {/* Conversation Item */}
            <Pressable
              onPress={handleConversationPress}
              style={({ pressed }) => [
                {
                  borderRadius: wp(borderRadius.lg),
                  padding: wp(spacing.md),
                  backgroundColor: colors.background.surface,
                  borderWidth: 1,
                borderColor: colors.secondary.lightGray,
                shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                shadowRadius: 4,
                  elevation: 2,
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.md) }}>
                  {/* Avatar */}
                <View style={{ position: 'relative' }}>
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
                      borderWidth: 2,
                      borderColor: colors.primary.rose,
                    }}>
                      <Text style={{
                        fontSize: fontSize(typography.sizes.h3),
                        fontWeight: typography.weights.bold,
                        color: colors.primary.rose,
                      }}>
                          {partner.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {/* Online Status Indicator */}
                  {partner.online && (
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: wp(16),
                      height: wp(16),
                      borderRadius: wp(8),
                      backgroundColor: colors.status.online,
                      borderWidth: 2,
                      borderColor: colors.background.surface,
                    }} />
                  )}
                  </View>

                  {/* Message Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: hp(spacing.xs),
                  }}>
                    <Text style={{
                      fontSize: fontSize(typography.sizes.body),
                          fontWeight: typography.weights.semibold,
                      color: colors.text.primary,
                    }}>
                        {partner.name}
                      </Text>
                      {lastMessage && (
                      <Text style={{
                        fontSize: fontSize(typography.sizes.caption),
                        color: colors.text.secondary,
                      }}>
                          {formatTimestamp(lastMessage.timestamp)}
                        </Text>
                      )}
                    </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.xs) }}>
                    {lastMessage ? (
                      <Text
                        style={{
                          fontSize: fontSize(typography.sizes.small),
                          color: lastMessage.senderId === partner.userId && !lastMessage.read 
                            ? colors.text.primary 
                            : colors.text.secondary,
                          fontWeight: lastMessage.senderId === partner.userId && !lastMessage.read 
                            ? typography.weights.semibold 
                            : typography.weights.regular,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {lastMessage.text}
                      </Text>
                    ) : (
                      <Text style={{
                        fontSize: fontSize(typography.sizes.small),
                        color: colors.text.secondary,
                        fontStyle: 'italic',
                      }}>
                        No messages yet
                      </Text>
                    )}
                    {unreadCount > 0 && (
                      <View style={{
                        minWidth: wp(20),
                        height: wp(20),
                        borderRadius: wp(10),
                        backgroundColor: colors.primary.rose,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: wp(spacing.xs),
                      }}>
                        <Text style={{
                          fontSize: fontSize(typography.sizes.caption),
                          fontWeight: typography.weights.bold,
                          color: colors.text.inverse,
                        }}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                    )}
                  </View>
                </View>

                {/* Arrow */}
                <Ionicons 
                  name="chevron-forward" 
                  size={fontSize(20)} 
                  color={colors.text.tertiary} 
                />
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
