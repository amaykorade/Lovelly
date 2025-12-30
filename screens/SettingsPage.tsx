import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, Switch, InteractionManager } from "react-native";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

const SettingsPage = React.memo(function SettingsPage({ navigation }: Props) {
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

  // Load settings from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data() || {};
      const settings = data.settings || {};
      
      setLocationSharing(settings.locationSharing ?? true);
      setShareOnlineStatus(settings.shareOnlineStatus ?? true);
      setEndToEndEncryption(settings.endToEndEncryption ?? true);
      setMessageNotifications(settings.messageNotifications ?? true);
      setLocationUpdates(settings.locationUpdates ?? true);
      setShareLocationWithPartner(settings.shareLocationWithPartner ?? true);
      setTypingStatus(settings.typingStatus ?? false);
      setShowDistanceWidget(settings.showDistanceWidget ?? false);
      setShowAnniversaryWidget(settings.showAnniversaryWidget ?? false);
      setShowBirthdayWidget(settings.showBirthdayWidget ?? false);
    });

    return () => unsubscribe();
  }, []);

  const updateSetting = useCallback(async (setting: string, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

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

        if (setting === 'shareOnlineStatus' && !value) {
          updateData.online = false;
          updateData.lastSeen = serverTimestamp();
        }

        await updateDoc(userRef, updateData);
      } catch (error) {
        console.error("Error updating setting:", error);
      }
    });
  }, []);

  const SettingRow = ({ 
    label, 
    value, 
    onValueChange, 
    settingKey,
    description,
    isLast = false
  }: { 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
    settingKey?: string;
    description?: string;
    isLast?: boolean;
  }) => (
    <View style={{
      paddingVertical: hp(spacing.lg),
      paddingHorizontal: wp(spacing.lg),
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.secondary.lightGray,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1, marginRight: wp(spacing.lg), paddingRight: wp(spacing.sm) }}>
          <Text style={{ 
            fontSize: fontSize(typography.sizes.body), 
            color: colors.text.primary,
            fontWeight: typography.weights.medium,
            marginBottom: description ? hp(4) : 0,
          }}>
            {label}
          </Text>
          {description && (
            <Text style={{
              fontSize: fontSize(typography.sizes.caption),
              color: colors.text.tertiary,
              lineHeight: fontSize(typography.sizes.caption) * 1.4,
            }}>
              {description}
            </Text>
          )}
        </View>
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
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.main }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
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
              alignItems: 'center',
              opacity: pressed ? 0.5 : 1,
              paddingLeft: wp(spacing.lg),
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
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{
            fontSize: fontSize(typography.sizes.body),
            fontWeight: typography.weights.regular,
            color: colors.text.secondary,
            textAlign: 'center',
          }}>
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: hp(spacing.xl * 2) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: wp(spacing.lg), paddingTop: hp(spacing.xl) }}>
          {/* Privacy & Security Section */}
          <View style={{ marginBottom: hp(spacing.xl * 1.5) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.h3),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.lg),
              paddingHorizontal: wp(spacing.xs),
            }}>
              Privacy & Security
            </Text>
            <View style={{
              borderRadius: wp(borderRadius.lg),
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
              overflow: 'hidden',
            }}>
              <SettingRow
                label="Location Sharing"
                value={locationSharing}
                onValueChange={setLocationSharing}
                settingKey="locationSharing"
                description="Allow the app to access your location"
              />
              <SettingRow
                label="Share Online Status"
                value={shareOnlineStatus}
                onValueChange={setShareOnlineStatus}
                settingKey="shareOnlineStatus"
                description="Let your partner see when you're online"
              />
              <SettingRow
                label="End-to-end Encryption"
                value={endToEndEncryption}
                onValueChange={setEndToEndEncryption}
                settingKey="endToEndEncryption"
                description="Encrypt your messages for privacy"
              />
              <SettingRow
                label="Share My Location with Partner"
                value={shareLocationWithPartner}
                onValueChange={setShareLocationWithPartner}
                settingKey="shareLocationWithPartner"
                description="Allow your partner to see your location on the map"
                isLast={true}
              />
            </View>
          </View>

          {/* Notifications Section */}
          <View style={{ marginBottom: hp(spacing.xl * 1.5) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.h3),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.lg),
              paddingHorizontal: wp(spacing.xs),
            }}>
              Notifications
            </Text>
            <View style={{
              borderRadius: wp(borderRadius.lg),
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
              overflow: 'hidden',
            }}>
              <SettingRow
                label="Messages"
                value={messageNotifications}
                onValueChange={setMessageNotifications}
                settingKey="messageNotifications"
                description="Get notified when you receive messages"
              />
              <SettingRow
                label="Location Updates"
                value={locationUpdates}
                onValueChange={setLocationUpdates}
                settingKey="locationUpdates"
                description="Get notified when your partner's location changes"
              />
              <SettingRow
                label="Typing Status"
                value={typingStatus}
                onValueChange={setTypingStatus}
                settingKey="typingStatus"
                description="Show when your partner is typing"
                isLast={true}
              />
            </View>
          </View>

          {/* Widgets Section */}
          <View style={{ marginBottom: hp(spacing.xl * 1.5) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.h3),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.lg),
              paddingHorizontal: wp(spacing.xs),
            }}>
              Widgets
            </Text>
            <View style={{
              borderRadius: wp(borderRadius.lg),
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
              overflow: 'hidden',
            }}>
              <SettingRow
                label="Distance Widget"
                value={showDistanceWidget}
                onValueChange={setShowDistanceWidget}
                settingKey="showDistanceWidget"
                description="Show distance to your partner on home screen"
              />
              <SettingRow
                label="Anniversary Widget"
                value={showAnniversaryWidget}
                onValueChange={setShowAnniversaryWidget}
                settingKey="showAnniversaryWidget"
                description="Show anniversary countdown on home screen"
              />
              <SettingRow
                label="Birthday Widget"
                value={showBirthdayWidget}
                onValueChange={setShowBirthdayWidget}
                settingKey="showBirthdayWidget"
                description="Show partner's birthday countdown on home screen"
                isLast={true}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={{ marginBottom: hp(spacing.xl) }}>
            <Text style={{
              fontSize: fontSize(typography.sizes.h3),
              fontWeight: typography.weights.semibold,
              color: colors.text.primary,
              marginBottom: hp(spacing.lg),
              paddingHorizontal: wp(spacing.xs),
            }}>
              About
            </Text>
            <View style={{
              borderRadius: wp(borderRadius.lg),
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
              paddingVertical: hp(spacing.lg),
              paddingHorizontal: wp(spacing.lg),
            }}>
              <View style={{ marginBottom: hp(spacing.lg) }}>
                <Text style={{
                  fontSize: fontSize(typography.sizes.body),
                  color: colors.text.secondary,
                }}>
                  App Version: 1.0.0
                </Text>
              </View>
              <View style={{ 
                flexDirection: 'row', 
                gap: wp(spacing.xl),
                flexWrap: 'wrap',
              }}>
                <Pressable 
                  onPress={() => Alert.alert("Feedback", "Feedback feature coming soon!")}
                  style={({ pressed }) => [
                    { 
                      opacity: pressed ? 0.6 : 1,
                      paddingVertical: hp(spacing.xs),
                    }
                  ]}
                >
                  <Text style={{ 
                    color: colors.primary.rose, 
                    fontWeight: typography.weights.semibold,
                    fontSize: fontSize(typography.sizes.body),
                  }}>
                    Feedback
                  </Text>
                </Pressable>
                <Pressable 
                  onPress={() => Alert.alert("Terms", "Terms of Service coming soon!")}
                  style={({ pressed }) => [
                    { 
                      opacity: pressed ? 0.6 : 1,
                      paddingVertical: hp(spacing.xs),
                    }
                  ]}
                >
                  <Text style={{ 
                    color: colors.primary.rose, 
                    fontWeight: typography.weights.semibold,
                    fontSize: fontSize(typography.sizes.body),
                  }}>
                    Terms
                  </Text>
                </Pressable>
                <Pressable 
                  onPress={() => Alert.alert("Policy", "Privacy Policy coming soon!")}
                  style={({ pressed }) => [
                    { 
                      opacity: pressed ? 0.6 : 1,
                      paddingVertical: hp(spacing.xs),
                    }
                  ]}
                >
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
        </View>
      </ScrollView>
    </View>
  );
});

export { SettingsPage };

