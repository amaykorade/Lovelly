/**
 * iOS App Group Bridge
 * 
 * This is a placeholder TypeScript interface for the native iOS module.
 * The actual implementation will be in Objective-C/Swift.
 * 
 * To implement:
 * 1. Create ios/AppGroupBridge.m and ios/AppGroupBridge.h
 * 2. Register the module in AppDelegate or create a separate bridge file
 * 3. The native module will write to App Group UserDefaults
 */

import { NativeModules } from 'react-native';

interface AppGroupBridgeInterface {
  writeToAppGroup(
    groupId: string,
    key: string,
    value: string
  ): Promise<boolean>;
}

// Try to get the native module, but handle gracefully if not available
let AppGroupBridge: AppGroupBridgeInterface | null = null;

try {
  AppGroupBridge = NativeModules.AppGroupBridge as AppGroupBridgeInterface;
} catch (error) {
  console.warn('AppGroupBridge native module not available:', error);
}

export { AppGroupBridge };

