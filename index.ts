import { NativeModules, Platform } from 'react-native';
import axios from 'axios';
import { SPCookieReader } from './src/cookies';
import { parseXml, samlTemplate } from './src/utils';

const { RNSpAuthIOS, RNSpAuthAndroid } = NativeModules;

let RNSpAuth: any;

if (Platform.OS === 'ios') {
  if (!RNSpAuthIOS) throw new Error(`Can't use native module`);
  RNSpAuth = RNSpAuthIOS;
} else if (Platform.OS === 'android') {
  if (!RNSpAuthAndroid) throw new Error(`Can't use native module`);
  RNSpAuth = RNSpAuthAndroid;
} else {
  throw new Error('react-native-sp-auth: Invalid platform. This library only supports Android and iOS.');
}

class RNSharePointAuth {
  private cookieReader: SPCookieReader;
  private siteName: string;

  constructor(host: string) {
    this.siteName = host.trim().split('/')[2].replace('.sharepoint.com', '');
    if (!this.siteName.includes('.sharepoint.com')) throw new Error('Invalid site url');
    this.cookieReader = new SPCookieReader(RNSpAuth, this.siteName);
  }

  async getSpCookies(
    token: string
  ): Promise<{
    FedAuth: string;
    rtFa: string;
  }> {
    await axios.post(`https://${this.siteName}.sharepoint.com/_forms/default.aspx?wa=wsignin1.0`, token, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)',
      },
    });
    // check if cookie was assigned successful?
    const cookies = await this.cookieReader.getCookie();
    return {
      FedAuth: cookies.FedAuth,
      rtFa: cookies.rtFa,
    };
  }

  /**
   * Login to SharePoint Online by provide `token` and take `digest` back
   */
  async loginToken(token: string): Promise<void> {
    await this.logout();
    const spCookies = await this.getSpCookies(token);
    if (!spCookies.FedAuth || !spCookies.rtFa) {
      throw new Error(`Invalid cookies`);
    }
  }

  /**
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  async login(
    username: string,
    password: string
  ): Promise<{
    token: string;
    expired: Date;
  }> {
    await this.logout();

    const loginResponse = await axios.post<string>(
      'https://login.microsoftonline.com/extSTS.srf',
      samlTemplate
        .replace('{username}', username)
        .replace('{password}', password)
        .replace('{url}', `https://${this.siteName}.sharepoint.com`)
    );
    const body = (await parseXml(loginResponse.data)) as Record<string, any>;
    const responseBody = body['S:Envelope']['S:Body'][0];
    if (responseBody['S:Fault']) {
      return Promise.reject({
        code: responseBody['S:Fault'][0]['S:Reason'][0]['S:Text'][0]._,
        message: responseBody['S:Fault'][0]['S:Detail'][0]['psf:error'][0]['psf:internalerror'][0]['psf:text'][0],
      });
    }
    const token =
      responseBody['wst:RequestSecurityTokenResponse'][0]['wst:RequestedSecurityToken'][0][
        'wsse:BinarySecurityToken'
      ][0]._;

    const expired = responseBody['wst:RequestSecurityTokenResponse'][0]['wst:Lifetime'][0]['wsu:Expires'][0];

    const spCookies = await this.getSpCookies(token);

    if (!spCookies.FedAuth || !spCookies.rtFa) {
      throw new Error(`Invalid cookies`);
    }

    return {
      token: token,
      expired: new Date(expired),
    };
  }

  async logout(): Promise<void> {
    // const currentCookie = await this.cookieReader.getCookie();
    // console.log(`current cookie: ${JSON.stringify(currentCookie)}`);
    await this.cookieReader.removeCookie();
    // const cookieAfterRemoved = await this.cookieReader.getCookie();
    // console.log(`cookie after removed: ${JSON.stringify(cookieAfterRemoved)}`);
  }
}

export default RNSharePointAuth;
