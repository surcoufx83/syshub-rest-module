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

  private storageLocation: 'LocalStorage' | 'SessionStorage' = 'LocalStorage';

  // track the current access token and make it public readable
  private token$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public token = this.token$.asObservable();

  constructor(private settings: Settings) {
    // Basic Auth is handled as always logged in.
    if (this.settings.useBasicAuth === true)
      this.loggedin$.next(true);
    else
      this.loadToken();
  }

  /**
   * Removes any old session information to handle user logout
   */
  public clearToken(): void {
    if (this.settings.useBasicAuth === true)
      return;
    this.sessiontoken = undefined;
    localStorage.removeItem(this.settings.oauth?.storeKey ?? 'authmod-session');
    sessionStorage.removeItem(this.settings.oauth?.storeKey ?? 'authmod-session');
    this.storageLocation = 'LocalStorage';
    this.loggedin$.next(false);
    this.token$.next('');
    this.refreshIsDue$.next(false);
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
    let store: Token | string | null = localStorage.getItem(this.settings.oauth?.storeKey ?? 'authmod-session');
    if (store == null) {
      store = sessionStorage.getItem(this.settings.oauth?.storeKey ?? 'authmod-session');
      if (store != null)
        this.storageLocation = 'SessionStorage';
    }
    if (store != null) {
      store = <Token>(JSON.parse(<string>store));
      store.grantTime = new Date(store.grantTime);
      this.setToken(store, this.storageLocation == 'LocalStorage');
    }
  }

  private timeout?: any;
  /**
   * If access token is due to refresh this method sets the refreshIsDue$ to true so the
   * Rest API is informed to refresh the token.
   */
  private refreshToken(): void {
    clearTimeout(this.timeout);
    let nextcall = this.loggedin$.value ? (this.sessiontoken?.expiryTime?.getTime() ?? Date.now() + 10) - Date.now() - 2500 : 10;
    nextcall = nextcall < 0 ? 0 : nextcall > 3600000 ? 3600000 : nextcall;
    this.timeout = setTimeout(() => {
      if (this.loggedin$.value === true)
        this.refreshIsDue$.next(true);
    }, nextcall);
  }

  /**
   * Assigns a new Token to the current session (will be called by Rest Service after successfull login or token refresh).
   * @param token A Token object.
   * @param keepLoggedin A boolean which defines storage location and persistence of the session (true = localStorage = permanent, false = sessionStorag = until browser window closed)
   */
  public setToken(token: Token, keepLoggedin?: boolean): void {
    if (this.settings.useBasicAuth === true)
      return;
    if (keepLoggedin === undefined)
      keepLoggedin = this.storageLocation == 'LocalStorage';
    this.storageLocation = keepLoggedin ? 'LocalStorage' : 'SessionStorage';
    this.refreshIsDue$.next(false);
    token.expiryTime = new Date(new Date(token.grantTime).setSeconds(token.grantTime.getSeconds(), token.expiresIn * 1000));
    this.sessiontoken = token;
    if (keepLoggedin)
      localStorage.setItem(this.settings.oauth?.storeKey ?? 'authmod-session', JSON.stringify(token));
    else
      sessionStorage.setItem(this.settings.oauth?.storeKey ?? 'authmod-session', JSON.stringify(token));
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
  setToken(token: Token, keepLoggedin: boolean): void;
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
