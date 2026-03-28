#import <React/RCTBridgeModule.h>

/**
 * Objective-C bridge macro that registers CleverTapSecondary Swift module
 * with React Native's native module system.
 */
@interface RCT_EXTERN_MODULE(CleverTapSecondary, NSObject)

RCT_EXTERN_METHOD(recordEvent:(NSString *)eventName)
RCT_EXTERN_METHOD(recordEventWithProps:(NSString *)eventName properties:(NSDictionary *)properties)
RCT_EXTERN_METHOD(profileSet:(NSDictionary *)profile)
RCT_EXTERN_METHOD(onUserLogin:(NSDictionary *)profile)
RCT_EXTERN_METHOD(recordChargedEvent:(NSDictionary *)chargeDetails items:(NSArray *)items)

// Product Config (Product Experiences)
RCT_EXTERN_METHOD(productConfigFetch)
RCT_EXTERN_METHOD(productConfigActivate)
RCT_EXTERN_METHOD(productConfigFetchAndActivate)
RCT_EXTERN_METHOD(productConfigSetMinimumFetchIntervalInSeconds:(double)seconds)
RCT_EXTERN_METHOD(productConfigGetBoolean:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(productConfigGetLong:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(productConfigGetString:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(productConfigReset)

@end
