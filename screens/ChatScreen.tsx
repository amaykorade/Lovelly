import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Keyboard
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

type ChatScreenProps = {
  navigation: any;
  route: { params?: { partnerId?: string; partnerName?: string; coupleId?: string } };
};

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read?: boolean;
}

const ChatScreen = React.memo(function ChatScreen({ navigation, route }: ChatScreenProps) {
  const partnerName = route.params?.partnerName || "Partner";
  const partnerId = route.params?.partnerId || "";
  const coupleId = route.params?.coupleId || "";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const user = auth.currentUser;

  // Load partner info
  useEffect(() => {
    if (partnerId) {
      const partnerRef = doc(db, "users", partnerId);
      const unsubscribe = onSnapshot(partnerRef, (snap) => {
        const data = snap.data();
        setPartnerAvatar(data?.avatarUrl || null);
        const shareOnlineStatus = data?.settings?.shareOnlineStatus ?? true;
        setPartnerOnline(shareOnlineStatus ? (data?.online || false) : false);
      });
      return () => unsubscribe();
    }
  }, [partnerId]);

  // Load messages in real-time
  useFocusEffect(
    React.useCallback(() => {
      if (!coupleId || !user) {
        setLoading(false);
        return () => {};
      }

      const messagesRef = collection(db, "couples", coupleId, "messages");
      const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));
      let markAsReadTimer: NodeJS.Timeout | null = null;

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messagesList: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesList.push({
              id: doc.id,
              text: data.text || "",
              senderId: data.senderId || "",
              createdAt: data.createdAt,
              read: data.read || false,
            });
          });
          setMessages(messagesList);
          setLoading(false);

          // Mark partner's unread messages as read (debounced to avoid too many updates)
          if (partnerId && markAsReadTimer) {
            clearTimeout(markAsReadTimer);
          }
          
          markAsReadTimer = setTimeout(() => {
            const unreadPartnerMessages = messagesList.filter(
              (msg) => msg.senderId === partnerId && !msg.read
            );
            
            if (unreadPartnerMessages.length > 0) {
              const batch = unreadPartnerMessages.map((msg) => {
                const msgRef = doc(db, "couples", coupleId, "messages", msg.id);
                return updateDoc(msgRef, { read: true });
              });
              Promise.all(batch).catch(console.error);
            }
          }, 500);

          // Auto-scroll to bottom after messages load
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (error) => {
          console.error("Error loading messages:", error);
          setLoading(false);
        }
      );

      return () => {
        if (markAsReadTimer) clearTimeout(markAsReadTimer);
        unsubscribe();
      };
    }, [coupleId, user, partnerId])
  );

  // Auto-scroll when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle keyboard show/hide with smooth animation (Android only)
  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener(
        'keyboardDidShow',
        (event) => {
          Animated.timing(keyboardHeight, {
            toValue: event.endCoordinates.height,
            duration: 250,
            useNativeDriver: false,
          }).start();
        }
      );

      const hideSubscription = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          Animated.timing(keyboardHeight, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
          }).start();
        }
      );

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, [keyboardHeight]);

  const handleSend = async () => {
    if (!messageText.trim() || !coupleId || !user || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const messagesRef = collection(db, "couples", coupleId, "messages");
      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Mark previous unread messages as read when sending a new message
      const unreadMessages = messages.filter(
        (msg) => msg.senderId === partnerId && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        const batch = unreadMessages.map((msg) => {
          const msgRef = doc(db, "couples", coupleId, "messages", msg.id);
          return updateDoc(msgRef, { read: true });
        });
        await Promise.all(batch);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageText(text); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  // Memoize format functions to avoid recreating on every render
  const formatTime = React.useCallback((timestamp: any): string => {
    if (!timestamp) return "";
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "";
    }

    // Always show time in HH:MM format
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toLowerCase().replace(/\s/g, '');
  }, []);

  const formatDateDivider = React.useCallback((timestamp: any): string => {
    if (!timestamp) return "";
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check if it's today
    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    }
    
    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }
    
    // Check if it's this year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
      });
    }
    
    // Show full date for older messages
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const isSameDay = React.useCallback((timestamp1: any, timestamp2: any): boolean => {
    if (!timestamp1 || !timestamp2) return false;
    
    let date1: Date, date2: Date;
    
    if (timestamp1.toDate) {
      date1 = timestamp1.toDate();
    } else if (timestamp1 instanceof Date) {
      date1 = timestamp1;
    } else {
      return false;
    }
    
    if (timestamp2.toDate) {
      date2 = timestamp2.toDate();
    } else if (timestamp2 instanceof Date) {
      date2 = timestamp2;
    } else {
      return false;
    }
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }, []);

  // Memoize helper functions
  const isMyMessage = React.useCallback((senderId: string) => senderId === user?.uid, [user?.uid]);

  const renderMessageStatus = React.useCallback((message: Message) => {
    if (!isMyMessage(message.senderId)) return null;

    const isRead = message.read;
    // For user's messages (pink background), ticks should be white/gray, blue when read
    const tickColor = isRead ? '#4FC3F7' : '#FFFFFF'; // Blue when read, white when not read
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginLeft: wp(4),
        position: 'relative',
        width: wp(16),
        height: fontSize(14),
      }}>
        {/* First tick */}
        <View style={{ position: 'absolute', left: 0 }}>
          <Ionicons 
            name="checkmark" 
            size={fontSize(12)} 
            color={tickColor} 
            style={{ opacity: 0.9 }}
          />
        </View>
        {/* Second tick (slightly offset to create overlap effect) */}
        <View style={{ position: 'absolute', left: wp(6) }}>
          <Ionicons 
            name="checkmark" 
            size={fontSize(12)} 
            color={tickColor} 
            style={{ opacity: 0.9 }}
          />
        </View>
      </View>
    );
  }, [isMyMessage]);

  const handleBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Messages");
    }
  }, [navigation]);

  // Memoize messages list rendering at component level
  const renderedMessages = React.useMemo(() => {
    if (messages.length === 0) return null;
    
    return messages.map((message, index) => {
      const isMine = isMyMessage(message.senderId);
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      
      // Show date divider if this is the first message or if the date changed
      const showDateDivider = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);

      // Always show time for all messages
      const showTime = true;

      // Group messages from same sender (within 5 minutes)
      const isGrouped = prevMessage && 
        prevMessage.senderId === message.senderId &&
        message.createdAt && prevMessage.createdAt &&
        isSameDay(prevMessage.createdAt, message.createdAt) &&
        Math.abs((message.createdAt.toDate?.()?.getTime() || 0) - (prevMessage.createdAt.toDate?.()?.getTime() || 0)) < 300000;

      return (
        <React.Fragment key={message.id}>
          {/* Date Divider */}
          {showDateDivider && (
            <View style={{
              alignItems: 'center',
              marginVertical: hp(spacing.md),
            }}>
              <View style={{
                backgroundColor: colors.background.surface,
                paddingHorizontal: wp(spacing.md),
                paddingVertical: hp(spacing.xs),
                borderRadius: wp(borderRadius.md),
                borderWidth: 1,
                borderColor: colors.secondary.lightGray,
              }}>
                <Text style={{
                  fontSize: fontSize(typography.sizes.caption),
                  color: colors.text.secondary,
                  fontWeight: typography.weights.medium,
                }}>
                  {formatDateDivider(message.createdAt)}
                </Text>
              </View>
            </View>
          )}
          
          <View
            style={{
              marginBottom: hp(spacing.xs),
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}
          >
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            maxWidth: '80%',
            gap: wp(spacing.xs),
          }}>
            {!isMine && !isGrouped && (
              <View style={{
                width: wp(32),
                height: wp(32),
                borderRadius: wp(16),
                backgroundColor: colors.primary.softRose,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: hp(spacing.xs),
              }}>
                {partnerAvatar ? (
                  <Image
                    source={{ uri: partnerAvatar }}
                    style={{
                      width: wp(32),
                      height: wp(32),
                      borderRadius: wp(16),
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.caption),
                    fontWeight: typography.weights.bold,
                    color: colors.primary.rose 
                  }}>
                    {partnerName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            )}
            {!isMine && isGrouped && <View style={{ width: wp(32) }} />}
            
            <View style={{
              maxWidth: '100%',
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}>
              <View style={{
                backgroundColor: isMine ? colors.primary.rose : colors.background.surface,
                paddingHorizontal: wp(spacing.md),
                paddingVertical: hp(spacing.sm),
                borderRadius: wp(borderRadius.lg),
                borderTopLeftRadius: isMine ? wp(borderRadius.lg) : (isGrouped ? wp(borderRadius.sm) : wp(borderRadius.lg)),
                borderTopRightRadius: isMine ? (isGrouped ? wp(borderRadius.sm) : wp(borderRadius.lg)) : wp(borderRadius.lg),
                borderBottomLeftRadius: isMine ? wp(borderRadius.lg) : (isGrouped ? wp(borderRadius.sm) : wp(borderRadius.lg)),
                borderBottomRightRadius: isMine ? (isGrouped ? wp(borderRadius.sm) : wp(borderRadius.lg)) : wp(borderRadius.lg),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }}>
                <Text style={{
                  fontSize: fontSize(typography.sizes.small),
                  fontWeight: typography.weights.regular,
                  color: isMine ? colors.text.inverse : colors.text.primary,
                  lineHeight: fontSize(typography.sizes.small) * 1.5,
                }}>
                  {message.text}
                </Text>
              </View>
              {showTime && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: hp(spacing.xs),
                  paddingHorizontal: wp(spacing.xs),
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}>
                  <Text style={{
                    fontSize: fontSize(10),
                    color: isMine ? '#FFFFFF' : colors.text.tertiary,
                    opacity: isMine ? 0.9 : 1,
                  }}>
                    {formatTime(message.createdAt)}
                  </Text>
                  {isMine && renderMessageStatus(message)}
                </View>
              )}
            </View>
            
            {isMine && (
              <View style={{ width: wp(32) }} />
            )}
          </View>
        </View>
        </React.Fragment>
      );
    });
  }, [messages, formatTime, formatDateDivider, isSameDay, user?.uid, partnerAvatar, partnerName, isMyMessage, renderMessageStatus]);

  // Memoize renderContent to avoid recreating on every render
  const renderContent = React.useCallback(() => {
    return (
      <>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: wp(spacing.lg),
          paddingTop: hp(spacing.xl),
          paddingBottom: hp(spacing.md),
          borderBottomWidth: 1,
          borderBottomColor: colors.secondary.lightGray,
          backgroundColor: colors.background.main,
        }}>
          <Pressable 
            onPress={handleBack}
            style={({ pressed }) => [
              {
                padding: wp(spacing.sm),
                marginRight: wp(spacing.md),
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
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.sm), flex: 1 }}>
            {partnerAvatar ? (
              <Image
                source={{ uri: partnerAvatar }}
                style={{
                  width: wp(40),
                  height: wp(40),
                  borderRadius: wp(20),
                  backgroundColor: colors.secondary.lightGray,
                }}
              />
            ) : (
              <View style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(20),
                backgroundColor: colors.primary.softRose,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ 
                  fontSize: fontSize(typography.sizes.body),
                  fontWeight: typography.weights.bold,
                  color: colors.primary.rose 
                }}>
                  {partnerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.regular,
                color: colors.text.secondary,
              }}>
                {partnerName}
              </Text>
              <Text style={{
                fontSize: fontSize(typography.sizes.caption),
                color: partnerOnline ? colors.status.online : colors.text.secondary,
              }}>
                {partnerOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: wp(spacing.md),
            paddingVertical: hp(spacing.md),
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: hp(20),
            }}>
              <Ionicons 
                name="chatbubbles-outline" 
                size={fontSize(32)} 
                color={colors.text.tertiary} 
              />
              <Text style={{
                fontSize: fontSize(typography.sizes.small),
                fontWeight: typography.weights.regular,
                color: colors.text.secondary,
                textAlign: 'center',
                marginTop: hp(spacing.sm),
              }}>
                No messages yet. Start the conversation! 💬
              </Text>
            </View>
          ) : (
            renderedMessages
          )}
        </ScrollView>

        {/* Message Input */}
        <Animated.View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: wp(spacing.md),
          paddingTop: hp(spacing.sm),
          paddingBottom: hp(spacing.md),
          borderTopWidth: 1,
          borderTopColor: colors.secondary.lightGray,
          backgroundColor: colors.background.main,
          gap: wp(spacing.sm),
          ...(Platform.OS === 'android' && {
            transform: [{
              translateY: keyboardHeight.interpolate({
                inputRange: [0, 500],
                outputRange: [0, -500],
                extrapolate: 'clamp',
              })
            }]
          }),
        }}>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background.surface,
            borderRadius: wp(borderRadius.xl),
            borderWidth: 1,
            borderColor: colors.secondary.lightGray,
            paddingHorizontal: wp(spacing.md),
            paddingVertical: hp(spacing.xs),
            minHeight: hp(44),
            maxHeight: hp(100),
          }}>
            <TextInput
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                fontSize: fontSize(typography.sizes.body),
                color: colors.text.primary,
                paddingVertical: hp(spacing.xs),
                maxHeight: hp(100),
              }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            {messageText.length > 0 && (
              <Text style={{
                fontSize: fontSize(typography.sizes.caption),
                color: colors.text.tertiary,
                marginLeft: wp(spacing.xs),
                alignSelf: 'center',
              }}>
                {messageText.length}/1000
              </Text>
            )}
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            style={({ pressed }) => [
              {
                width: hp(44),
                height: hp(44),
                borderRadius: hp(22),
                backgroundColor: messageText.trim() && !sending 
                  ? colors.primary.rose 
                  : colors.secondary.lightGray,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: messageText.trim() ? colors.primary.rose : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: messageText.trim() ? 3 : 0,
                opacity: pressed ? 0.7 : 1,
              }
            ]}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            {sending ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <Ionicons 
                name="send" 
                size={fontSize(20)} 
                color={messageText.trim() ? colors.text.inverse : colors.text.tertiary} 
              />
            )}
          </Pressable>
        </Animated.View>
      </>
    );
  }, [handleBack, partnerAvatar, partnerName, partnerOnline, messages, formatTime, formatDateDivider, isSameDay, user?.uid, isMyMessage, renderMessageStatus, messageText, sending, handleSend, keyboardHeight]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.main }}>
        <ActivityIndicator size="large" color={colors.primary.rose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.main }}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      ) : (
        renderContent()
      )}
    </View>
  );
});

export { ChatScreen };
