import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Alert, LayoutChangeEvent, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { colors, spacing, typography, borderRadius } from "../theme/designSystem";
import { wp, hp, fontSize } from "../lib/responsive";
import Button from "../components/ui/button";
import { auth, db } from "../lib/firebase";

interface Props {
  navigation: any;
  route?: any;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  color: string;
  points: Point[]; // Points are normalized (0-1 range)
  width: number;
}

// Smooth path generation that accurately follows the drawn points
const createSmoothPath = (points: Point[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  
  // Use quadratic Bezier curves that pass through actual points for accuracy
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];
    
    if (i === 1) {
      // First segment - line to first point
      path += ` L ${prev.x} ${prev.y}`;
    }
    
    if (i < points.length - 1) {
      // Middle segments - use quadratic curve through current point
      const next = points[i + 1];
      // Control point is the current point, end at midpoint to next
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
    } else {
      // Last segment - curve to final point
      path += ` Q ${current.x} ${current.y}, ${current.x} ${current.y}`;
    }
  }
  
  return path;
};

export function DrawingScreen({ navigation, route }: Props) {
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
  const [selectedColor, setSelectedColor] = useState<string>(colors.primary.rose);
  const [isDrawing, setIsDrawing] = useState(false);
  const [partnerDrawing, setPartnerDrawing] = useState(false);
  const [partnerName, setPartnerName] = useState<string>("Partner");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const activeStrokeId = useRef<string | null>(null);
  const lastSyncTime = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  const userRef = useRef<any>(null);
  const isSyncingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStrokesRef = useRef<Stroke[]>([]);
  const partnerStrokesRef = useRef<Set<string>>(new Set());

  // Load coupleId and listen for canvas updates
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.navigate("Home");
      return;
    }

    userRef.current = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef.current, (snap) => {
      const data = snap.data() || {};
      if (data.coupleId) {
        setCoupleId(data.coupleId);
      } else {
        setCoupleId(null);
      }
      setPartnerName(data.partnerName || "Partner");
    });

    return () => {
      unsubUser();
    };
  }, [navigation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to shared canvas with optimized updates
  useEffect(() => {
    if (!coupleId) return;
    const canvasRef = doc(db, "couples", coupleId, "realtime", "canvas");

    const unsub = onSnapshot(canvasRef, (snap) => {
      // Prevent updates if we're currently syncing to avoid loops
      if (isSyncingRef.current) return;
      
      const data = snap.data();
      const newStrokes = data?.strokes || [];
      const newPartnerDrawing = Boolean(data?.activeStrokeOwner && data?.activeStrokeOwner !== auth.currentUser?.uid);
      
      // Track partner strokes for smooth rendering
      const currentUserId = auth.currentUser?.uid;
      newStrokes.forEach((stroke: Stroke) => {
        // We can identify partner strokes by checking if they're not in our local ref
        // or by checking stroke metadata if we add it
        if (stroke.id && !strokesRef.current.find(s => s.id === stroke.id)) {
          partnerStrokesRef.current.add(stroke.id);
        }
      });
      
      // Efficient comparison - check for actual changes
      const currentStrokes = strokesRef.current;
      let hasChanged = false;
      
      if (currentStrokes.length !== newStrokes.length) {
        hasChanged = true;
      } else if (newStrokes.length > 0) {
        // Check if any stroke IDs or point counts changed
        for (let i = 0; i < newStrokes.length; i++) {
          const newStroke = newStrokes[i];
          const currentStroke = currentStrokes[i];
          
          if (!currentStroke || 
              currentStroke.id !== newStroke.id ||
              currentStroke.points?.length !== newStroke.points?.length) {
            hasChanged = true;
            break;
          }
        }
      }
      
      if (hasChanged) {
        // Use requestAnimationFrame for smooth updates
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
          setStrokes([...newStrokes]);
          strokesRef.current = newStrokes;
          animationFrameRef.current = null;
        });
      }
      
      setPartnerDrawing(newPartnerDrawing);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      unsub();
    };
  }, [coupleId]);

  const colorsPalette = useMemo(() => [
    colors.primary.rose,
    colors.text.primary,
    "#4CAF50",
    "#2196F3",
    "#FF9800",
  ], []);

  const canvasRef = useMemo(() => {
    return coupleId ? doc(db, "couples", coupleId, "realtime", "canvas") : null;
  }, [coupleId]);

  const syncStrokes = async (next: Stroke[], options?: { activeOwner?: string | null; immediate?: boolean }) => {
    if (!canvasRef) return;
    
    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    
    // For immediate sync (on release), sync right away
    if (options?.immediate) {
      isSyncingRef.current = true;
      try {
        await setDoc(
          canvasRef,
          {
            strokes: next,
            updatedAt: serverTimestamp(),
            activeStrokeOwner: options?.activeOwner ?? null,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Failed to sync drawing:", err);
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      }
      return;
    }
    
    // For non-immediate sync, debounce to reduce writes
    pendingStrokesRef.current = next;
    
    syncTimeoutRef.current = setTimeout(async () => {
      isSyncingRef.current = true;
      try {
        await setDoc(
          canvasRef,
          {
            strokes: pendingStrokesRef.current,
            updatedAt: serverTimestamp(),
            activeStrokeOwner: options?.activeOwner ?? null,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Failed to sync drawing:", err);
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      }
      syncTimeoutRef.current = null;
    }, 150); // Debounce sync to every 150ms
  };

  // Normalize point to 0-1 range based on canvas size
  const normalizePoint = (x: number, y: number): Point => {
    if (canvasSize.width === 0 || canvasSize.height === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: x / canvasSize.width,
      y: y / canvasSize.height,
    };
  };

  // Denormalize point from 0-1 range to current canvas size
  const denormalizePoint = (point: Point): Point => {
    return {
      x: point.x * canvasSize.width,
      y: point.y * canvasSize.height,
    };
  };

  const getPoint = (evt: any): Point => {
    const { locationX, locationY } = evt.nativeEvent;
    return normalizePoint(locationX, locationY);
  };

  // PanResponder for smooth drawing
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          if (!coupleId || canvasSize.width === 0 || canvasSize.height === 0) return;
          setIsDrawing(true);
          const point = getPoint(evt);
          const stroke: Stroke = {
            id: `${Date.now()}-${Math.random()}`,
            color: activeTool === "eraser" ? "#FFFFFF" : selectedColor,
            points: [point], // Already normalized
            width: activeTool === "eraser" ? 20 : 8,
          };
          activeStrokeId.current = stroke.id;
          const next = [...strokesRef.current, stroke];
          strokesRef.current = next;
          setStrokes([...next]);
          syncStrokes(next, { activeOwner: auth.currentUser?.uid || null });
        },
        onPanResponderMove: (evt) => {
          if (!activeStrokeId.current) return;
          const point = getPoint(evt);
          
          // Update strokes immediately
          strokesRef.current = strokesRef.current.map((s) => {
            if (s.id !== activeStrokeId.current) return s;
            const lastPoint = s.points[s.points.length - 1];
            
            // Calculate distance in normalized space (0-1 range)
            const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
            
            // Capture almost all points for accurate drawing - very low threshold
            // 0.0005 in normalized space is roughly 0.05% of canvas - capture almost everything
            if (distance < 0.0005) return s; // Skip only if extremely close (same point)
            
            // Always add the point, and interpolate for larger gaps to ensure smooth curves
            const interpolatedPoints: Point[] = [];
            // 0.015 in normalized space is roughly 1.5% of canvas - interpolate for larger gaps
            if (distance > 0.015) {
              // Add intermediate points for smoother curves when distance is larger
              const steps = Math.min(Math.floor(distance / 0.008), 8); // More steps for smoother curves
              for (let i = 1; i <= steps; i++) {
                const t = i / (steps + 1);
                interpolatedPoints.push({
                  x: lastPoint.x + (point.x - lastPoint.x) * t,
                  y: lastPoint.y + (point.y - lastPoint.y) * t,
                });
              }
            }
            
            return { 
              ...s, 
              points: [...s.points, ...interpolatedPoints, point], // All points normalized
            };
          });

          // Use requestAnimationFrame for smooth rendering
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          animationFrameRef.current = requestAnimationFrame(() => {
            setStrokes([...strokesRef.current]);
            animationFrameRef.current = null;
          });
          
          // Throttle sync to backend (less frequent than rendering)
          const now = Date.now();
          if (now - lastSyncTime.current > 100) { // Reduced from 200ms to 100ms for smoother sync
            lastSyncTime.current = now;
            syncStrokes(strokesRef.current, { activeOwner: auth.currentUser?.uid || null });
          }
        },
        onPanResponderRelease: () => {
          setIsDrawing(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          activeStrokeId.current = null;
          setStrokes([...strokesRef.current]);
          // Immediate sync on release to ensure final state is saved
          syncStrokes(strokesRef.current, { activeOwner: null, immediate: true });
        },
        onPanResponderTerminate: () => {
          setIsDrawing(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          activeStrokeId.current = null;
          // Immediate sync on terminate
          syncStrokes(strokesRef.current, { activeOwner: null, immediate: true });
        },
      }),
    [coupleId, canvasSize, selectedColor, activeTool]
  );

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const handleClear = () => {
    Alert.alert(
      "Clear Canvas",
      "Are you sure you want to clear the entire canvas?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setStrokes([]);
            strokesRef.current = [];
            syncStrokes([], { activeOwner: null });
          },
        },
      ]
    );
  };

  const handleSave = () => {
    Alert.alert("Save Drawing", "Drawing saved successfully!");
  };

  const handleUndo = () => {
    if (!strokes.length) return;
    const next = strokes.slice(0, -1);
    strokesRef.current = next;
    setStrokes(next);
    syncStrokes(next, { activeOwner: null });
  };

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
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
          style={({ pressed }) => [
            {
              padding: wp(spacing.sm),
              position: 'absolute',
              left: 0,
              top: hp(spacing.xl),
              bottom: hp(spacing.md),
              justifyContent: 'center',
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
        <Text style={{
          fontSize: fontSize(typography.sizes.body),
          fontWeight: typography.weights.regular,
          color: colors.text.secondary,
        }}>
          Draw Together
        </Text>
        <View style={{ width: wp(40) }} />
      </View>

      <View style={{ flex: 1 }}>
        {/* Status */}
        {partnerDrawing && (
          <View style={{ marginBottom: hp(spacing.sm), paddingHorizontal: wp(spacing.lg) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(spacing.xs) }}>
              <Text style={{ fontSize: fontSize(typography.sizes.small), color: colors.text.secondary }}>
                {partnerName} is drawing...
              </Text>
              <View style={{ 
                width: wp(6), 
                height: wp(6), 
                borderRadius: wp(3), 
                backgroundColor: colors.status.online 
              }} />
              <Text style={{ fontSize: fontSize(typography.sizes.caption), color: colors.text.tertiary }}>
                Active now
              </Text>
            </View>
          </View>
        )}

        {/* Canvas Area - Full Width */}
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.secondary.lightGray,
            marginBottom: hp(spacing.sm),
            overflow: 'hidden',
            backgroundColor: "#FFFFFF",
            flex: 1,
            minHeight: hp(300),
            maxHeight: hp(450),
            width: '100%',
          }}
          onLayout={handleCanvasLayout}
          {...panResponder.panHandlers}
        >
          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <Svg 
              style={{ 
                width: canvasSize.width, 
                height: canvasSize.height,
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            >
              {strokes.map((stroke) => {
                if (!stroke.points || stroke.points.length === 0) return null;
                
                // Convert normalized points (0-1) to current canvas pixel coordinates
                const denormalizedPoints = stroke.points.map(p => denormalizePoint(p));
                
                const pathData = createSmoothPath(denormalizedPoints);
                return (
                  <Path
                    key={stroke.id}
                    d={pathData}
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeMiterlimit={10}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </Svg>
          )}
        </View>

        {/* Tools */}
        <View style={{ marginBottom: hp(spacing.xs), paddingHorizontal: wp(spacing.lg) }}>
          <Text style={{ 
            fontSize: fontSize(typography.sizes.caption), 
            fontWeight: typography.weights.medium, 
            marginBottom: hp(spacing.sm),
            color: colors.text.secondary 
          }}>
            Tools
          </Text>
          <View style={{ flexDirection: 'row', gap: wp(spacing.sm) }}>
            <Pressable
              onPress={() => setActiveTool("pen")}
              style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(10),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                backgroundColor: activeTool === "pen" ? colors.primary.rose : colors.background.surface,
                borderColor: activeTool === "pen" ? colors.primary.rose : colors.secondary.lightGray,
              }}
            >
              <Text style={{ fontSize: fontSize(16) }}>🖌️</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTool("eraser")}
              style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(10),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                backgroundColor: activeTool === "eraser" ? colors.primary.rose : colors.background.surface,
                borderColor: activeTool === "eraser" ? colors.primary.rose : colors.secondary.lightGray,
              }}
            >
              <Text style={{ fontSize: fontSize(16) }}>🧹</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                // Cycle through colors
                const currentIndex = colorsPalette.indexOf(selectedColor);
                const nextIndex = (currentIndex + 1) % colorsPalette.length;
                setSelectedColor(colorsPalette[nextIndex]);
              }}
              style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(10),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                backgroundColor: selectedColor,
                borderColor: colors.secondary.lightGray,
                opacity: 0.8,
              }}
            >
              <Text style={{ fontSize: fontSize(16) }}>🎨</Text>
            </Pressable>
            <Pressable
              onPress={handleUndo}
              style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(10),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                backgroundColor: "#FFFFFF",
                borderColor: colors.secondary.lightGray,
              }}
            >
              <Text style={{ fontSize: fontSize(16) }}>⟲</Text>
            </Pressable>
            <Pressable
              onPress={handleClear}
              style={{
                width: wp(40),
                height: wp(40),
                borderRadius: wp(10),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                backgroundColor: "#FFFFFF",
                borderColor: colors.secondary.lightGray,
              }}
            >
              <Text style={{ fontSize: fontSize(16) }}>❌</Text>
            </Pressable>
          </View>
        </View>

        {/* Colors */}
        <View style={{ marginBottom: hp(spacing.sm), paddingHorizontal: wp(spacing.lg) }}>
          <Text style={{ 
            fontSize: fontSize(typography.sizes.caption), 
            fontWeight: typography.weights.medium, 
            marginBottom: hp(spacing.sm),
            color: colors.text.secondary 
          }}>
            Colors
          </Text>
          <View style={{ flexDirection: 'row', gap: wp(spacing.sm) }}>
            {colorsPalette.map((color, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: wp(40),
                  height: wp(40),
                  borderRadius: wp(20),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color,
                  borderColor: selectedColor === color ? colors.secondary.charcoalGray : "transparent",
                  borderWidth: selectedColor === color ? 3 : 2,
                }}
              >
                {selectedColor === color && (
                  <Text style={{ color: "#FFFFFF", fontSize: fontSize(10) }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

      </View>
    </View>
  );
}
