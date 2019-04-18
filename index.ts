import { NativeModules, Platform } from 'react-native';
import invariant from 'invariant';
import { SharePointAuth, LoginResponse, SpCookie } from './src/sp';

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
    this.spAuth = new SharePointAuth(RNSpAuth, host);
  }

  /**
   * Initialization
   */
  async init(): Promise<RNSharePointAuth> {
    await this.spAuth.init();
    return this;
  }

  /**
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  login(username: string, password: string): Promise<LoginResponse> {
    return this.spAuth.login(username, password);
  }

  logout() {
    this.spAuth.logout();
  }

  get currentCookie(): string | undefined {
    if (!this.spAuth.currentCookie) return undefined;
    return `FedAuth=${this.spAuth.currentCookie.FedAuth};rtFa=$${this.spAuth.currentCookie.rtFa}`;
  }

  set currentCookie(cookie: string | undefined) {
    if (!cookie) {
      this.spAuth.currentCookie = undefined;
      return;
    }
    if (cookie.includes('FedAuth=') && cookie.includes('rtFa=')) {
      const parts = cookie.split(';');
      const newCookie = parts.reduce((acc: Partial<SpCookie>, part: string) => {
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
      if (newCookie.FedAuth && newCookie.rtFa) {
        this.spAuth.currentCookie = newCookie as SpCookie;
      } else {
        this.spAuth.currentCookie = undefined;
      }
    }
  }

  /**
   * Renew the `digest`
   */
  renewDigest(): Promise<string> {
    return this.spAuth.renewDigest();
  }
}

export default RNSharePointAuth;
