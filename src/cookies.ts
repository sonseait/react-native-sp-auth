import { Platform } from 'react-native';

export interface SPCookie {
  FedAuth: string;
  rtFa: string;
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
        domain: '.sharepoint.com',
        path: '/',
      });
      await this.reader.set(`https://${this.siteName}.sharepoint.com`, 'FedAuth', fedAuthToken, {
        domain: `${this.siteName}.sharepoint.com`,
        path: '/',
      });
    } else {
      await this.reader.set(
        `https://${this.siteName}.sharepoint.com`,
        `rtFa=${rtFaToken}; Domain=.sharepoint.com; Path=/; Secure; HttpOnly`
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
