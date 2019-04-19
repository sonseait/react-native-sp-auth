import { NativeModules, Platform } from 'react-native';
import invariant from 'invariant';
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
    this.spAuth = new SharePointAuth(new SPCookieReader(RNSpAuth), host);
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

  async getCurrentCookie(): Promise<string> {
    const cookie = await this.spAuth.getCurrentCookie();
    return btoa(`FedAuth=${cookie.FedAuth};rtFa=${cookie.rtFa}`);
  }

  async setCurrentCookie(cookie: string): Promise<void> {
    if (!cookie) {
      return this.spAuth.logout();
    }
    try {
      const realCookie = atob(cookie);
      if (realCookie.includes('FedAuth=') && realCookie.includes('rtFa=')) {
        const parts = realCookie.split(';');
        const newCookie = parts.reduce((acc: Partial<SPCookie>, part: string) => {
          part = part.trim();
          if (part.startsWith('FedAuth=')) {
            const fed = part.replace('FedAuth=', '');
            if (fed) {
              acc.FedAuth = fed;
            }
          }
          if (part.startsWith('rtFa=')) {
            const rtfa = part.replace('rtFa=', '');
            if (rtfa) {
              acc.rtFa = rtfa;
            }
          }
          return acc;
        }, {});
        return this.spAuth.setCurrentCookie(newCookie);
      }
    } catch (e) {
      return this.spAuth.logout();
    }
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
