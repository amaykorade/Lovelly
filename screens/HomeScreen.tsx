import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, ActivityIndicator, Pressable, TextInput, Alert, Image, ScrollView, AppState, StyleSheet, InteractionManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

import { auth, db, storage } from "../lib/firebase";
import { AppHeader } from "../components/layout/AppHeader";
import { colors, spacing, borderRadius, typography } from "../theme/designSystem";
import { wp, hp, fontSize, getScreenDimensions } from "../lib/responsive";

interface Props {
  navigation: any;
}

interface PartnerInfo {
  name: string;
  avatarUrl?: string;
  online?: boolean;
  lastSeen?: any;
}

const HomeScreen = React.memo(function HomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [showProfileFull, setShowProfileFull] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [shareOnlineStatus, setShareOnlineStatus] = useState(true);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);

  // Calculate days since anniversary - memoized
  const calculateAnniversaryDays = useCallback((anniversaryDateStr: string | null): number | null => {
    if (!anniversaryDateStr) return null;
    try {
      const anniversary = new Date(anniversaryDateStr);
      const today = new Date();
      const diffTime = today.getTime() - anniversary.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return null;
    }
  }, []);

  // Format last seen time - memoized
  const formatLastSeen = useCallback((lastSeen: any): string => {
    if (!lastSeen) return "recently";
    try {
      const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        return "just now";
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          return `${diffHours}h ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays}d ago`;
        }
      }
    } catch (e) {
      return "recently";
    }
  }, []);

  // Set current user's online status (only if sharing is enabled) - memoized
  const setUserOnlineStatus = useCallback(async (isOnline: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    // Only update online status if sharing is enabled
    if (!shareOnlineStatus) {
      // If sharing is disabled, set online to false
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error updating online status:", e);
      }
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        online: isOnline,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error updating online status:", e);
    }
  }, [shareOnlineStatus]);

  // Load partner information with real-time listener - memoized
  const setupPartnerListener = useCallback(async (coupleId: string, currentUserId: string) => {
    try {
      const coupleRef = doc(db, "couples", coupleId);
      
      // Use onSnapshot to get initial data and watch for changes (faster than getDoc + onSnapshot)
      return new Promise((resolve) => {
        let partnerUnsubscribeInner: (() => void) | null = null;
        
        const coupleUnsubscribe = onSnapshot(coupleRef, (coupleSnap) => {
          const coupleData = coupleSnap.data();
          
          if (!coupleData || !coupleSnap.exists()) {
            // Couple document deleted (disconnected) - clear partner immediately
            console.log("Couple document doesn't exist, clearing partner");
            if (partnerUnsubscribeInner) {
              partnerUnsubscribeInner();
              partnerUnsubscribeInner = null;
            }
            setPartner(null);
            // Clear invalid coupleId from user document
            const userRef = doc(db, "users", currentUserId);
            updateDoc(userRef, {
              coupleId: null,
              updatedAt: serverTimestamp(),
            }).catch(err => console.error("Error clearing invalid coupleId:", err));
            return;
          }

          // Find partner ID (the one that's not current user)
          const partnerId = coupleData.ownerId === currentUserId 
            ? coupleData.partnerId 
            : coupleData.ownerId;

          if (partnerId) {
            // Clean up old partner listener if exists
            if (partnerUnsubscribeInner) {
              partnerUnsubscribeInner();
            }
            
            const partnerRef = doc(db, "users", partnerId);
            
            // Set up real-time listener for partner's status and location
            partnerUnsubscribeInner = onSnapshot(partnerRef, (partnerSnap) => {
              if (!partnerSnap.exists()) {
                console.log("Partner document doesn't exist");
                setPartner(null);
                setPartnerLocation(null);
                return;
              }
              
              const partnerData = partnerSnap.data() || {};
              
              // Check if partner has "Share Online Status" enabled
              // If disabled, always show as offline
              const shareOnlineStatus = partnerData.settings?.shareOnlineStatus ?? true;
              const isOnline = shareOnlineStatus ? (partnerData.online || false) : false;
              
              setPartner({
                name: partnerData.name || "Partner",
                avatarUrl: partnerData.avatarUrl || null,
                online: isOnline,
                lastSeen: partnerData.lastSeen || null,
              });
              
              // Update partner location only if partner has allowed sharing
              const partnerAllowsLocationSharing = partnerData.settings?.shareLocationWithPartner !== false; // Default to true if not set
              if (partnerAllowsLocationSharing && partnerData.location?.latitude && partnerData.location?.longitude) {
                setPartnerLocation({
                  latitude: partnerData.location.latitude,
                  longitude: partnerData.location.longitude,
                });
              } else {
                setPartnerLocation(null);
              }
            }, (error) => {
              console.error("Error in partner snapshot:", error);
              setPartner(null);
              setPartnerLocation(null);
            });
          } else {
            // No partner ID - clear partner
            console.log("No partner ID in couple document");
            if (partnerUnsubscribeInner) {
              partnerUnsubscribeInner();
              partnerUnsubscribeInner = null;
            }
            setPartner(null);
          }
        }, (error) => {
          console.error("Error in couple snapshot:", error);
          setPartner(null);
        });

        // Return combined unsubscribe function
        resolve(() => {
          coupleUnsubscribe();
          if (partnerUnsubscribeInner) {
            partnerUnsubscribeInner();
          }
        });
      });
    } catch (e) {
      console.error("Error setting up partner listener:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    let partnerUnsubscribe: (() => void) | null = null;
    let settingsUnsubscribe: (() => void) | null = null;
    let subscription: any = null;

    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        
        // Use onSnapshot to get initial data and watch for changes in one go
        // This is faster than getDoc + onSnapshot
        let currentCoupleId: string | null = null;
        
        settingsUnsubscribe = onSnapshot(userRef, async (snap) => {
        const data = snap.data() || {};
          
          // Update local state immediately for fast UI rendering
        setName(data.name || null);
        setAvatarUrl(data.avatarUrl || null);
          setAnniversaryDate(data.anniversaryDate || null);
        setCoupleId(data.coupleId || null);
        
        // Update user location from user document
        if (data.location?.latitude && data.location?.longitude) {
          setMyLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          });
        }
          
          // Load share online status setting
          const shareStatus = data.settings?.shareOnlineStatus ?? true;
          setShareOnlineStatus(shareStatus);

          // Set user as online when app loads (respects shareOnlineStatus setting)
          // Don't await - do this in background to not block UI
          setUserOnlineStatus(true).catch(err => console.error("Error setting online status:", err));

          // Handle partner listener based on coupleId changes
          if (data.coupleId && currentCoupleId !== data.coupleId) {
            // New coupleId - clean up old listener and set up new one
            if (partnerUnsubscribe) {
              partnerUnsubscribe();
              partnerUnsubscribe = null;
            }
            
            currentCoupleId = data.coupleId;
            setupPartnerListener(data.coupleId, user.uid).then((unsub: (() => void) | null) => {
              if (unsub) {
                partnerUnsubscribe = unsub;
              }
            }).catch(err => console.error("Error setting up partner listener:", err));
          } else if (!data.coupleId && currentCoupleId !== null) {
            // coupleId removed (disconnected) - clean up listener and clear partner
            if (partnerUnsubscribe) {
              partnerUnsubscribe();
              partnerUnsubscribe = null;
            }
            setPartner(null);
            currentCoupleId = null;
          }
          
          // Load message count (placeholder - will implement when messages are added)
          // For now, set to 0 or mock data
          setMessageCount(0);
          setLocationCount(0);
          
          // If sharing was just disabled, set offline
          if (!shareStatus) {
            setUserOnlineStatus(false).catch(err => console.error("Error setting offline status:", err));
          }
        }, (error) => {
          console.error("Error in user snapshot:", error);
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Handle app state changes to update online status
    subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - set online (if sharing enabled)
        setUserOnlineStatus(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - set offline
        setUserOnlineStatus(false);
      }
    });

    // Cleanup: Set offline when component unmounts and unsubscribe from listeners
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (partnerUnsubscribe) {
        partnerUnsubscribe();
      }
      if (settingsUnsubscribe) {
        settingsUnsubscribe();
      }
      setUserOnlineStatus(false);
    };
  }, []);

  // Check location permission status and get current location if granted
  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const isGranted = status === 'granted';
        setLocationPermissionGranted(isGranted);
        
        // If permission is already granted, get current location
        if (isGranted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          setMyLocation(newLocation);
          
          // Save to Firestore - save to user document so partner can read it (if sharing is enabled)
          // Location is always saved for user's own use, but partner visibility is controlled by shareLocationWithPartner setting
          const user = auth.currentUser;
          if (user) {
            try {
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, {
                location: {
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                  timestamp: serverTimestamp(),
                },
                updatedAt: serverTimestamp(),
              });
            } catch (error) {
              console.error("Error saving location to Firestore:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking location permission:", error);
        setLocationPermissionGranted(false);
      }
    };

    checkLocationPermission();
  }, []);

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setMyLocation(newLocation);
      
      // Save to Firestore - save to user document so partner can read it (if sharing is enabled)
      // Location is always saved for user's own use, but partner visibility is controlled by shareLocationWithPartner setting
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            location: {
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              timestamp: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error saving location to Firestore:", error);
        }
      }
    } catch (error) {
      console.error("Error getting current location:", error);
    }
  };

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        // Get current location immediately after permission is granted
        await getCurrentLocation();
        Alert.alert(
          "Permission Granted",
          "Location permission has been granted. Your location will now be shown on the map.",
          [{ text: "OK" }]
        );
      } else {
        setLocationPermissionGranted(false);
        Alert.alert(
          "Permission Denied",
          "Location permission is required to show your location on the map. You can enable it in your device settings.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      Alert.alert(
        "Error",
        "Failed to request location permission. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, []);

  // Fetch locations for map
  useEffect(() => {
    const fetchLocations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        setMapLoading(true);

        // Get user's location
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        
        if (userData?.location?.latitude && userData?.location?.longitude) {
          setMyLocation({
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          });
        }

        // Get partner's location if connected (check coupleId only, not partner state)
        if (coupleId) {
          const coupleRef = doc(db, "couples", coupleId);
          const coupleSnap = await getDoc(coupleRef);
          const coupleData = coupleSnap.data();
          
          if (coupleData) {
            const partnerId = coupleData?.ownerId === user.uid 
              ? coupleData?.partnerId 
              : coupleData?.ownerId;

            if (partnerId) {
              const partnerRef = doc(db, "users", partnerId);
              const partnerSnap = await getDoc(partnerRef);
              const partnerData = partnerSnap.data();
              
              // Only show partner location if they have allowed sharing
              const partnerAllowsLocationSharing = partnerData?.settings?.shareLocationWithPartner !== false; // Default to true if not set
              if (partnerAllowsLocationSharing && partnerData?.location?.latitude && partnerData?.location?.longitude) {
                setPartnerLocation({
                  latitude: partnerData.location.latitude,
                  longitude: partnerData.location.longitude,
                });
              } else {
                setPartnerLocation(null);
              }
            } else {
              setPartnerLocation(null);
            }
          } else {
            setPartnerLocation(null);
          }
        } else {
          // Clear partner location if not connected
          setPartnerLocation(null);
        }

        // Note: Real-time location updates are handled by the main user listener
        // which already watches the user document for location changes
        
        setMapLoading(false);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setMapLoading(false);
      }
    };

    if (!loading) {
      fetchLocations();
    }
    
    // Cleanup function
    return () => {
      // Cleanup if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, coupleId]);

  // Memoize anniversary calculation
  const anniversaryDays = React.useMemo(() => calculateAnniversaryDays(anniversaryDate), [anniversaryDate, calculateAnniversaryDays]);
  const anniversaryText = React.useMemo(() => anniversaryDays !== null ? `${anniversaryDays}d` : null, [anniversaryDays]);

  // Generate map HTML using Leaflet.js with dark theme and no zoom controls
  const mapHTML = useMemo(() => {
      // Default map view when no locations
      if (!myLocation && !partnerLocation) {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; }
                #map { width: 100%; height: 100%; }
                .leaflet-control-container { display: none !important; }
              </style>
            </head>
            <body>
              <div id="map"></div>
              <script>
                var map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                  attribution: '© OpenStreetMap contributors © CARTO',
                  maxZoom: 19,
                  subdomains: 'abcd'
                }).addTo(map);
              </script>
            </body>
          </html>
        `;
      }

      // Get user's first name
      const firstName = name ? name.split(' ')[0] : 'You';
      const firstInitial = firstName.charAt(0).toUpperCase();

      // Calculate center and zoom for single location (fallback)
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
      let fitBoundsCode = '';
      
      if (myLocation) {
        markers += `
          var myMarker = L.marker([${myLocation.latitude}, ${myLocation.longitude}], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div style="background-color: ${colors.primary.rose}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${firstInitial}</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          }).addTo(map);
          myMarker.bindPopup('<b>${firstName}</b><br>${myLocation.latitude.toFixed(4)}, ${myLocation.longitude.toFixed(4)}');
        `;
      }

      if (partnerLocation) {
        markers += `
          var partnerMarker = L.marker([${partnerLocation.latitude}, ${partnerLocation.longitude}], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div style="background-color: ${colors.primary.coral}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">💕</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          }).addTo(map);
          partnerMarker.bindPopup('<b>${partner?.name || "Partner"}</b><br>${partnerLocation.latitude.toFixed(4)}, ${partnerLocation.longitude.toFixed(4)}');
        `;
      }

      // If both locations exist, use fitBounds to show both markers
      if (myLocation && partnerLocation) {
        // Add polyline
        markers += `
          var polyline = L.polyline([
            [${myLocation.latitude}, ${myLocation.longitude}],
            [${partnerLocation.latitude}, ${partnerLocation.longitude}]
          ], {
            color: '${colors.primary.coral}',
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10'
          }).addTo(map);
        `;
        
        // Use fitBounds to automatically adjust zoom and center to show both markers
        // Padding ensures markers aren't at the very edge of the screen
        fitBoundsCode = `
          // Fit map bounds to show both locations with padding
          var bounds = L.latLngBounds([
            [${myLocation.latitude}, ${myLocation.longitude}],
            [${partnerLocation.latitude}, ${partnerLocation.longitude}]
          ]);
          map.fitBounds(bounds, {
            padding: [50, 50], // Add 50px padding on all sides
            maxZoom: 15 // Limit max zoom so it doesn't zoom in too close
          });
        `;
      }

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; overflow: hidden; }
              #map { width: 100%; height: 100%; }
              .leaflet-control-container { display: none !important; }
            </style>
          </head>
          <body>
            <div id="map"></div>
            <script>
              var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLon}], ${zoom});
              L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CARTO',
                maxZoom: 19,
                subdomains: 'abcd'
              }).addTo(map);
              ${markers}
              ${fitBoundsCode}
            </script>
          </body>
        </html>
      `;
  }, [myLocation, partnerLocation, partner, name]);

  // Optimized navigation handlers
  const handleNavigateToDrawing = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate("Drawing");
    });
  }, [navigation]);

  const handleNavigateToPairing = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate("Pairing");
    });
  }, [navigation]);

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
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(avatarRef, blob);
      const downloadUrl = await getDownloadURL(avatarRef);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        avatarUrl: downloadUrl,
        updatedAt: serverTimestamp(),
      });

      setAvatarUrl(downloadUrl);
      Alert.alert("Profile picture updated", "Your profile photo has been changed.");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not update profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const trimmedName = (name || "").trim();

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
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: trimmedName,
        updatedAt: serverTimestamp(),
      });
      setName(trimmedName);
      Alert.alert("Profile updated", "Your profile information has been saved.");
      setShowProfileFull(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  }, [name, avatarUrl]);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background.main }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary.softRose} />
            <Text style={{ marginTop: hp(spacing.sm), fontSize: fontSize(typography.sizes.small), color: colors.status.offline }}>Loading your home…</Text>
          </View>
        ) : (
          <>
            {/* Map Section - 70% of screen height */}
            {(() => {
              const { height: screenHeight } = getScreenDimensions();
              const mapHeight = screenHeight * 0.7; // 70% of screen height
            
            return (
              <View style={{
                width: '100%',
                height: mapHeight,
                overflow: 'hidden',
                backgroundColor: colors.background.surface,
                borderRadius: wp(borderRadius.lg),
              }}>
                {mapLoading ? (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.background.main,
                  }}>
                    <ActivityIndicator size="large" color={colors.primary.rose} />
                        <Text
                      style={{
                        marginTop: hp(spacing.sm),
                        fontSize: fontSize(typography.sizes.small),
                        color: colors.text.secondary,
              }}
            >
                      Loading map...
                    </Text>
              </View>
            ) : (
                  <View style={{ flex: 1, position: 'relative' }}>
                    <WebView
                      key={`map-${Math.round((myLocation?.latitude || 0) * 1000)}-${Math.round((myLocation?.longitude || 0) * 1000)}-${Math.round((partnerLocation?.latitude || 0) * 1000)}-${Math.round((partnerLocation?.longitude || 0) * 1000)}`}
                      source={{ html: mapHTML }}
                      style={{ flex: 1, backgroundColor: colors.background.main }}
                      scrollEnabled={true}
                      zoomEnabled={true}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      cacheEnabled={true}
                      cacheMode="LOAD_CACHE_ELSE_NETWORK"
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      renderLoading={() => (
                        <View style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.background.main,
                        }}>
                          <ActivityIndicator size="large" color={colors.primary.rose} />
                        </View>
                      )}
                    />
                    {/* Location Permission Button - Only show when permission is not granted */}
                    {locationPermissionGranted === false && (
                <Pressable
                        style={({ pressed }) => [
                          {
                            position: 'absolute',
                            bottom: hp(spacing.lg),
                            right: wp(spacing.md),
                            width: wp(56),
                            height: wp(56),
                            borderRadius: wp(28),
                            backgroundColor: colors.primary.rose,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                          },
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => {
                          // Immediate feedback
                          requestLocationPermission();
                        }}
                        android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
              >
                        <Ionicons 
                          name="location-outline" 
                          size={fontSize(28)} 
                          color="#FFFFFF" 
                        />
                </Pressable>
                    )}
                      </View>
                    )}
                  </View>
            );
          })()}

          {/* Partner Status Box - Simple message below map */}
          {(() => {
            const { height: screenHeight } = getScreenDimensions();
            const remainingHeight = screenHeight * 0.3; // 30% of screen for content below map
            
            return (
                      <View
                    style={{
                  width: '100%',
                  height: remainingHeight,
                  paddingHorizontal: wp(spacing.lg),
                  paddingTop: hp(spacing.md),
                  paddingBottom: hp(spacing.md),
                  justifyContent: 'center',
                }}
              >
                {coupleId && partner ? (
                  // Partner Connected - Small box with complete width
                  <View style={{
                    width: '100%',
                    borderRadius: wp(borderRadius.md),
                    paddingVertical: hp(spacing.md),
                    paddingHorizontal: wp(spacing.lg),
                    borderWidth: 1,
                    borderColor: colors.secondary.lightGray,
                    backgroundColor: colors.background.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: fontSize(typography.sizes.small),
                      fontWeight: typography.weights.medium,
                      color: colors.text.secondary,
                      marginBottom: hp(spacing.xs),
                    }}>
                      Partner Connected
                    </Text>
                    <Text style={{
                      fontSize: fontSize(typography.sizes.body),
                      fontWeight: typography.weights.semibold,
                      color: colors.text.primary,
                    }}>
                      {partner.name}
                  </Text>
                  </View>
                ) : (
                  // Not Connected - Invite Partner button in box
                <Pressable
                    style={({ pressed }) => [
                      {
                        width: '100%',
                        borderRadius: wp(borderRadius.md),
                        paddingVertical: hp(spacing.md),
                        paddingHorizontal: wp(spacing.lg),
                        borderWidth: 1,
                        borderColor: colors.primary.rose,
                        backgroundColor: colors.background.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                    shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                    shadowRadius: 4,
                        elevation: 2,
                      },
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={handleNavigateToPairing}
                    android_ripple={{ color: 'rgba(233, 30, 99, 0.1)' }}
                  >
                  <Text
                    style={{
                        fontSize: fontSize(typography.sizes.body),
                      fontWeight: typography.weights.semibold,
                        color: colors.primary.rose,
                        letterSpacing: 0.3,
                        textAlign: 'center',
                    }}
                  >
                      Invite Partner
                  </Text>
                </Pressable>
                )}
              </View>
            );
          })()}
          </>
        )}
      </View>

      {showProfileFull && (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onPress={() => setShowProfileFull(false)}
        >
          <View style={{ flex: 1, paddingHorizontal: wp(spacing.lg), paddingVertical: hp(spacing.xl), backgroundColor: colors.warmWhite }}>
            <Pressable
              style={{ flex: 1 }}
              onPress={(e) => e.stopPropagation()}
            >
              <AppHeader
                title="Profile"
                userInitial={name ? name.charAt(0) : null}
                onAccountPress={() => setShowProfileFull(false)}
              />

              <View style={{
                marginTop: hp(spacing.md),
                borderRadius: wp(borderRadius.xl),
                padding: wp(spacing.lg),
                borderWidth: 1,
                borderColor: colors.secondary.lightGray,
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
                gap: hp(spacing.md),
              }}>
                <View style={{ alignItems: 'center', marginBottom: hp(spacing.xs) }}>
                  <Pressable
                    style={{
                      width: wp(80),
                      height: wp(80),
                      borderRadius: wp(40),
                      borderWidth: 2,
                      borderColor: colors.primary.softRose,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: hp(spacing.sm),
                      overflow: 'hidden',
                      backgroundColor: colors.dustyPink
                    }}
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
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={{ fontSize: fontSize(24), fontWeight: typography.weights.bold, color: colors.primary.softRose }}>
                        {(name || "U").charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </Pressable>
                  {uploadingAvatar && (
                    <Text style={{ fontSize: fontSize(typography.sizes.tiny), marginBottom: hp(spacing.xs), color: colors.status.offline }}>Uploading photo…</Text>
                  )}
                  <TextInput
                    style={{
                      marginTop: hp(spacing.xs),
                      borderRadius: wp(borderRadius.lg),
                      paddingHorizontal: wp(spacing.md),
                      paddingVertical: hp(spacing.xs),
                      fontSize: fontSize(typography.sizes.body),
                      width: '100%',
                      borderWidth: 2,
                      backgroundColor: colors.input.background,
                      borderColor: colors.input.border,
                      color: colors.input.text,
                    }}
                    placeholder="Your name"
                    placeholderTextColor={colors.input.placeholder}
                    value={name || ""}
                    onChangeText={setName}
                  />
                </View>

                {coupleId && (
                  <>
                    <View style={{ height: 1, marginVertical: hp(spacing.xs), backgroundColor: colors.secondary.lightGray }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: fontSize(typography.sizes.small), color: colors.status.offline }}>Couple ID</Text>
                      <Text style={{ fontSize: fontSize(typography.sizes.small), fontWeight: typography.weights.medium, color: colors.primary.softRose }}>
                      {coupleId}
                    </Text>
                  </View>
                  </>
                )}

                <View style={{ marginTop: hp(spacing.lg), flexDirection: 'row', justifyContent: 'space-between', gap: wp(spacing.sm) }}>
                  <Pressable
                    style={{
                      flex: 1,
                      borderRadius: wp(borderRadius.lg),
                      paddingVertical: hp(spacing.sm),
                      paddingHorizontal: wp(spacing.md),
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.dustyPink,
                      opacity: savingProfile ? 0.6 : 1,
                    }}
                    onPress={() => setShowProfileFull(false)}
                    disabled={savingProfile}
                  >
                    <Text 
                      style={{ 
                        fontSize: fontSize(typography.sizes.body),
                        fontWeight: typography.weights.semibold,
                        color: colors.secondary.charcoalGray 
                      }}
                  >
                    Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        borderRadius: wp(borderRadius.md),
                        paddingVertical: hp(spacing.md),
                        paddingHorizontal: wp(spacing.xl),
                        minHeight: hp(48),
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primary.rose,
                        shadowColor: colors.primary.rose,
                      shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 5,
                      opacity: savingProfile ? 0.6 : 1,
                      },
                      pressed && !savingProfile && { opacity: 0.7 }
                    ]}
                    onPress={() => {
                      // Immediate feedback
                      requestAnimationFrame(() => {
                        handleSaveProfile();
                      });
                    }}
                    disabled={savingProfile}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                  >
                    <Text 
                      style={{ 
                        fontSize: fontSize(typography.sizes.body),
                        fontWeight: typography.weights.semibold,
                        color: "#FFFFFF",
                        letterSpacing: 0.3,
                      }}
                  >
                    {savingProfile ? "Saving..." : "Save"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  );
});

export { HomeScreen };


