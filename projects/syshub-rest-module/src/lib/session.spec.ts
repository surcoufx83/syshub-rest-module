import { async, waitForAsync } from '@angular/core/testing';
import { Session } from './session';

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

  it('should stay loggedin', waitForAsync(() => {
    sessionInstance.clearToken();
    sessionInstance.isLoggedIn.subscribe(value => expect(value).withContext('isLoggedIn always true for basic auth').toBeTrue());
  }));

  it('should return correct session infos', () => {
    expect(sessionInstance.getRefreshToken()).withContext('empty for basic auth').toEqual('');
    expect(sessionInstance.getUsername()).withContext('empty for basic auth').toEqual('');
  });

});
