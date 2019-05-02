import axios from 'axios';
import { Platform } from 'react-native';
const parseString = require('react-native-xml2js').parseString;
import { encode } from 'base-64';

const parseXml = (xml: string) => {
  return new Promise((resolve, reject) => {
    parseString(xml, function(err: any, result: any) {
      if (err) {
        reject(`Can't parse xml string from login response`);
      } else {
        resolve(result);
      }
    });
  });
};

const samlTpl = `
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <s:Header>
      <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/02/trust/RST/Issue</a:Action>
      <a:ReplyTo>
          <a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>
      </a:ReplyTo>
      <a:To s:mustUnderstand="1">https://login.microsoftonline.com/extSTS.srf</a:To>
      <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
          <o:UsernameToken>
              <o:Username>{username}</o:Username>
              <o:Password>{password}</o:Password>
          </o:UsernameToken>
      </o:Security>
    </s:Header>
    <s:Body>
      <t:RequestSecurityToken xmlns:t="http://schemas.xmlsoap.org/ws/2005/02/trust">
          <wsp:AppliesTo xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">
              <a:EndpointReference>
                  <a:Address>{url}</a:Address>
              </a:EndpointReference>
          </wsp:AppliesTo>
          <t:KeyType>http://schemas.xmlsoap.org/ws/2005/05/identity/NoProofKey</t:KeyType>
          <t:RequestType>http://schemas.xmlsoap.org/ws/2005/02/trust/Issue</t:RequestType>
          <t:TokenType>urn:oasis:names:tc:SAML:1.0:assertion</t:TokenType>
      </t:RequestSecurityToken>
    </s:Body>
  </s:Envelope>
`;

export interface SPCookie {
  FedAuth: string;
  rtFa: string;
}

export interface LoginResponse {
  cookie: string;
  digest: string;
}

export class SPCookieReader {
  private reader: any;
  private siteName: string;

  constructor(reader: any, siteName: string) {
    this.reader = reader;
    this.siteName = siteName;
  }

  async getCookie(): Promise<SPCookie> {
    const cookie = await this.reader.get(`https://${this.siteName}.sharepoint.com`);
    if (Platform.OS === 'ios' && cookie && cookie.FedAuth && cookie.rtFa) {
      return {
        FedAuth: cookie.FedAuth.value,
        rtFa: cookie.rtFa.value,
      };
    }
    return {
      FedAuth: cookie.FedAuth,
      rtFa: cookie.rtFa,
    };
  }

  async removeCookie(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.reader.remove(`${this.siteName}.sharepoint.com`);
      return this.reader.remove(`.sharepoint.com`);
    }
    return this.reader.remove(this.siteName);
  }

  async setCookie(rtFaToken: string, fedAuthToken: string): Promise<void> {
    // const currentCookie = await this.getCookie();
    // console.log(`current cookie: ${JSON.stringify(currentCookie)}`);

    if (Platform.OS === 'ios') {
      await this.reader.set(`https://${this.siteName}.sharepoint.com`, 'rtFa', rtFaToken, {
        domain: 'sharepoint.com',
        path: '/',
      });
      await this.reader.set(`https://${this.siteName}.sharepoint.com`, 'FedAuth', fedAuthToken, {
        domain: `${this.siteName}.sharepoint.com`,
        path: '/',
      });
    } else {
      await this.reader.set(
        `https://${this.siteName}.sharepoint.com`,
        `rtFa=${rtFaToken}; Domain=sharepoint.com; Path=/; Secure; HttpOnly`
      );
      await this.reader.set(
        `https://${this.siteName}.sharepoint.com`,
        `FedAuth=${fedAuthToken}; Domain=${this.siteName}.sharepoint.com; Path=/; Secure; HttpOnly`
      );
    }

    // const cookieAfterSetted = await this.getCookie();
    // console.log(`cookie after setted: ${JSON.stringify(cookieAfterSetted)}`);
  }
}

export class SharePointAuth {
  private siteName: string;
  private cookieReader: SPCookieReader;

  constructor(cookieReader: SPCookieReader, siteName: string) {
    this.siteName = siteName;
    this.cookieReader = cookieReader;
  }

  async getCurrentToken(): Promise<SPCookie> {
    const cookies = await this.cookieReader.getCookie();
    if (cookies.FedAuth && cookies.rtFa) {
      return cookies;
    }
    return Promise.reject(`Token isn't valid`);
  }

  setCurrentToken(cookie: Partial<SPCookie>): Promise<void> {
    if (cookie.FedAuth && cookie.rtFa) {
      return this.cookieReader.setCookie(cookie.rtFa, cookie.FedAuth);
    }
    return Promise.reject(`Your cookie you just set isn't match with SharePoint format`);
  }

  private async getToken(username: string, password: string): Promise<string> {
    const loginResponse = await axios.post<string>(
      'https://login.microsoftonline.com/extSTS.srf',
      samlTpl
        .replace('{username}', username)
        .replace('{password}', password)
        .replace('{url}', `https://${this.siteName}.sharepoint.com`)
    );
    const body = (await parseXml(loginResponse.data)) as Record<string, any>;
    const responseBody = body['S:Envelope']['S:Body'][0];
    if (responseBody['S:Fault']) return Promise.reject();
    const token =
      responseBody['wst:RequestSecurityTokenResponse'][0]['wst:RequestedSecurityToken'][0][
        'wsse:BinarySecurityToken'
      ][0]['_'];
    if (!token)
      return Promise.reject(
        `Can't obtain token, maybe wrong credentials or you not have permission to access this site`
      );
    return token;
  }

  private async getCookie(token: string): Promise<void> {
    await axios.post(`https://${this.siteName}.sharepoint.com/_forms/default.aspx?wa=wsignin1.0`, token);
    // check if cookie was assigned successful?
    await this.getCurrentToken();
  }

  async getDigest(siteCollectionRelativePath?: string): Promise<string> {
    const res = await axios.post(
      `https://${this.siteName}.sharepoint.com${siteCollectionRelativePath || ''}/_api/contextinfo`,
      {},
      {
        headers: {
          Accept: 'application/json; odata=verbose',
        },
      }
    );
    try {
      const digest = res.data.d.GetContextWebInformation.FormDigestValue;
      if (!digest) return Promise.reject(`Can't obtain digest`);
      return digest;
    } catch (e) {
      return Promise.reject(`Something error when trying to obtain digest, maybe token was expired`);
    }
  }

  /**
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    await this.logout();
    const token = await this.getToken(username, password);
    await this.getCookie(token);
    const cookie = await this.getCurrentToken();
    const digest = await this.getDigest();
    return {
      digest,
      cookie: encode(JSON.stringify(cookie)),
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
