import { RestService } from './rest.service';
import { Settings } from '../settings';
import { HttpClient } from '@angular/common/http';

describe('RestService', () => {

  let mockSettings = {
    useBasicAuth: true,
    useOAuth: false,
    basic: {
      username: 'mock-username',
      password: 'mock-password',
      provider: 'mock-provider',
    },
  };

  let mockHttpClient = {

  };

  it('should be created', () => {
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, <HttpClient><any>mockHttpClient);
    expect(serviceInstance).toBeTruthy();
  });
});
