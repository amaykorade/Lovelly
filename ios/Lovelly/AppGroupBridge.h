//
//  AppGroupBridge.h
//  Lovelly
//
//  iOS Native Bridge for App Group access
//  This allows React Native to write data to App Group UserDefaults
//  which the widget extension can read
//

#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>

@interface AppGroupBridge : NSObject <RCTBridgeModule>

@end

