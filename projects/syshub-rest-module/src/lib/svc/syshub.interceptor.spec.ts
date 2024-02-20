import { SyshubInterceptor } from './syshub.interceptor';
import { Settings } from '../settings';
import { RestService } from './rest.service';

describe('SyshubInterceptor', () => {

  let mockSettings = {
    useBasicAuth: true,
    useOAuth: false,
    basic: {
      username: 'mock-username',
      password: 'mock-password',
      provider: 'mock-provider',
    },
  };

  let mockRestService = {
    getAccessToken: jasmine.createSpy('getAccessToken'),
    getIsLoggedIn: jasmine.createSpy('getIsLoggedIn'),
  };

  it('should be created', () => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockSettings, <RestService><any>mockRestService);
    expect(interceptorInstance).toBeTruthy();
  });

});
