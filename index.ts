import { NativeModules, Platform } from 'react-native';
import invariant from 'invariant';
import { SharePointAuth } from './src/sp';

const { RNSpAuthIOS, RNSpAuthAndroid } = NativeModules;

let RNSpAuth: any;

if (Platform.OS === 'ios') {
  invariant(
    RNSpAuthIOS,
    'react-native-sp-auth: Add RNSpAuth.h and RNSpAuth.m to your Xcode project'
  );
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
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  login(username: string, password: string): Promise<string> {
    return this.spAuth.login(username, password);
  }

  logout() {
    this.spAuth.logout();
  }

  /**
   * renew the `digest`
   */
  renewDigest(): Promise<string> {
    return this.spAuth.renewDigest();
  }
}

export default RNSharePointAuth;
