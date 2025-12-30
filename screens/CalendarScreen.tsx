import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Modal, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";
import { SafeArea } from "../components/layout/SafeArea";
import { 
  generateCalendarGrid, 
  getMonthName, 
  getWeekDayNames, 
  formatDateDisplay, 
  formatDateShort,
  formatDateForStorage,
  parseDateFromStorage,
  calculateDaysUntil,
  isToday,
  isInCurrentMonth
} from "../lib/calendarUtils";
import { scheduleEventReminders, cancelEventReminders, defaultReminderSettings } from "../lib/notificationScheduler";

interface Props {
  navigation: any;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  type: 'anniversary' | 'birthday' | 'custom';
  icon: string;
  userId?: string; // For birthdays - whose birthday it is
  reminderEnabled?: boolean;
}

interface PartnerInfo {
  name: string;
  dateOfBirth?: string;
  anniversaryDate?: string;
}

export function CalendarScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [myName, setMyName] = useState<string>("");
  const [myDateOfBirth, setMyDateOfBirth] = useState<string | null>(null);
  
  // Calendar view state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showMonthView, setShowMonthView] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerType, setDatePickerType] = useState<'anniversary' | 'birthday' | null>(null);
  
  // Form state
  const [showAnniversaryForm, setShowAnniversaryForm] = useState(false);
  const [showBirthdayForm, setShowBirthdayForm] = useState(false);
  const [showCustomEventForm, setShowCustomEventForm] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Custom event form state
  const [eventType, setEventType] = useState<'anniversary' | 'birthday' | 'custom'>('custom');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventIcon, setEventIcon] = useState('📅');
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Load calendar data
  useFocusEffect(
    React.useCallback(() => {
      let userUnsubscribe: (() => void) | null = null;
      let partnerUnsubscribe: (() => void) | null = null;
      let eventsUnsubscribe: (() => void) | null = null;
      let currentCoupleId: string | null = null;

      const user = auth.currentUser;
      if (!user) {
        navigation.navigate("Home");
        return () => {};
      }

      let currentPartnerData: any = null;

      const updateEvents = (userData: any, partnerData: any, eventsSnap?: any) => {
        // Update current partner data reference
        if (partnerData) {
          currentPartnerData = partnerData;
        }
        
        const currentEvents: CalendarEvent[] = [];

        // Add anniversary if exists
        if (userData.anniversaryDate) {
          const annivDate = parseDateFromStorage(userData.anniversaryDate);
          currentEvents.push({
            id: "anniversary",
            title: "Anniversary",
            date: userData.anniversaryDate,
            type: "anniversary",
            icon: "💕",
            reminderEnabled: true,
          });
        }

        // Add my birthday
        if (userData.dateOfBirth) {
          currentEvents.push({
            id: `birthday-${user.uid}`,
            title: `${userData.name || 'Your'} Birthday`,
            date: userData.dateOfBirth,
            type: "birthday",
            icon: "🎂",
            userId: user.uid,
            reminderEnabled: true,
          });
        }

        // Add partner's birthday (use currentPartnerData if partnerData is not provided)
        const partnerInfo = partnerData || currentPartnerData;
        if (partnerInfo?.dateOfBirth) {
          currentEvents.push({
            id: `birthday-partner`,
            title: `${partnerInfo.name || 'Partner'}'s Birthday`,
            date: partnerInfo.dateOfBirth,
            type: "birthday",
            icon: "🎂",
            reminderEnabled: true,
          });
        }

        // Add custom events
        if (eventsSnap) {
          eventsSnap.forEach((doc: any) => {
            const data = doc.data();
            currentEvents.push({
              id: doc.id,
              title: data.title,
              date: data.date,
              type: data.type || "custom",
              icon: data.icon || "📅",
              reminderEnabled: data.reminderEnabled ?? true,
            });
          });
        }

        // Sort events by date
        currentEvents.sort((a, b) => {
          const dateA = parseDateFromStorage(a.date);
          const dateB = parseDateFromStorage(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setEvents(currentEvents);
        setLoading(false);
      };

      try {
        const userRef = doc(db, "users", user.uid);
        
        // Real-time listener for user data
        userUnsubscribe = onSnapshot(userRef, async (userSnap) => {
          const userData = userSnap.data() || {};
          
          setMyName(userData.name || "");
          setMyDateOfBirth(userData.dateOfBirth || null);
          setCoupleId(userData.coupleId || null);

          if (userData.coupleId && currentCoupleId !== userData.coupleId) {
            // Clean up old listeners
            if (partnerUnsubscribe) partnerUnsubscribe();
            if (eventsUnsubscribe) eventsUnsubscribe();

            currentCoupleId = userData.coupleId;
            
            // Get couple data to find partner
            const coupleRef = doc(db, "couples", userData.coupleId);
            const coupleSnap = await coupleRef.get();
            const coupleData = coupleSnap.data();
            
            const partnerId = coupleData?.ownerId === user.uid 
              ? coupleData?.partnerId 
              : coupleData?.ownerId;

            if (partnerId) {
              // Listen to partner's data
              const partnerRef = doc(db, "users", partnerId);
              partnerUnsubscribe = onSnapshot(partnerRef, (partnerSnap) => {
                const partnerData = partnerSnap.data() || {};
                currentPartnerData = partnerData;
                setPartner({
                  name: partnerData.name || "Partner",
                  dateOfBirth: partnerData.dateOfBirth || undefined,
                  anniversaryDate: userData.anniversaryDate || undefined,
                });
                // Update events with latest user and partner data
                updateEvents(userData, partnerData);
              });

              // Listen to custom events
              const eventsRef = collection(db, "couples", userData.coupleId, "events");
            eventsUnsubscribe = onSnapshot(eventsRef, (eventsSnap) => {
                // Use currentPartnerData to ensure we have the latest partner info
                updateEvents(userData, currentPartnerData, eventsSnap);
            });
            }
          } else if (!userData.coupleId) {
            if (partnerUnsubscribe) partnerUnsubscribe();
            if (eventsUnsubscribe) eventsUnsubscribe();
            currentPartnerData = null;
            setPartner(null);
            updateEvents(userData, null);
            currentCoupleId = null;
          } else {
            // User data changed but coupleId is same, update with current partner data
            updateEvents(userData, currentPartnerData);
          }
        });
      } catch (error) {
        console.error("Error setting up calendar listeners:", error);
        setLoading(false);
      }

      return () => {
        if (userUnsubscribe) userUnsubscribe();
        if (partnerUnsubscribe) partnerUnsubscribe();
        if (eventsUnsubscribe) eventsUnsubscribe();
      };
    }, [navigation])
  );

  // Schedule reminders when events change
  useEffect(() => {
    if (events.length > 0) {
      events.forEach(async (event) => {
        if (event.reminderEnabled) {
          const eventDate = parseDateFromStorage(event.date);
          await scheduleEventReminders(
            event.id,
            event.title,
            eventDate,
            defaultReminderSettings
          );
        }
      });
    }
  }, [events]);

  const handleSaveAnniversary = async () => {
    if (!anniversaryDate) {
      Alert.alert("Error", "Please select an anniversary date");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        anniversaryDate: formatDateForStorage(anniversaryDate),
        updatedAt: serverTimestamp(),
      });

      // Also update partner's anniversary if they're connected
      if (coupleId) {
        const coupleRef = doc(db, "couples", coupleId);
        const coupleSnap = await coupleRef.get();
        const coupleData = coupleSnap.data();
        const partnerId = coupleData?.ownerId === user.uid 
          ? coupleData?.partnerId 
          : coupleData?.ownerId;

        if (partnerId) {
          const partnerRef = doc(db, "users", partnerId);
          await updateDoc(partnerRef, {
            anniversaryDate: formatDateForStorage(anniversaryDate),
            updatedAt: serverTimestamp(),
          });
        }
      }

      Alert.alert("Success", "Anniversary date saved!");
      setShowAnniversaryForm(false);
      setAnniversaryDate(null);
    } catch (error) {
      console.error("Error saving anniversary:", error);
      Alert.alert("Error", "Failed to save anniversary date");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBirthday = async (isPartner: boolean) => {
    if (!selectedDate) {
      Alert.alert("Error", "Please select a date");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      if (isPartner && coupleId) {
        // Save partner's birthday to couple document
        const coupleRef = doc(db, "couples", coupleId);
        const coupleSnap = await coupleRef.get();
        const coupleData = coupleSnap.data();
        const partnerId = coupleData?.ownerId === user.uid 
          ? coupleData?.partnerId 
          : coupleData?.ownerId;

        if (partnerId) {
          const partnerRef = doc(db, "users", partnerId);
          await updateDoc(partnerRef, {
            dateOfBirth: formatDateForStorage(selectedDate),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Save my birthday
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          dateOfBirth: formatDateForStorage(selectedDate),
          updatedAt: serverTimestamp(),
        });
      }

      Alert.alert("Success", "Birthday saved!");
      setShowBirthdayForm(false);
      setShowDatePicker(false);
      setSelectedDate(new Date());
    } catch (error) {
      console.error("Error saving birthday:", error);
      Alert.alert("Error", "Failed to save birthday");
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = () => {
    // Reset form state
    setEventType('custom');
    setEventTitle('');
    setEventDate(new Date());
    setEventIcon('📅');
    setReminderEnabled(true);
    setShowCustomEventForm(true);
  };

  const handleSaveCustomEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert("Error", "Please enter an event name");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      if (eventType === 'anniversary') {
        // Save anniversary to user profile
        if (!coupleId) {
          Alert.alert("Not Connected", "Please connect with your partner first");
          setSaving(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          anniversaryDate: formatDateForStorage(eventDate),
          updatedAt: serverTimestamp(),
        });

        // Also update partner's anniversary
        const coupleRef = doc(db, "couples", coupleId);
        const coupleSnap = await coupleRef.get();
        const coupleData = coupleSnap.data();
        const partnerId = coupleData?.ownerId === user.uid 
          ? coupleData?.partnerId 
          : coupleData?.ownerId;

        if (partnerId) {
          const partnerRef = doc(db, "users", partnerId);
          await updateDoc(partnerRef, {
            anniversaryDate: formatDateForStorage(eventDate),
            updatedAt: serverTimestamp(),
          });
        }

        Alert.alert("Success", "Anniversary date saved!");
      } else if (eventType === 'birthday') {
        // Save birthday to user profile
        // Check if it's partner's birthday by checking if title contains partner's name
        const isPartnerBirthday = partner && eventTitle.includes(partner.name) && coupleId;
        
        if (isPartnerBirthday && coupleId) {
          const coupleRef = doc(db, "couples", coupleId);
          const coupleSnap = await coupleRef.get();
          const coupleData = coupleSnap.data();
          const partnerId = coupleData?.ownerId === user.uid 
            ? coupleData?.partnerId 
            : coupleData?.ownerId;

          if (partnerId) {
            const partnerRef = doc(db, "users", partnerId);
            await updateDoc(partnerRef, {
              dateOfBirth: formatDateForStorage(eventDate),
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            dateOfBirth: formatDateForStorage(eventDate),
            updatedAt: serverTimestamp(),
          });
        }

        Alert.alert("Success", "Birthday saved!");
      } else {
        // Save as custom event
        if (!coupleId) {
          Alert.alert("Not Connected", "Please connect with your partner first");
          setSaving(false);
          return;
        }

        const eventsRef = collection(db, "couples", coupleId, "events");
        const eventDoc = await addDoc(eventsRef, {
          title: eventTitle.trim(),
          date: formatDateForStorage(eventDate),
          type: eventType,
          icon: eventIcon,
          reminderEnabled,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });

        // Schedule reminders if enabled
        if (reminderEnabled) {
          await scheduleEventReminders(
            eventDoc.id,
            eventTitle.trim(),
            eventDate,
            defaultReminderSettings
          );
        }

        Alert.alert("Success", "Event added successfully!");
      }

      setShowCustomEventForm(false);
      setEventTitle('');
      setEventDate(new Date());
      setEventIcon('📅');
      setEventType('custom');
    } catch (error) {
      console.error("Error saving event:", error);
      Alert.alert("Error", "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const eventIcons = ['📅', '💕', '🎂', '🎉', '🎁', '🌹', '💐', '✨', '🌟', '💖', '🎈', '🍰', '🎊', '💝', '🌺'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const calendarGrid = generateCalendarGrid(currentYear, currentMonth);
  const weekDays = getWeekDayNames();
  const monthName = getMonthName(currentMonth);

  // Get events for a specific date (handles yearly recurring events)
  const getEventsForDate = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    const dateStr = formatDateForStorage(date);
    const month = date.getMonth();
    const day = date.getDate();
    
    return events.filter(e => {
      const eventDate = parseDateFromStorage(e.date);
      // For birthdays and anniversaries, match by month and day (yearly recurring)
      if (e.type === 'birthday' || e.type === 'anniversary') {
        return eventDate.getMonth() === month && eventDate.getDate() === day;
      }
      // For custom events, match exact date
      return e.date === dateStr;
    });
  };

  if (loading) {
  return (
      <SafeArea>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.primary.warmWhite }}>
          <ActivityIndicator size="large" color={colors.primary.softRose} />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.primary.warmWhite }}
    >
        <View className="px-6 pt-4 pb-6">
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: hp(spacing.lg),
        }}>
            <Pressable 
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary.dustyPink,
              }}
            >
              <Text style={{ 
                color: colors.primary.softRose, 
                fontSize: fontSize(20),
                fontWeight: typography.weights.bold,
              }}>
              ←
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.sm) }}>
            <Text style={{ fontSize: fontSize(28) }}>📅</Text>
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.regular,
                color: colors.text.secondary,
              }}
            >
              Our Calendar
            </Text>
          </View>
          <Pressable onPress={handleAddEvent}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary.softRose,
                }}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: fontSize(20), 
                  fontWeight: typography.weights.bold 
                }}>+</Text>
              </View>
          </Pressable>
        </View>

        {!coupleId ? (
          <View className="items-center justify-center mt-20">
              <Text className="text-lg font-semibold mb-2" style={{ color: colors.secondary.charcoalGray, fontSize: fontSize(typography.sizes.h3) }}>
              Not Connected
            </Text>
              <Text className="text-sm text-center mb-6" style={{ color: colors.status.offline, fontSize: fontSize(typography.sizes.body) }}>
              Connect with your partner to view shared calendar
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Pairing")}
              style={{
                borderRadius: borderRadius.xl,
                paddingHorizontal: wp(spacing.lg),
                paddingVertical: hp(spacing.md),
                backgroundColor: colors.primary.softRose,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
                <Text style={{ 
                  fontWeight: typography.weights.semibold, 
                  color: "#FFFFFF", 
                  fontSize: fontSize(typography.sizes.body) 
                }}>
                Connect with Partner
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4">
              {/* Calendar Month View */}
              <View
                className="rounded-2xl p-4 border"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: colors.secondary.lightGray,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                {/* Month Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <Pressable onPress={() => navigateMonth('prev')}>
                    <Text style={{ color: colors.primary.softRose, fontSize: fontSize(18) }}>‹</Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: fontSize(typography.sizes.h2),
                      fontWeight: typography.weights.bold,
                      color: colors.secondary.charcoalGray,
                    }}
                  >
                    {monthName} {currentYear}
                  </Text>
                  <Pressable onPress={() => navigateMonth('next')}>
                    <Text style={{ color: colors.primary.softRose, fontSize: fontSize(18) }}>›</Text>
                  </Pressable>
                </View>

                {/* Week Day Headers */}
                <View className="flex-row mb-2">
                  {weekDays.map((day, index) => (
                    <View key={index} className="flex-1 items-center py-2">
                      <Text
                        style={{
                          fontSize: fontSize(typography.sizes.tiny),
                          fontWeight: typography.weights.semibold,
                          color: colors.status.offline,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Grid */}
                {calendarGrid.map((week, weekIndex) => (
                  <View key={weekIndex} className="flex-row mb-1">
                    {week.map((date, dayIndex) => {
                      const dateEvents = getEventsForDate(date);
                      const isTodayDate = date ? isToday(date) : false;
                      const isCurrentMonth = date ? isInCurrentMonth(date, currentMonth, currentYear) : false;

                      return (
                        <Pressable
                          key={dayIndex}
                          className="flex-1 items-center justify-center py-2"
                          onPress={() => {
                            if (date) {
                              const eventsForDate = getEventsForDate(date);
                              if (eventsForDate.length > 0) {
                                Alert.alert(
                                  formatDateDisplay(date),
                                  eventsForDate.map(e => `• ${e.icon} ${e.title}`).join('\n')
                                );
                              }
                            }
                          }}
                        >
                          {date ? (
                            <View className="items-center">
                              <View
                                className={`w-8 h-8 rounded-full items-center justify-center ${
                                  isTodayDate ? '' : ''
                                }`}
                                style={{
                                  backgroundColor: isTodayDate ? colors.primary.softRose : 'transparent',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: fontSize(typography.sizes.small),
                                    fontWeight: isTodayDate ? typography.weights.bold : typography.weights.regular,
                                    color: isTodayDate 
                                      ? '#FFFFFF' 
                                      : isCurrentMonth 
                                        ? colors.secondary.charcoalGray 
                                        : colors.status.offline,
                                  }}
                                >
                                  {date.getDate()}
                                </Text>
                              </View>
                              {dateEvents.length > 0 && (
                                <View className="flex-row gap-0.5 mt-1">
                                  {dateEvents.slice(0, 3).map((event, idx) => (
                                    <View
                                      key={idx}
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor: event.type === 'anniversary' 
                                          ? colors.primary.softRose 
                                          : event.type === 'birthday'
                                            ? colors.secondary.accentGold
                                            : colors.status.online,
                                      }}
                                    />
                                  ))}
                                </View>
                              )}
                            </View>
                          ) : (
                            <View />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Upcoming Events List */}
              <View>
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.h3),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                    marginBottom: hp(spacing.md),
                  }}
                >
              Upcoming Events
            </Text>

            {events.length === 0 ? (
                  <View
                    className="rounded-2xl p-6 border items-center"
                    style={{
                backgroundColor: "#FFFFFF",
                borderColor: colors.secondary.lightGray,
                    }}
                  >
                    <Text className="text-sm" style={{ color: colors.status.offline, fontSize: fontSize(typography.sizes.body) }}>
                      No events scheduled. Tap + to add events!
                </Text>
              </View>
            ) : (
                  <View className="gap-3">
                    {events.map((event) => {
                      const eventDate = parseDateFromStorage(event.date);
                const daysUntil = calculateDaysUntil(eventDate);
                      const isUpcoming = daysUntil >= 0;
                
                return (
                        <Pressable
                    key={event.id}
                    className="rounded-2xl p-4 border"
                    style={{
                      backgroundColor: "#FFFFFF",
                            borderColor: event.type === 'anniversary' 
                              ? colors.primary.softRose 
                              : colors.secondary.lightGray,
                            borderWidth: event.type === 'anniversary' ? 2 : 1,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 1,
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                            <View
                              className="w-12 h-12 rounded-full items-center justify-center"
                              style={{
                                backgroundColor: event.type === 'anniversary' 
                                  ? colors.primary.dustyPink 
                                  : event.type === 'birthday'
                                    ? '#FFF4E6'
                                    : colors.secondary.lightGray,
                              }}
                            >
                      <Text className="text-2xl">{event.icon}</Text>
                            </View>
                      <View className="flex-1">
                        <Text
                          style={{
                                  fontSize: fontSize(typography.sizes.body),
                            fontWeight: typography.weights.semibold,
                            color: colors.secondary.charcoalGray,
                                  marginBottom: 2,
                          }}
                        >
                          {event.title}
                        </Text>
                        <Text
                          style={{
                                  fontSize: fontSize(typography.sizes.small),
                            color: colors.status.offline,
                          }}
                        >
                                {formatDateDisplay(eventDate)}
                        </Text>
                              {isUpcoming && (
                                <Text
                                  style={{
                                    fontSize: fontSize(typography.sizes.tiny),
                                    color: colors.primary.softRose,
                                    marginTop: 2,
                                  }}
                                >
                                  {daysUntil === 0 
                                    ? 'Today!' 
                                    : `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`}
                                </Text>
                              )}
                      </View>
                            {event.type === 'anniversary' && (
                              <View
                                className="px-2 py-1 rounded-full"
                                style={{ backgroundColor: colors.primary.dustyPink }}
                              >
                                <Text
                                  style={{
                                    fontSize: fontSize(typography.sizes.tiny),
                                    color: colors.primary.deepRose,
                                    fontWeight: typography.weights.semibold,
                                  }}
                                >
                                  Special
                        </Text>
                    </View>
                            )}
                  </View>
                        </Pressable>
                );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Anniversary Date Picker Modal */}
      <Modal
        visible={showAnniversaryForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAnniversaryForm(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: colors.primary.warmWhite }}
          >
            <Text
              style={{
                fontSize: fontSize(typography.sizes.h2),
                fontWeight: typography.weights.bold,
                color: colors.secondary.charcoalGray,
                marginBottom: hp(spacing.md),
              }}
            >
              Set Anniversary Date
            </Text>
            
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={anniversaryDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setAnniversaryDate(date);
                }}
                maximumDate={new Date()}
                style={{ height: 200 }}
              />
            ) : (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  marginBottom: hp(spacing.md),
                }}
              >
                <Text style={{ color: colors.input.text, fontSize: fontSize(typography.sizes.body) }}>
                  {anniversaryDate ? formatDateDisplay(anniversaryDate) : 'Select date'}
                </Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: wp(spacing.md) }}>
            <Pressable
              onPress={() => {
                  setShowAnniversaryForm(false);
                  setAnniversaryDate(null);
              }}
              style={{
                  flex: 1,
                  borderRadius: borderRadius.lg,
                  paddingVertical: hp(spacing.md),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary.warmWhite,
                  borderWidth: 2,
                  borderColor: colors.secondary.lightGray,
                }}
              >
                <Text style={{ color: colors.secondary.charcoalGray, fontSize: fontSize(typography.sizes.body) }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveAnniversary}
                disabled={saving || !anniversaryDate}
                style={{
                  flex: 1,
                  borderRadius: borderRadius.lg,
                  paddingVertical: hp(spacing.md),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary.softRose,
                  opacity: saving || !anniversaryDate ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: fontSize(typography.sizes.body), fontWeight: typography.weights.semibold }}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Birthday Date Picker Modal */}
      <Modal
        visible={showBirthdayForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowBirthdayForm(false);
          setShowDatePicker(false);
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: colors.primary.warmWhite }}
            >
              <Text
                style={{
                fontSize: fontSize(typography.sizes.h2),
                fontWeight: typography.weights.bold,
                color: colors.secondary.charcoalGray,
                marginBottom: hp(spacing.md),
              }}
            >
              {datePickerType === 'birthday' && !partner 
                ? 'Set Your Birthday' 
                : `Set ${partner?.name || 'Partner'}'s Birthday`}
            </Text>
            
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setSelectedDate(date);
                }}
                maximumDate={new Date()}
                style={{ height: 200 }}
              />
            ) : (
              <>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                    maximumDate={new Date()}
                  />
                )}
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className="rounded-xl p-4 border"
                  style={{
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    marginBottom: hp(spacing.md),
                  }}
                >
                  <Text style={{ color: colors.input.text, fontSize: fontSize(typography.sizes.body) }}>
                    {formatDateDisplay(selectedDate)}
                  </Text>
                </Pressable>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: wp(spacing.md) }}>
              <Pressable
                onPress={() => {
                  setShowBirthdayForm(false);
                  setShowDatePicker(false);
                  setSelectedDate(new Date());
                }}
                style={{
                  flex: 1,
                  borderRadius: borderRadius.lg,
                  paddingVertical: hp(spacing.md),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary.warmWhite,
                  borderWidth: 2,
                  borderColor: colors.secondary.lightGray,
                }}
              >
                <Text style={{ color: colors.secondary.charcoalGray, fontSize: fontSize(typography.sizes.body) }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const isPartnerBirthday = datePickerType === 'birthday' && partner !== null && coupleId !== null;
                  handleSaveBirthday(isPartnerBirthday);
                }}
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: borderRadius.lg,
                  paddingVertical: hp(spacing.md),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary.softRose,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: fontSize(typography.sizes.body), fontWeight: typography.weights.semibold }}>
                    Save
              </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Event Form Modal */}
      <Modal
        visible={showCustomEventForm}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowCustomEventForm(false);
          setEventTitle('');
          setEventDate(new Date());
          setEventIcon('📅');
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.primary.warmWhite }}>
          <SafeArea style={{ flex: 1 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              {/* Header */}
              <View 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: wp(spacing.lg),
                  paddingVertical: hp(spacing.md),
                  borderBottomWidth: 1,
                  borderBottomColor: colors.secondary.lightGray,
                  backgroundColor: colors.primary.warmWhite,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.h2),
                    fontWeight: typography.weights.bold,
                    color: colors.secondary.charcoalGray,
                  }}
                >
                  Add New Event
                </Text>
                <Pressable
                  onPress={() => {
                    setShowCustomEventForm(false);
                    setEventTitle('');
                    setEventDate(new Date());
                    setEventIcon('📅');
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary.lightGray,
                  }}
                >
                  <Text style={{ 
                    fontSize: fontSize(24), 
                    color: colors.secondary.charcoalGray,
                    lineHeight: fontSize(24),
                  }}>×</Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ 
                  paddingBottom: hp(20),
                  paddingTop: hp(spacing.md),
                }}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
              >
                <View style={{ paddingHorizontal: wp(spacing.lg), paddingTop: hp(spacing.md) }}>
              {/* Event Type Selection */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                  fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                    marginBottom: hp(spacing.sm),
                  }}
                >
                  Event Type
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      if (!coupleId) {
                        Alert.alert("Not Connected", "Please connect with your partner first");
                        return;
                      }
                      setEventType('anniversary');
                      setEventTitle('Anniversary');
                      setEventIcon('💕');
                    }}
                    className="flex-1 rounded-xl p-4 border-2 items-center"
                    style={{
                      backgroundColor: eventType === 'anniversary' ? colors.primary.dustyPink : colors.primary.warmWhite,
                      borderColor: eventType === 'anniversary' ? colors.primary.softRose : colors.secondary.lightGray,
                }}
              >
                    <Text className="text-2xl mb-1">💕</Text>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.small),
                        fontWeight: typography.weights.semibold,
                        color: eventType === 'anniversary' ? colors.primary.deepRose : colors.secondary.charcoalGray,
                      }}
                    >
                      Anniversary
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!coupleId && partner) {
                        Alert.alert("Not Connected", "Please connect with your partner first");
                        return;
                      }
                      setEventType('birthday');
                      // Default to partner's birthday if connected, otherwise user's
                      if (partner && coupleId) {
                        setEventTitle(`${partner.name}'s Birthday`);
                      } else {
                        setEventTitle('My Birthday');
                      }
                      setEventIcon('🎂');
                    }}
                    className="flex-1 rounded-xl p-4 border-2 items-center"
                    style={{
                      backgroundColor: eventType === 'birthday' ? '#FFF4E6' : colors.primary.warmWhite,
                      borderColor: eventType === 'birthday' ? colors.secondary.accentGold : colors.secondary.lightGray,
                    }}
                  >
                    <Text className="text-2xl mb-1">🎂</Text>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.small),
                        fontWeight: typography.weights.semibold,
                        color: colors.secondary.charcoalGray,
                      }}
                    >
                      Birthday
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEventType('custom');
                      setEventTitle('');
                      setEventIcon('📅');
                    }}
                    className="flex-1 rounded-xl p-4 border-2 items-center"
                    style={{
                      backgroundColor: eventType === 'custom' ? colors.secondary.lightGray : colors.primary.warmWhite,
                      borderColor: eventType === 'custom' ? colors.secondary.charcoalGray : colors.secondary.lightGray,
                    }}
                  >
                    <Text className="text-2xl mb-1">📅</Text>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.small),
                        fontWeight: typography.weights.semibold,
                        color: colors.secondary.charcoalGray,
                      }}
                    >
                      Custom
              </Text>
            </Pressable>
          </View>
      </View>

              {/* Event Name Input */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                    marginBottom: hp(spacing.sm),
                  }}
                >
                  Event Name
                </Text>
                <TextInput
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  placeholder={eventType === 'anniversary' ? 'Anniversary' : eventType === 'birthday' ? 'Birthday' : 'e.g., First Date, Vacation, etc.'}
                  placeholderTextColor={colors.input.placeholder}
                  className="rounded-xl p-4 border"
                  style={{
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    fontSize: fontSize(typography.sizes.body),
                    color: colors.input.text,
                  }}
                  autoCapitalize="words"
                />
              </View>

              {/* Date Selection */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                    marginBottom: hp(spacing.sm),
                  }}
                >
                  Date
                </Text>
                <Pressable
                  onPress={() => setShowEventDatePicker(true)}
                  className="rounded-xl p-4 border flex-row items-center justify-between"
                  style={{
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize(typography.sizes.body), color: colors.input.text }}>
                    {formatDateDisplay(eventDate)}
                  </Text>
                  <Text style={{ fontSize: fontSize(20) }}>📅</Text>
                </Pressable>
              </View>

              {/* Icon Selection */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.secondary.charcoalGray,
                    marginBottom: hp(spacing.sm),
                  }}
                >
                  Icon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row gap-3"
                >
                  {eventIcons.map((icon) => (
                    <Pressable
                      key={icon}
                      onPress={() => setEventIcon(icon)}
                      className="w-12 h-12 rounded-xl items-center justify-center border-2"
                      style={{
                        backgroundColor: eventIcon === icon ? colors.primary.dustyPink : colors.primary.warmWhite,
                        borderColor: eventIcon === icon ? colors.primary.softRose : colors.secondary.lightGray,
                      }}
                    >
                      <Text className="text-2xl">{icon}</Text>
                    </Pressable>
                  ))}
    </ScrollView>
              </View>

              {/* Reminder Toggle */}
              <View className="mb-6">
                <Pressable
                  onPress={() => setReminderEnabled(!reminderEnabled)}
                  className="flex-row items-center justify-between rounded-xl p-4 border"
                  style={{
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                  }}
                >
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.body),
                        fontWeight: typography.weights.semibold,
                        color: colors.secondary.charcoalGray,
                        marginBottom: 2,
                      }}
                    >
                      Enable Reminders
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize(typography.sizes.small),
                        color: colors.status.offline,
                      }}
                    >
                      Get notified before the event
                    </Text>
                  </View>
                  <View
                    className="w-12 h-6 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: reminderEnabled ? colors.primary.softRose : colors.secondary.lightGray,
                    }}
                  >
                    <View
                      className="w-5 h-5 rounded-full absolute"
                      style={{
                        backgroundColor: '#FFFFFF',
                        left: reminderEnabled ? 28 : 2,
                      }}
                    />
                  </View>
                </Pressable>
              </View>
                </View>
              </ScrollView>

              {/* Action Buttons - Fixed at bottom */}
              <View 
                style={{
                  paddingHorizontal: wp(spacing.lg),
                  paddingTop: hp(spacing.md),
                  paddingBottom: hp(spacing.lg),
                  borderTopWidth: 1,
                  borderTopColor: colors.secondary.lightGray,
                  backgroundColor: colors.primary.warmWhite,
                }}
              >
                <View style={{ flexDirection: 'row', gap: wp(spacing.md) }}>
                  <Pressable
                    onPress={() => {
                      setShowCustomEventForm(false);
                      setEventTitle('');
                      setEventDate(new Date());
                      setEventIcon('📅');
                    }}
                    style={{
                      flex: 1,
                      borderRadius: borderRadius.lg,
                      paddingVertical: hp(spacing.md),
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.primary.warmWhite,
                      borderWidth: 2,
                      borderColor: colors.secondary.lightGray,
                    }}
                  >
                    <Text style={{ 
                      color: colors.secondary.charcoalGray, 
                      fontSize: fontSize(typography.sizes.body), 
                      fontWeight: typography.weights.semibold 
                    }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveCustomEvent}
                    disabled={saving || !eventTitle.trim()}
                    style={{
                      flex: 1,
                      borderRadius: borderRadius.lg,
                      paddingVertical: hp(spacing.md),
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.primary.softRose,
                      opacity: saving || !eventTitle.trim() ? 0.6 : 1,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ 
                        color: "#FFFFFF", 
                        fontSize: fontSize(typography.sizes.body), 
                        fontWeight: typography.weights.semibold 
                      }}>
                        Add Event
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
          </KeyboardAvoidingView>
        </SafeArea>
        </View>
      </Modal>

      {/* Event Date Picker (iOS) */}
      {Platform.OS === 'ios' && showEventDatePicker && (
        <Modal
          visible={showEventDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEventDatePicker(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View
              className="rounded-t-3xl p-6"
              style={{ backgroundColor: colors.primary.warmWhite }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.h3),
                    fontWeight: typography.weights.bold,
                    color: colors.secondary.charcoalGray,
                  }}
                >
                  Select Date
                </Text>
                <Pressable onPress={() => setShowEventDatePicker(false)}>
                  <Text style={{ color: colors.primary.softRose, fontSize: fontSize(typography.sizes.body), fontWeight: typography.weights.semibold }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setEventDate(date);
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker for Events */}
      {Platform.OS === 'android' && showEventDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEventDatePicker(false);
            if (event.type === 'set' && date) {
              setEventDate(date);
            }
          }}
        />
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && datePickerType === 'birthday' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              setSelectedDate(date);
              setShowBirthdayForm(true);
            } else if (event.type === 'dismissed') {
              setShowDatePicker(false);
            }
          }}
          maximumDate={new Date()}
        />
      )}
    </SafeArea>
  );
}
