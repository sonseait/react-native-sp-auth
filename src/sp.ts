import axios from 'axios';
import { Platform } from 'react-native';
const parseString = require('react-native-xml2js').parseString;

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
  constructor(reader: any) {
    this.reader = reader;
  }

  getCookie(siteName: string): Promise<SPCookie> {
    return this.reader.get(`https://${siteName}.sharepoint.com`);
  }

  removeCookie(siteName: string): Promise<void> {
    return this.reader.remove(`https://${siteName}.sharepoint.com`);
  }

  async setCookie(siteName: string, rtFaToken: string, fedAuthToken: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.reader.set(`https://${siteName}.sharepoint.com`, 'rtFa', rtFaToken, {
        domain: 'sharepoint.com',
        path: '/',
      });
      await this.reader.set(`https://${siteName}.sharepoint.com`, 'FedAuth', fedAuthToken, {
        domain: `${siteName}.sharepoint.com`,
        path: '/',
      });
    } else {
      await this.reader.set(
        `https://${siteName}.sharepoint.com`,
        `rtFa=${rtFaToken}; Domain=sharepoint.com; Path=/; Secure; HttpOnly`
      );
      await this.reader.set(
        `https://${siteName}.sharepoint.com`,
        `FedAuth=${fedAuthToken}; Path=/; Secure; HttpOnly; Domain=${siteName}.sharepoint.com`
      );
    }
  }
}

export class SharePointAuth {
  private domain: string;
  private cookieReader: SPCookieReader;
  private host: string;

  constructor(cookieReader: SPCookieReader, host: string) {
    this.domain = host
      .trim()
      .split('/')[2]
      .replace('.sharepoint.com', '');
    this.cookieReader = cookieReader;
    this.host = host;
  }

  async getCurrentCookie(): Promise<SPCookie> {
    const cookies = await this.cookieReader.getCookie(this.domain);
    if (cookies.FedAuth && cookies.rtFa) {
      return cookies;
    }
    return Promise.reject(`SharePoint Cookie isn't valid`);
  }

  setCurrentCookie(cookie: Partial<SPCookie>): Promise<void> {
    if (cookie.FedAuth && cookie.rtFa) {
      return this.cookieReader.setCookie(this.domain, cookie.rtFa, cookie.FedAuth);
    }
    return Promise.reject(`Your cookie you just set isn't match with SharePoint format`);
  }

  private async getToken(username: string, password: string): Promise<string> {
    const loginResponse = await axios.post<string>(
      'https://login.microsoftonline.com/extSTS.srf',
      samlTpl
        .replace('{username}', username)
        .replace('{password}', password)
        .replace('{url}', this.host)
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
    await axios.post(`https://${this.domain}.sharepoint.com/_forms/default.aspx?wa=wsignin1.0`, token, {
      withCredentials: true,
    });
    // check if cookie was assigned successful?
    await this.getCurrentCookie();
  }

  async getDigest(siteCollectionRelativePath?: string): Promise<string> {
    const res = await axios.post(
      `https://${this.domain}.sharepoint.com${siteCollectionRelativePath || ''}/_api/contextinfo`,
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
    const cookie = await this.getCurrentCookie();
    const digest = await this.getDigest();
    return {
      digest,
      cookie: btoa(`FedAuth=${cookie.FedAuth};rtFa=${cookie.rtFa}`),
    };
  }

  logout(): Promise<void> {
    return this.cookieReader.removeCookie(this.domain);
    // return this.cookieReader.clearCookies();
  }
}
