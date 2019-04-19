#import "RNSpAuth.h"
#if __has_include("RCTConvert.h")
#import "RCTConvert.h"
#else
#import <React/RCTConvert.h>
#endif

@implementation RNSpAuthIOS

- (instancetype)init
{
    self = [super init];
    if (self) {
        self.formatter = [NSDateFormatter new];
        [self.formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(get:(NSURL *) url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSMutableDictionary *cookies = [NSMutableDictionary dictionary];
    for (NSHTTPCookie *c in [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:url]) {
        NSMutableDictionary *d = [NSMutableDictionary dictionary];
        [d setObject:c.value forKey:@"value"];
        [d setObject:c.name forKey:@"name"];
        [d setObject:c.domain forKey:@"domain"];
        [d setObject:c.path forKey:@"path"];
        [d setObject:[self.formatter stringFromDate:c.expiresDate] forKey:@"expiresDate"];
        [cookies setObject:d forKey:c.name];
    }
    resolve(cookies);
}

RCT_EXPORT_METHOD(set:(NSURL *) url
                  name:(NSString *)name
                  value:(NSString *)value
                  props:(NSDictionary *)props
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSMutableDictionary *cookieProperties = [NSMutableDictionary dictionary];

    [cookieProperties setObject:url.host forKey:NSHTTPCookieOriginURL];
    [cookieProperties setObject:name forKey:NSHTTPCookieName];
    [cookieProperties setObject:value forKey:NSHTTPCookieValue];

    NSString *domain = [RCTConvert NSString:props[@"domain"]];
    [cookieProperties setObject:domain ? domain : url.host forKey:NSHTTPCookieDomain];

    NSString *path = [RCTConvert NSString:props[@"path"]];
    [cookieProperties setObject:path ? path : @"/" forKey:NSHTTPCookiePath];

    NSNumber *expires = [RCTConvert NSNumber:props[@"expires"]];
    if (expires) {
        [cookieProperties setObject:[NSDate dateWithTimeIntervalSince1970:[expires doubleValue]] forKey:NSHTTPCookieExpires];
    };

    NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:cookieProperties];
    [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];

    resolve(nil);
}

RCT_EXPORT_METHOD(remove:(NSString *) url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    for (NSHTTPCookie *c in cookieStorage.cookies) {
      if ([[c name] isEqualToString:url]) {
        [cookieStorage deleteCookie:c];
      }
    }
    resolve(nil);
}

RCT_EXPORT_METHOD(
    clear:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject)
{
    NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    for (NSHTTPCookie *c in cookieStorage.cookies) {
        [cookieStorage deleteCookie:c];
    }
    resolve(nil);
}

@end
