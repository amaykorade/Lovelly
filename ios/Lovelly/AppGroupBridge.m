//
//  AppGroupBridge.m
//  Lovelly
//
//  iOS Native Bridge implementation for App Group access
//

#import "AppGroupBridge.h"
#import <React/RCTLog.h>

@implementation AppGroupBridge

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(writeToAppGroup:(NSString *)groupId
                  key:(NSString *)key
                  value:(NSString *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:groupId];
        if (sharedDefaults) {
            [sharedDefaults setObject:value forKey:key];
            [sharedDefaults synchronize];
            RCTLogInfo(@"AppGroupBridge: Successfully wrote to App Group %@ with key %@", groupId, key);
            resolve(@(YES));
        } else {
            NSString *errorMsg = [NSString stringWithFormat:@"Failed to access App Group: %@", groupId];
            RCTLogError(@"AppGroupBridge: %@", errorMsg);
            reject(@"ERROR", errorMsg, nil);
        }
    } @catch (NSException *exception) {
        NSString *errorMsg = [NSString stringWithFormat:@"Exception writing to App Group: %@", exception.reason];
        RCTLogError(@"AppGroupBridge: %@", errorMsg);
        reject(@"ERROR", errorMsg, nil);
    }
}

@end

