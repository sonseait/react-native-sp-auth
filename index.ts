import { NativeModules, Platform } from 'react-native';
const invariant = require('invariant');
import { SharePointAuth, LoginResponse, SPCookie, SPCookieReader } from './src/sp';

const { RNSpAuthIOS, RNSpAuthAndroid } = NativeModules;

let RNSpAuth: any;

if (Platform.OS === 'ios') {
  invariant(RNSpAuthIOS, 'react-native-sp-auth: Add RNSpAuth.h and RNSpAuth.m to your Xcode project');
  RNSpAuth = RNSpAuthIOS;
} else if (Platform.OS === 'android') {
  invariant(
    RNSpAuthAndroid,
    'react-native-sp-auth: Import libraries to android "react-native link react-native-sp-auth"'
  );
  RNSpAuth = RNSpAuthAndroid;
} else {
  invariant(RNSpAuth, 'react-native-sp-auth: Invalid platform. This library only supports Android and iOS.');
}

class RNSharePointAuth {
  private spAuth: SharePointAuth;

  constructor(host: string) {
    const siteName = host
      .trim()
      .split('/')[2]
      .replace('.sharepoint.com', '');
    this.spAuth = new SharePointAuth(new SPCookieReader(RNSpAuth, siteName), siteName);
  }

  /**
   * Login to SharePoint Online by provide `token` and take `digest` back
   */
  async loginToken(token: string): Promise<LoginResponse> {
    return this.spAuth.loginToken(token);
  }

  /**
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  login(username: string, password: string): Promise<LoginResponse> {
    return this.spAuth.login(username, password);
  }

  logout(): Promise<void> {
    return this.spAuth.logout();
  }

  /**
   * Renew the `digest`
   *
   * full url: https://yoursite.sharepoint.com/sites/o40
   * => siteCollectionRelativePath === /sites/o40
   */
  renewDigest(siteCollectionRelativePath?: string): Promise<string> {
    return this.spAuth.getDigest(siteCollectionRelativePath);
  }
}

export default RNSharePointAuth;
