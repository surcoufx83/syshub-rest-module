import { BehaviorSubject, Observable } from "rxjs";
import { Settings } from "./settings";

export class Session implements OAuthSession {

  // reference to the token information
  private sessiontoken?: Token;

  // track the current login state and make it public readable
  private loggedin$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this.loggedin$.asObservable();

  // track the need of a token refresh (which is than handled by the rest service)
  private refreshIsDue$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public refreshIsDue = this.refreshIsDue$.asObservable();

  // track the current access token and make it public readable
  private token$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public token = this.token$.asObservable();

  constructor(private settings: Settings) {
    // Basic Auth is handled as always logged in.
    if (this.settings.basic.enabled === true)
      this.loggedin$.next(true);
    else
      this.loadToken();
  }

  /**
   * Removes any old session information to handle user logout
   */
  public clearToken(): void {
    this.sessiontoken = undefined;
    localStorage.removeItem(this.settings.oauth.storeKey!);
    this.loggedin$.next(false);
  }

  /**
   * Returns the current refresh token or an empty string if not available.
   * @returns The refresh token or empty string.
   */
  public getRefreshToken(): string {
    return this.sessiontoken?.refreshToken ?? '';
  }

  /**
   * Returns the current username or an empty string if not available.
   * @returns The username or empty string;
   */
  public getUsername(): string {
    return this.sessiontoken?.username ?? '';
  }

  /**
   * Loads the session information from browser cache.
   */
  private loadToken(): void {
    let store: Token | string | null = localStorage.getItem(this.settings.oauth.storeKey!);
    if (store != null) {
      store = <Token>(JSON.parse(<string>store));
      store.grantTime = new Date(store.grantTime);
      this.setToken(store);
    }
  }

  private timeout?: any;
  /**
   * If access token is due to refresh this method sets the refreshIsDue$ to true so the
   * Rest API is informed to refresh the token.
   */
  private refreshToken(): void {
    if (this.timeout)
      clearTimeout(this.timeout);
    let nextcall = this.loggedin$.value ? (this.sessiontoken?.expiryTime?.getTime() ?? Date.now() + 10) - Date.now() - 2500 : 10;
    nextcall = nextcall < 0 ? 1 : nextcall > 3600000 ? 3600000 : nextcall;
    this.timeout = setTimeout(() => {
      this.refreshIsDue$.next(true);
    }, nextcall);
  }

  /**
   * Assigns a new Token to the current session (will be called by Rest Service after successfull login or token refresh).
   * @param token A Token object.
   */
  public setToken(token: Token): void {
    this.refreshIsDue$.next(false);
    token.expiryTime = new Date(new Date(token.grantTime).setSeconds(token.grantTime.getSeconds(), token.expiresIn * 1000));
    this.sessiontoken = token;
    localStorage.setItem(this.settings.oauth.storeKey ?? 'authmod-session', JSON.stringify(token));
    this.token$.next(token.accessToken);
    this.validateToken();
  }

  /**
   * Checks the token and if valid call the refresh Methods.
   */
  private validateToken(): void {
    if (this.sessiontoken?.accessToken !== '' && this.sessiontoken?.refreshToken !== '') {
      this.loggedin$.next(true);
      this.refreshToken();
    }
  }

}

export type OAuthSession = {
  isLoggedIn: Observable<boolean>;
  clearToken(): void;
  setToken(token: Token): void;
}

export type Token = {
  accessToken: string;
  expiresIn: number;
  expiryTime?: Date;
  grantTime: Date;
  granted: boolean;
  refreshToken: string;
  username: string;
}
