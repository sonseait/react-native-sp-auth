import axios from 'axios';
const parseString = require('react-native-xml2js').parseString;

const parseXml = (xml: string) => {
  return new Promise((resolve, reject) => {
    parseString(xml, function(err: any, result: any) {
      if (err) {
        reject();
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

export interface SpCookie {
  FedAuth: string;
  rtFa: string;
}

export interface LoginResponse {
  cookie: string;
  digest: string;
}

export class SharePointAuth {
  private domain: string;
  private currentCookie: SpCookie | undefined = undefined;
  private cookieReader: any;
  private host: string;

  constructor(cookieReader: any, host: string) {
    this.domain = host
      .trim()
      .split('/')[2]
      .replace('.sharepoint.com', '');
    this.cookieReader = cookieReader;
    this.host = host;
  }

  async init(): Promise<SharePointAuth> {
    const cookies = await this.cookieReader.get(`https://${this.domain}.sharepoint.com`);
    if (!cookies.FedAuth || !cookies.rtFa) return this;
    this.currentCookie = {
      FedAuth: cookies.FedAuth,
      rtFa: cookies.rtFa,
    };
    return this;
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
    if (!token) return Promise.reject();
    return token;
  }

  private async getCookie(token: string): Promise<SpCookie> {
    await axios.post(`https://${this.domain}.sharepoint.com/_forms/default.aspx?wa=wsignin1.0`, token, {
      withCredentials: true,
    });
    const cookies = await this.cookieReader.get(`https://${this.domain}.sharepoint.com`);
    if (!cookies.FedAuth || !cookies.rtFa) return Promise.reject();
    return {
      FedAuth: cookies.FedAuth,
      rtFa: cookies.rtFa,
    };
  }

  getCurrentCookie(): string | undefined {
    return this.currentCookie && `FedAuth=${this.currentCookie.FedAuth};rtFa=$${this.currentCookie.rtFa}`;
  }

  private async getDigest(cookie: SpCookie): Promise<string> {
    const res = await axios.post(
      `https://${this.domain}.sharepoint.com/_api/contextinfo`,
      {},
      {
        headers: {
          Accept: 'application/json; odata=verbose',
          Cookie: `FedAuth=${cookie.FedAuth};rtFa=$${cookie.rtFa}`,
          'Content-Type': 'application/json; odata=verbose',
        },
      }
    );
    try {
      const digest = res.data.d.GetContextWebInformation.FormDigestValue;
      if (!digest) return Promise.reject();
      return digest;
    } catch (e) {
      return Promise.reject();
    }
  }

  /**
   * Login to SharePoint Online by provide `username` & `password` and take `digest` back
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    await this.logout();
    const token = await this.getToken(username, password);
    this.currentCookie = await this.getCookie(token);
    const digest = await this.getDigest(this.currentCookie);
    return {
      digest,
      cookie: `FedAuth=${this.currentCookie.FedAuth};rtFa=${this.currentCookie.rtFa}`,
    };
  }

  logout(): Promise<void> {
    this.currentCookie = undefined;
    return this.cookieReader.clearCookies();
    // return this.cookieReader.removeByHost(`https://${this.domain}.sharepoint.com`);
  }

  /**
   * renew the digest
   */
  renewDigest(): Promise<string> {
    if (this.currentCookie) {
      return this.getDigest(this.currentCookie);
    }
    return Promise.reject();
  }
}
