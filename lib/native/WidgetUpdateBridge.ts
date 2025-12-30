/**
 * Android Widget Update Bridge
 * 
 * This is a placeholder TypeScript interface for the native Android module.
 * The actual implementation will be in Kotlin/Java.
 * 
 * To implement:
 * 1. Create android/app/src/main/java/com/lovelly/WidgetUpdateBridgeModule.kt
 * 2. Register the module in MainApplication.java
 * 3. The native module will send a broadcast intent to update the widget
 */

import { NativeModules } from 'react-native';

interface WidgetUpdateBridgeInterface {
  sendWidgetUpdate(): Promise<boolean>;
}

// Try to get the native module, but handle gracefully if not available
let WidgetUpdateBridge: WidgetUpdateBridgeInterface | null = null;

try {
  WidgetUpdateBridge = NativeModules.WidgetUpdateBridge as WidgetUpdateBridgeInterface;
} catch (error) {
  console.warn('WidgetUpdateBridge native module not available:', error);
}

export { WidgetUpdateBridge };

