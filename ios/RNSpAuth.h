#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#else
#import "RCTBridgeModule.h"
#endif

#import <WebKit/WebKit.h>

@interface RNSpAuthIOS : NSObject <RCTBridgeModule>

@property (nonatomic, strong) NSDateFormatter *formatter;

@end
