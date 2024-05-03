import { fakeAsync, flush, tick, waitForAsync } from '@angular/core/testing';
import { Session, Token } from './session';
import { Subscription } from 'rxjs';

describe('Session (Basic auth with requiresLogin = false)', () => {

  let mockSettingsBasic = {
    basic: {
      enabled: true,
      requiresLogin: false,
    },
    useBasicAuth: true,
    useOAuth: false,
  };

  let sessionInstance: Session;
  let subs: Subscription[] = [];

  let isLoggedInResult: boolean | undefined;
  let refreshIsDueResult: boolean | undefined;
  let tokenResult: string | undefined;

  beforeEach(fakeAsync(() => {
    subs = [];
    sessionInstance = new Session(<any>mockSettingsBasic);
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => isLoggedInResult = state));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => refreshIsDueResult = state));
    subs.push(sessionInstance.token.subscribe((state) => tokenResult = state));
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
    expect(isLoggedInResult).withContext('isLoggedIn always true for basic auth').toBeTrue();
  });

  it('should stay loggedin after clearToken()', fakeAsync(() => {
    sessionInstance.clearToken();
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn always true for basic auth').toBeTrue();
  }));

  it('should stay loggedin after setToken()', fakeAsync(() => {
    sessionInstance.setOauthToken(<any>{});
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn always true for basic auth').toBeTrue();
  }));

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('empty for basic auth').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty for basic auth').toEqual('');
  });

});

describe('Session (Basic auth with requiresLogin = true)', () => {

  let mockSettingsBasic = {
    basic: {
      enabled: true,
      requiresLogin: true,
    },
    useBasicAuth: true,
    useOAuth: false,
  };

  let sessionInstance: Session;
  let subs: Subscription[] = [];

  let isLoggedInResult: boolean | undefined;
  let refreshIsDueResult: boolean | undefined;
  let tokenResult: string | undefined;

  beforeEach(fakeAsync(() => {
    subs = [];
    sessionInstance = new Session(<any>mockSettingsBasic);
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => isLoggedInResult = state));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => refreshIsDueResult = state));
    subs.push(sessionInstance.token.subscribe((state) => tokenResult = state));
    tick(10);
    flush();
  }));

  afterEach(() => {
    subs.forEach((sub) => sub.unsubscribe());
    localStorage.removeItem('authmod-session');
    sessionStorage.removeItem('authmod-session');
  })

  it('should create an instance', () => {
    expect(sessionInstance).toBeTruthy();
  });

  it('should have logged in value false', () => {
    expect(isLoggedInResult).withContext('isLoggedIn false').toBeFalse();
  });

  it('should handle login correct (persist session)', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn false before logging in').toBeFalse();
    sessionInstance.setBasicToken({ username: 'foo', password: 'bar' }, true);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true after logging in').toBeTrue();
    expect(JSON.parse(localStorage.getItem('authmod-session') ?? '{}')).withContext('localstorage is set').toEqual({ username: 'foo', password: 'bar' });
    expect(JSON.parse(sessionStorage.getItem('authmod-session') ?? '{}')).withContext('sessionstorage still not set').toEqual({});
  }));

  it('should handle login correct (temp session)', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn false before logging in').toBeFalse();
    sessionInstance.setBasicToken({ username: 'foo', password: 'bar' }, false);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true after logging in').toBeTrue();
    expect(JSON.parse(localStorage.getItem('authmod-session') ?? '{}')).withContext('localstorage is set').toEqual({});
    expect(JSON.parse(sessionStorage.getItem('authmod-session') ?? '{}')).withContext('sessionstorage still not set').toEqual({ username: 'foo', password: 'bar' });
  }));

  it('should handle login correct (persist session (default))', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn false before logging in').toBeFalse();
    sessionInstance.setBasicToken({ username: 'foo', password: 'bar' });
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true after logging in').toBeTrue();
    expect(JSON.parse(localStorage.getItem('authmod-session') ?? '{}')).withContext('localstorage is set').toEqual({ username: 'foo', password: 'bar' });
    expect(JSON.parse(sessionStorage.getItem('authmod-session') ?? '{}')).withContext('sessionstorage still not set').toEqual({});
  }));

  it('should remove login flag after logout', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn false before logging in').toBeFalse();
    sessionInstance.setBasicToken({ username: 'foo', password: 'bar' }, true);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true after logging in').toBeTrue();
    expect(JSON.parse(localStorage.getItem('authmod-session') ?? '{}')).withContext('localstorage is set').toEqual({ username: 'foo', password: 'bar' });
    expect(JSON.parse(sessionStorage.getItem('authmod-session') ?? '{}')).withContext('sessionstorage still not set').toEqual({});
    sessionInstance.clearToken();
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn false after logout').toBeFalse();
    expect(localStorage.getItem('authmod-session')).withContext('localstorage is cleared').toBeNull()
    expect(sessionStorage.getItem('authmod-session')).withContext('sessionstorage is cleared').toBeNull();
  }));

  it('should throw an error if username or password is missing', fakeAsync(() => {
    expect(() => sessionInstance.setBasicToken(<any>{})).withContext('username and password missing').toThrowError('Username and password must not be empty.');
    expect(() => sessionInstance.setBasicToken(<any>{ username: 'foo' })).withContext('password missing').toThrowError('Username and password must not be empty.');
    expect(() => sessionInstance.setBasicToken(<any>{ password: 'foo' })).withContext('username missing').toThrowError('Username and password must not be empty.');
    expect(() => sessionInstance.setBasicToken(<any>{ username: 'foo', password: 'foo' })).withContext('username missing').not.toThrowError();
  }));

  it('should ignore setOauthToken', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn false befor test').toBeFalse();
    sessionInstance.setOauthToken(<any>{}, true);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn still false').toBeFalse();
    expect(localStorage.getItem('authmod-session')).withContext('localstorage is empty').toBeNull()
    expect(sessionStorage.getItem('authmod-session')).withContext('sessionstorage is empty').toBeNull();
  }));

});

describe('Session (Basic auth with existing token)', () => {

  let mockSettingsBasic = {
    basic: {
      enabled: true,
      requiresLogin: true,
    },
    useBasicAuth: true,
    useOAuth: false,
  };

  let sessionInstance: Session;
  let subs: Subscription[] = [];

  let isLoggedInResult: boolean | undefined;
  let refreshIsDueResult: boolean | undefined;
  let tokenResult: string | undefined;

  beforeEach(fakeAsync(() => {
    subs = [];
    localStorage.setItem('authmod-session', JSON.stringify({ username: 'foo', password: 'bar' }));
    sessionInstance = new Session(<any>mockSettingsBasic);
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => isLoggedInResult = state));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => refreshIsDueResult = state));
    subs.push(sessionInstance.token.subscribe((state) => tokenResult = state));
    tick(10);
    flush();
  }));

  afterEach(() => {
    subs.forEach((sub) => sub.unsubscribe());
    localStorage.removeItem('authmod-session');
    sessionStorage.removeItem('authmod-session');
  })

  it('should load existing session', fakeAsync(() => {
    expect(isLoggedInResult).withContext('isLoggedIn from existing session').toBeTrue();
  }));

});

describe('Session (OAuth) with existing persistent session', () => {

  let mockSettingsOAuth = {
    oauth: {
      enabled: true,
    },
    useBasicAuth: false,
    useOAuth: true,
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
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => isLoggedInResult = state));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => refreshIsDueResult = state));
    subs.push(sessionInstance.token.subscribe((state) => tokenResult = state));
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
    sessionInstance.setOauthToken(token);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true').toBeTrue();
    expect(refreshIsDueResult).withContext('refreshIsDue false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('mock-foo');
    flush();
  }));

  it('should clear the token', fakeAsync(() => {
    sessionInstance.clearToken();
    tick();
    expect(localStorage.getItem('authmod-session')).withContext('Cleared local storage').toBeNull();
    expect(isLoggedInResult).withContext('isLoggedIn false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('');
    expect(sessionInstance.getRefreshToken()).withContext('empty after clearing token').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty after clearing token').toEqual('');
    flush();
  }));

  it('should ignore setBasicToken', fakeAsync(() => {
    sessionInstance.clearToken();
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn false before test').toBeFalse();
    sessionInstance.setBasicToken(<any>{}, true);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn still false').toBeFalse();
    expect(localStorage.getItem('authmod-session')).withContext('localstorage is empty').toBeNull()
    expect(sessionStorage.getItem('authmod-session')).withContext('sessionstorage is empty').toBeNull();
  }));

});

describe('Session (OAuth) with existing temporary session', () => {

  let mockSettingsOAuth = {
    oauth: {
      enabled: true,
    },
    useBasicAuth: false,
    useOAuth: true,
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
    sessionStorage.setItem('authmod-session', JSON.stringify(token))
    sessionInstance = new Session(<any>mockSettingsOAuth);
    subs.push(sessionInstance.isLoggedIn.subscribe((state) => isLoggedInResult = state));
    subs.push(sessionInstance.refreshIsDue.subscribe((state) => refreshIsDueResult = state));
    subs.push(sessionInstance.token.subscribe((state) => tokenResult = state));
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
    sessionInstance.setOauthToken(token);
    tick();
    expect(isLoggedInResult).withContext('isLoggedIn true').toBeTrue();
    expect(refreshIsDueResult).withContext('refreshIsDue false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('mock-foo');
    flush();
  }));

  it('should clear the token', fakeAsync(() => {
    sessionInstance.clearToken();
    tick();
    expect(sessionStorage.getItem('authmod-session')).withContext('Cleared local storage').toBeNull();
    expect(isLoggedInResult).withContext('isLoggedIn false').toBeFalse();
    expect(tokenResult).withContext('accessToken correct').toEqual('');
    expect(sessionInstance.getRefreshToken()).withContext('empty after clearing token').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty after clearing token').toEqual('');
    flush();
  }));

});
