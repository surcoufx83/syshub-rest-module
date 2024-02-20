import { async, fakeAsync, flush, tick, waitForAsync } from '@angular/core/testing';
import { Session, Token } from './session';
import { Subscription, delay } from 'rxjs';

describe('Session (Basic auth)', () => {

  let mockSettingsBasic = {
    basic: {
      enabled: true,
    }
  };

  let sessionInstance: Session;

  beforeEach(waitForAsync(() => {
    sessionInstance = new Session(<any>mockSettingsBasic);
  }));

  it('should create an instance', () => {
    expect(sessionInstance).toBeTruthy();
  });

  it('should have logged in value true', waitForAsync(() => {
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn always true for basic auth').toBeTrue());
  }));

  it('should stay loggedin after clearToken()', waitForAsync(() => {
    sessionInstance.clearToken();
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn always true for basic auth').toBeTrue()).unsubscribe();
  }));

  it('should stay loggedin after setToken()', waitForAsync(() => {
    sessionInstance.setToken(<any>{});
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn always true for basic auth').toBeTrue()).unsubscribe();
  }));

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('empty for basic auth').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty for basic auth').toEqual('');
  });

});

describe('Session (OAuth) with existing session', () => {

  let mockSettingsOAuth = {
    basic: {
      enabled: false,
    },
    oauth: {
      enabled: true,
    }
  };

  let token: Token = {
    accessToken: 'mock-accessToken',
    expiresIn: 0,
    expiryTime: new Date(),
    grantTime: new Date(),
    granted: true,
    refreshToken: 'mock-refreshToken',
    username: 'mock-username'
  }

  let sessionInstance: Session;
  let subs: Subscription[] = [];

  let isLoggedInResult: boolean | undefined;
  let refreshIsDueResult: boolean | undefined;
  let tokenResult: string | undefined;

  beforeEach(fakeAsync(() => {
    subs = [];
    localStorage.setItem('authmod-session', JSON.stringify(token))
    sessionInstance = new Session(<any>mockSettingsOAuth);
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => { console.log('isLoggedIn', state); isLoggedInResult = state }));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => { console.log('refreshIsDue', state); refreshIsDueResult = state }));
    subs.push(sessionInstance.token.subscribe((state) => { console.log('token', state); tokenResult = state }));
    tick(10);
    flush();
  }));

  afterEach(() => {
    subs.forEach((sub) => sub.unsubscribe());
  })

  it('should create an instance', () => {
    expect(sessionInstance).toBeTruthy();
  });

  it('should have logged in value true', () => {
    expect(isLoggedInResult).withContext('isLoggedIn true').toBeTrue();
    expect(refreshIsDueResult).withContext('refreshIsDue true').toBeTrue();
    expect(tokenResult).withContext('accessToken correct').toEqual('mock-accessToken');
  });

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('token refreshToken').toEqual('mock-refreshToken');
    expect(sessionInstance.getUsername()).withContext('token username').toEqual('mock-username');
  });

  it('should update isLoggedIn and refreshIsDue', fakeAsync(() => {
    token.accessToken = 'mock-foo';
    token.expiresIn = 3600;
    sessionInstance.setToken(token);
    tick(100);
    expect(isLoggedInResult).withContext('isLoggedIn true').toBeTrue();
    expect(refreshIsDueResult).withContext('refreshIsDue false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('mock-foo');
    flush();
  }));

  it('should clear the token', fakeAsync(() => {
    sessionInstance.clearToken();
    tick(100);
    expect(localStorage.getItem('authmod-session')).withContext('Cleared local storage').toBeNull();
    expect(isLoggedInResult).withContext('isLoggedIn false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('');
    expect(sessionInstance.getRefreshToken()).withContext('empty after clearing token').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty after clearing token').toEqual('');
    flush();
  }));

});
