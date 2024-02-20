import { async, fakeAsync, flush, waitForAsync } from '@angular/core/testing';
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

describe('Session (OAuth)', () => {

  let mockSettingsOAuth = {
    basic: {
      enabled: false,
    },
    oauth: {
      enabled: true,
      storeKey: 'mock-storeKey'
    }
  };

  let sessionInstance: Session;

  beforeEach(waitForAsync(() => {
    sessionInstance = new Session(<any>mockSettingsOAuth);
  }));

  it('should create an instance', () => {
    expect(sessionInstance).toBeTruthy();
  });

  it('should have logged in value false', waitForAsync(() => {
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn false before setting token').toBeFalse());
  }));

  /* it('should stay loggedin', waitForAsync(() => {
    sessionInstance.clearToken();
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn always true for basic auth').toBeTrue());
  })); */

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('empty as no token set yet').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty as no token set yet').toEqual('');
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

  beforeEach(waitForAsync(() => {
    localStorage.setItem('authmod-session', JSON.stringify(token))
    sessionInstance = new Session(<any>mockSettingsOAuth);
    subs = [];
  }));

  afterEach(() => {
    subs.forEach((sub) => sub.unsubscribe());
  })

  it('should create an instance', () => {
    expect(sessionInstance).toBeTruthy();
  });

  it('should have logged in value true', waitForAsync(() => {
    subs.push(sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn true').toBeTrue()));
    subs.push(sessionInstance.refreshIsDue.subscribe(value => expect(value).withContext('refreshIsDue true').toBeTrue()));
    subs.push(sessionInstance.token.subscribe(value => expect(value).withContext('accessToken correct').toEqual('mock-accessToken')));
  }));

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('token refreshToken').toEqual('mock-refreshToken');
    expect(sessionInstance.getUsername()).withContext('token username').toEqual('mock-username');
  });

  it('should update isLoggedIn and refreshIsDue', fakeAsync(() => {
    token.accessToken = 'mock-foo';
    token.expiresIn = 3600;
    sessionInstance.setToken(token);
    subs.push(sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn true').toBeTrue()));
    subs.push(sessionInstance.token.subscribe(value => expect(value).withContext('accessToken correct').toEqual('mock-foo')));
    let testvalue: boolean | undefined = undefined;
    subs.push(sessionInstance.refreshIsDue.subscribe(value => testvalue = value));
    expect(testvalue).withContext('refreshIsDue false').toBeFalse();
    flush();
  }));

});
