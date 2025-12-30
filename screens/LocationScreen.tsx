import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform, Animated } from "react-native";
import { WebView } from "react-native-webview";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import * as Location from "expo-location";
import { auth, db } from "../lib/firebase";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";

interface Props {
  navigation: any;
}

interface LocationData {
  latitude: number;
  longitude: number;
  label?: string;
  timestamp: any;
}

export function LocationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<LocationData | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current; // For pulsing partner avatar ring

  // Pulsing animation for partner's location indicator
  useEffect(() => {
    if (partnerLocation) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [partnerLocation]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get current location
  const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to share your location. Please enable it in settings."
        );
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return location;
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not get your location. Please try again.");
      return null;
    }
  };

  // Update my location in Firestore
  const updateMyLocation = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setUpdatingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setUpdatingLocation(false);
        return;
      }

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: serverTimestamp(),
      };

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        location: locationData,
        updatedAt: serverTimestamp(),
      });

      setMyLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        label: "Current Location",
        timestamp: new Date(),
      });

      // Update last updated time
      setLastUpdated("Just now");
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Could not update location.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Start/Stop location sharing
  const toggleLocationSharing = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!isSharing) {
      // Start sharing
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Location permission is required to share your location."
        );
        return;
      }

      // Update setting
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "settings.locationSharing": true,
        updatedAt: serverTimestamp(),
      });

      setIsSharing(true);
      
      // Get initial location immediately
      try {
        await updateMyLocation();
      } catch (error) {
        console.error("Error updating location:", error);
      }

      // Update location every 30 seconds
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      locationIntervalRef.current = setInterval(() => {
        updateMyLocation().catch(err => console.error("Error in location update interval:", err));
      }, 30000);
    } else {
      // Stop sharing
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "settings.locationSharing": false,
        updatedAt: serverTimestamp(),
      });

      setIsSharing(false);
    }
  };

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

    const setupPartnerListener = (coupleId: string, partnerId: string) => {
      // Only set up if partner changed
      if (currentPartnerId === partnerId && partnerUnsubscribe) {
        return;
      }

      // Clean up old listener
      if (partnerUnsubscribe) {
        partnerUnsubscribe();
      }

      setPartnerId(partnerId);
      const partnerRef = doc(db, "users", partnerId);
      
      // Real-time listener for partner's location and info
      partnerUnsubscribe = onSnapshot(partnerRef, (partnerSnap) => {
        const partnerData = partnerSnap.data() || {};
        
        setPartnerName(partnerData.name || "Partner");

        // Only show partner location if they have allowed sharing
        const partnerAllowsLocationSharing = partnerData.settings?.shareLocationWithPartner !== false; // Default to true if not set
        
        if (partnerAllowsLocationSharing && partnerData.location) {
          const newPartnerLocation = {
            latitude: partnerData.location.latitude,
            longitude: partnerData.location.longitude,
            label: partnerData.location.label || "Location",
            timestamp: partnerData.location.timestamp,
          };
          setPartnerLocation(newPartnerLocation);

          // Recalculate distance if we have our location
          if (myLocation) {
            const dist = calculateDistance(
              myLocation.latitude,
              myLocation.longitude,
              newPartnerLocation.latitude,
              newPartnerLocation.longitude
            );
            setDistance(dist);
          }
        } else {
          setPartnerLocation(null);
          setDistance(null);
        }
      });

      currentPartnerId = partnerId;
    };

    try {
      const userRef = doc(db, "users", user.uid);
      
      // Real-time listener for user's own location and settings
      userUnsubscribe = onSnapshot(userRef, (userSnap) => {
        const userData = userSnap.data() || {};
        
        setCoupleId(userData.coupleId || null);
        const wasSharing = isSharing;
        const newIsSharing = userData.settings?.locationSharing ?? false;
        setIsSharing(newIsSharing);

        // If location sharing was just enabled, start updating location
        if (newIsSharing && !wasSharing) {
          // Start location updates
          updateMyLocation().catch(err => console.error("Error updating location:", err));
          
          // Start interval for regular updates
          if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
          }
          locationIntervalRef.current = setInterval(() => {
            updateMyLocation().catch(err => console.error("Error updating location:", err));
          }, 30000);
        } else if (!newIsSharing && wasSharing) {
          // Stop location updates
          if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
          }
        }

        if (userData.location) {
          setMyLocation({
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
            label: userData.location.label || "Current Location",
            timestamp: userData.location.timestamp,
          });
          
          // Format last updated time
          updateLastUpdatedTime(userData.location.timestamp);
        } else if (newIsSharing) {
          // Location sharing is enabled but no location stored yet - fetch it
          updateMyLocation().catch(err => console.error("Error updating location:", err));
        }

        // Only set up couple listener if coupleId changed
        if (userData.coupleId && currentCoupleId !== userData.coupleId) {
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
          }

          currentCoupleId = userData.coupleId;
          const coupleRef = doc(db, "couples", userData.coupleId);
          
          coupleUnsubscribe = onSnapshot(coupleRef, (coupleSnap) => {
            const coupleData = coupleSnap.data();

            // If couple document deleted (disconnected), clear partner immediately
            if (!coupleData || !coupleSnap.exists()) {
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              setPartnerId(null);
              setPartnerName(null);
              setPartnerLocation(null);
              setDistance(null);
              setCoupleId(null);
              return;
            }

            const foundPartnerId = coupleData.ownerId === user.uid 
              ? coupleData.partnerId 
              : coupleData.ownerId;

            if (foundPartnerId) {
              setupPartnerListener(userData.coupleId, foundPartnerId);
            } else {
              // No partner ID - clear partner
              if (partnerUnsubscribe) {
                partnerUnsubscribe();
                partnerUnsubscribe = null;
              }
              setPartnerId(null);
              setPartnerName(null);
              setPartnerLocation(null);
              setDistance(null);
            }
          });
        } else if (!userData.coupleId) {
          // Clean up listeners if no couple
          if (coupleUnsubscribe) {
            coupleUnsubscribe();
            coupleUnsubscribe = null;
          }
          if (partnerUnsubscribe) {
            partnerUnsubscribe();
            partnerUnsubscribe = null;
          }
          setPartnerId(null);
          setPartnerName(null);
          setPartnerLocation(null);
          setDistance(null);
          currentCoupleId = null;
          currentPartnerId = null;
        }
      });
    } catch (error) {
      console.error("Error setting up location listeners:", error);
    } finally {
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (userUnsubscribe) userUnsubscribe();
      if (coupleUnsubscribe) coupleUnsubscribe();
      if (partnerUnsubscribe) partnerUnsubscribe();
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [navigation]);

  const updateLastUpdatedTime = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setLastUpdated("Just now");
      } else if (diffMins < 60) {
        setLastUpdated(`${diffMins} minute${diffMins > 1 ? 's' : ''} ago`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        setLastUpdated(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`);
      }
    } catch (e) {
      setLastUpdated("");
    }
  };

  // Update last updated time periodically
  useEffect(() => {
    if (myLocation?.timestamp) {
      const interval = setInterval(() => {
        updateLastUpdatedTime(myLocation.timestamp);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [myLocation]);

  // Recalculate distance when locations change
  useEffect(() => {
    if (myLocation && partnerLocation) {
      const dist = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [myLocation, partnerLocation]);

  // Memoize map HTML to avoid regenerating on every render
  const mapHTML = useMemo(() => {
    if (!myLocation && !partnerLocation) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
              body { margin: 0; padding: 0; }
              #map { width: 100%; height: 100vh; }
            </style>
          </head>
          <body>
            <div id="map"></div>
            <script>
              var map = L.map('map').setView([0, 0], 2);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
              }).addTo(map);
            </script>
          </body>
        </html>
      `;
    }

    const centerLat = myLocation 
      ? partnerLocation 
        ? (myLocation.latitude + partnerLocation.latitude) / 2
        : myLocation.latitude
      : partnerLocation.latitude;
    
    const centerLon = myLocation
      ? partnerLocation
        ? (myLocation.longitude + partnerLocation.longitude) / 2
        : myLocation.longitude
      : partnerLocation.longitude;

    const zoom = myLocation && partnerLocation ? 12 : 15;

    let markers = '';
    if (myLocation) {
      markers += `
        var myMarker = L.marker([${myLocation.latitude}, ${myLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #FF0000; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">Y</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(map);
        myMarker.bindPopup('<b>You</b><br>${myLocation.latitude.toFixed(4)}, ${myLocation.longitude.toFixed(4)}');
      `;
    }

    if (partnerLocation) {
      markers += `
        var partnerMarker = L.marker([${partnerLocation.latitude}, ${partnerLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #E8849A; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">💕</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(map);
        partnerMarker.bindPopup('<b>${partnerName || "Partner"}</b><br>${partnerLocation.latitude.toFixed(4)}, ${partnerLocation.longitude.toFixed(4)}');
      `;
    }

    if (myLocation && partnerLocation) {
      markers += `
        var polyline = L.polyline([
          [${myLocation.latitude}, ${myLocation.longitude}],
          [${partnerLocation.latitude}, ${partnerLocation.longitude}]
        ], {
          color: '#E8849A',
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 10'
        }).addTo(map);
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${centerLat}, ${centerLon}], ${zoom});
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            ${markers}
          </script>
        </body>
      </html>
    `;
  }, [myLocation?.latitude, myLocation?.longitude, partnerLocation?.latitude, partnerLocation?.longitude, partnerName]);

  const handleRefresh = async () => {
    if (isSharing) {
      await updateMyLocation();
      Alert.alert("Refreshed", "Your location has been updated.");
    } else {
      Alert.alert("Location Sharing Off", "Enable location sharing to update your location.");
    }
  };

  const handleToggleSharing = () => {
    if (isSharing) {
      Alert.alert(
        "Stop Sharing Location",
        "Are you sure you want to stop sharing your location?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Stop Sharing",
            style: "destructive",
            onPress: toggleLocationSharing,
          },
        ]
      );
    } else {
      toggleLocationSharing();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.main }}>
        <ActivityIndicator size="large" color={colors.primary.rose} />
        <Text style={{ marginTop: hp(spacing.md), fontSize: fontSize(typography.sizes.small), color: colors.text.secondary }}>
          Loading locations...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.main }}
    >
      <View style={{ paddingHorizontal: wp(spacing.lg), paddingVertical: hp(spacing.xl) }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: hp(spacing.lg),
          position: 'relative',
        }}>
          <Pressable 
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
            style={{
              width: wp(44),
              height: wp(44),
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: 0,
              zIndex: 1,
            }}
          >
            <Text style={{ 
              color: colors.text.primary, 
              fontSize: fontSize(20),
              fontWeight: typography.weights.bold,
            }}>
              ←
            </Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: fontSize(typography.sizes.body),
                fontWeight: typography.weights.regular,
                color: colors.text.secondary,
              }}
            >
              Our Locations
            </Text>
          </View>
        </View>

        {!coupleId ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginTop: hp(spacing.xl * 2),
            paddingHorizontal: wp(spacing.lg),
          }}>
            <View style={{
              width: wp(100),
              height: wp(100),
              borderRadius: wp(50),
              backgroundColor: colors.primary.softRose,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: hp(spacing.xl),
              shadowColor: colors.primary.rose,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 4,
            }}>
              <Text style={{ fontSize: fontSize(48) }}>📍</Text>
            </View>
            <Text style={{ 
              fontSize: fontSize(typography.sizes.h2), 
              fontWeight: typography.weights.bold, 
              marginBottom: hp(spacing.sm), 
              color: colors.text.primary 
            }}>
              Not Connected
            </Text>
            <Text style={{ 
              fontSize: fontSize(typography.sizes.body), 
              textAlign: 'center', 
              marginBottom: hp(spacing.xl), 
              color: colors.text.secondary,
              lineHeight: fontSize(typography.sizes.body) * typography.lineHeights.normal,
              paddingHorizontal: wp(spacing.lg),
            }}>
              Connect with your partner to share locations and stay connected
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Pairing")}
              style={{
                borderRadius: wp(borderRadius.md),
                paddingHorizontal: wp(spacing.xl),
                paddingVertical: hp(spacing.md),
                minHeight: hp(48),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary.rose,
                shadowColor: colors.primary.rose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text style={{ 
                fontWeight: typography.weights.semibold, 
                color: "#FFFFFF", 
                fontSize: fontSize(typography.sizes.body),
                letterSpacing: 0.3,
              }}>
                Connect with Partner
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: hp(spacing.lg) }}>
            {/* Map View - Interactive Map */}
            <View style={{
              borderRadius: wp(borderRadius.lg),
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              overflow: 'hidden',
              height: hp(420),
              backgroundColor: colors.background.surface,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}>
              {myLocation || partnerLocation ? (
                <WebView
                  key={`map-${myLocation?.latitude || 0}-${myLocation?.longitude || 0}-${partnerLocation?.latitude || 0}-${partnerLocation?.longitude || 0}`}
                  source={{ html: mapHTML }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: "#E8E8E8" }}>
                  <Text style={{ fontSize: fontSize(36), marginBottom: hp(spacing.xs) }}>🗺️</Text>
                  <Text style={{ fontSize: fontSize(typography.sizes.small), fontWeight: typography.weights.semibold, marginBottom: hp(spacing.xs), color: colors.secondary.charcoalGray }}>
                    Map View
                  </Text>
                  <Text style={{ fontSize: fontSize(typography.sizes.tiny), textAlign: 'center', paddingHorizontal: wp(spacing.md), color: colors.status.offline }}>
                    Enable location sharing to see map
                  </Text>
                </View>
              )}
            </View>

            {/* Legend */}
            <View style={{
              borderRadius: wp(borderRadius.lg),
              padding: wp(spacing.lg),
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              backgroundColor: colors.background.surface,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}>
              <Text style={{ 
                fontSize: fontSize(typography.sizes.body), 
                fontWeight: typography.weights.semibold, 
                marginBottom: hp(spacing.md),
                color: colors.text.primary 
              }}>
                Legend
              </Text>
              <View style={{ gap: hp(spacing.md) }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: wp(spacing.md),
                  paddingVertical: hp(spacing.sm),
                  paddingHorizontal: wp(spacing.sm),
                  borderRadius: wp(borderRadius.md),
                  backgroundColor: colors.background.main,
                }}>
                  <View style={{
                    width: wp(16),
                    height: wp(16),
                    borderRadius: wp(8),
                    backgroundColor: '#FF4444',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#FF4444',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 2,
                  }} />
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.body), 
                    fontWeight: typography.weights.medium,
                    color: colors.text.primary,
                    flex: 1,
                  }}>
                    You
                  </Text>
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.small), 
                    color: colors.text.secondary 
                  }}>
                    {myLocation?.label || "Current Location"}
                  </Text>
                </View>
                {partnerLocation && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: wp(spacing.md),
                    paddingVertical: hp(spacing.sm),
                    paddingHorizontal: wp(spacing.sm),
                    borderRadius: wp(borderRadius.md),
                    backgroundColor: colors.background.main,
                  }}>
                    <View style={{ alignItems: 'center', justifyContent: 'center', width: wp(20), height: wp(20) }}>
                      {/* Pulsing ring */}
                      <Animated.View
                        style={{
                          position: 'absolute',
                          width: wp(20),
                          height: wp(20),
                          borderRadius: wp(10),
                          backgroundColor: colors.primary.rose,
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.3],
                            outputRange: [0.3, 0],
                          }),
                          transform: [{ scale: pulseAnim }],
                        }}
                      />
                      {/* Main indicator */}
                      <View style={{
                        width: wp(16),
                        height: wp(16),
                        borderRadius: wp(8),
                        backgroundColor: colors.primary.rose,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        shadowColor: colors.primary.rose,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 6,
                        elevation: 3,
                      }} />
                    </View>
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.body), 
                      fontWeight: typography.weights.medium,
                      color: colors.text.primary,
                      flex: 1,
                    }}>
                      {partnerName}
                    </Text>
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.small), 
                      color: colors.text.secondary 
                    }}>
                      {partnerLocation.label || "Location"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Distance & Direction - Prominent Card */}
            {myLocation && partnerLocation && distance !== null ? (
              <View style={{
                borderRadius: wp(borderRadius.lg),
                padding: wp(spacing.xl),
                borderWidth: 1,
                borderColor: colors.primary.softRose,
                backgroundColor: colors.background.surface,
                shadowColor: colors.primary.rose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 4,
              }}>
                <View style={{ gap: hp(spacing.lg), alignItems: 'center' }}>
                  {/* Distance Display - Large and Prominent */}
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ 
                      fontSize: fontSize(48), 
                      fontWeight: typography.weights.bold, 
                      color: colors.primary.rose,
                      marginBottom: hp(spacing.xs),
                      letterSpacing: -1,
                    }}>
                      {distance.toFixed(1)}
                    </Text>
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.body), 
                      fontWeight: typography.weights.medium,
                      color: colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                      Kilometers Apart
                    </Text>
                  </View>
                  
                  {/* Divider */}
                  <View style={{ 
                    width: '80%',
                    height: 1, 
                    backgroundColor: colors.primary.softRose,
                  }} />
                  
                  {/* Direction */}
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.small), 
                      color: colors.text.secondary,
                      marginBottom: hp(spacing.xs),
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      Direction
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: wp(spacing.sm),
                      paddingVertical: hp(spacing.sm),
                      paddingHorizontal: wp(spacing.lg),
                      borderRadius: wp(borderRadius.md),
                      backgroundColor: colors.primary.softRose,
                    }}>
                      <Text style={{ 
                        fontSize: fontSize(typography.sizes.body), 
                        fontWeight: typography.weights.semibold,
                        color: colors.text.primary,
                      }}>
                        You
                      </Text>
                      <Text style={{ 
                        fontSize: fontSize(typography.sizes.body), 
                        color: colors.primary.rose,
                      }}>
                        →
                      </Text>
                      <Text style={{ 
                        fontSize: fontSize(typography.sizes.body), 
                        fontWeight: typography.weights.semibold,
                        color: colors.text.primary,
                      }}>
                        {partnerName}
                    </Text>
                  </View>
                  </View>
                  
                  {/* Last Updated */}
                  {lastUpdated && (
                    <Text style={{ 
                      fontSize: fontSize(typography.sizes.caption), 
                      color: colors.text.secondary,
                      marginTop: hp(spacing.xs),
                    }}>
                      Last updated: {lastUpdated}
                    </Text>
                  )}
                </View>
              </View>
            ) : myLocation && !partnerLocation ? (
              <View style={{
                borderRadius: wp(borderRadius.lg),
                padding: wp(spacing.xl),
                borderWidth: 1,
                borderColor: colors.secondary.lightGray,
                backgroundColor: colors.background.surface,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
                alignItems: 'center',
              }}>
                <Text style={{ 
                  fontSize: fontSize(typography.sizes.body), 
                  color: colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: fontSize(typography.sizes.body) * typography.lineHeights.normal,
                }}>
                  Waiting for {partnerName} to share their location...
                </Text>
              </View>
            ) : null}

            {/* Location Sharing Toggle */}
            <View style={{
              borderRadius: wp(borderRadius.lg),
              padding: wp(spacing.lg),
              borderWidth: 1,
              borderColor: colors.secondary.lightGray,
              backgroundColor: colors.background.surface,
              marginBottom: hp(spacing.md),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: wp(spacing.lg) }}>
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.body), 
                    fontWeight: typography.weights.semibold, 
                    marginBottom: hp(spacing.xs), 
                    color: colors.text.primary 
                  }}>
                    Share My Location
                  </Text>
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.small), 
                    color: colors.text.secondary,
                    lineHeight: fontSize(typography.sizes.small) * typography.lineHeights.normal,
                  }}>
                    {isSharing ? "Your location is being shared with your partner" : "Enable to share your location with your partner"}
                  </Text>
                </View>
                <Pressable
                  onPress={handleToggleSharing}
                  style={{
                    width: wp(56),
                    height: wp(32),
                    borderRadius: wp(16),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSharing ? colors.primary.rose : colors.secondary.lightGray,
                    shadowColor: isSharing ? colors.primary.rose : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSharing ? 0.3 : 0,
                    shadowRadius: 4,
                    elevation: isSharing ? 2 : 0,
                  }}
                >
                  <View
                    style={{
                      width: wp(24),
                      height: wp(24),
                      borderRadius: wp(12),
                      backgroundColor: "#FFFFFF",
                      position: 'absolute',
                      left: isSharing ? wp(28) : wp(4),
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  />
                </Pressable>
              </View>
              {updatingLocation && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: wp(spacing.sm), 
                  marginTop: hp(spacing.md),
                  paddingTop: hp(spacing.md),
                  borderTopWidth: 1,
                  borderTopColor: colors.secondary.lightGray,
                }}>
                  <ActivityIndicator size="small" color={colors.primary.rose} />
                  <Text style={{ 
                    fontSize: fontSize(typography.sizes.small), 
                    color: colors.text.secondary 
                  }}>
                    Updating location...
                  </Text>
                </View>
              )}
            </View>

            {/* Control Buttons */}
            <View style={{ flexDirection: 'row', gap: wp(spacing.md) }}>
              <Pressable
                onPress={handleToggleSharing}
                style={{
                  flex: 1,
                  borderRadius: wp(borderRadius.md),
                  paddingVertical: hp(spacing.md),
                  paddingHorizontal: wp(spacing.xl),
                  minHeight: hp(48),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSharing ? '#E85A4A' : colors.primary.rose,
                  shadowColor: isSharing ? '#E85A4A' : colors.primary.rose,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: "#FFFFFF",
                    letterSpacing: 0.3,
                  }}
                >
                  {isSharing ? "Stop Sharing" : "Start Sharing"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Location Options",
                    "Choose an option:",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Share My Location", onPress: () => {
                        Alert.alert("Location Sharing", "Location sharing will be enabled. Make sure location permissions are granted.");
                      }},
                      { text: "View History", onPress: () => {
                        Alert.alert("Location History", "Location history feature will be available soon.");
                      }},
                    ]
                  );
                }}
                style={{
                  flex: 1,
                  borderRadius: wp(borderRadius.md),
                  paddingVertical: hp(spacing.md),
                  paddingHorizontal: wp(spacing.xl),
                  minHeight: hp(48),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.primary.rose,
                  backgroundColor: colors.background.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize(typography.sizes.body),
                    fontWeight: typography.weights.semibold,
                    color: colors.primary.rose,
                    letterSpacing: 0.3,
                  }}
                >
                  More
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

