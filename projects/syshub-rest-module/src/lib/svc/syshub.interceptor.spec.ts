import { SyshubInterceptor } from './syshub.interceptor';
import { Settings } from '../settings';
import { RestService } from './rest.service';
import { HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { fakeAsync, flush, tick } from '@angular/core/testing';

describe('SyshubInterceptor', () => {

  let mockSettings = {
    host: 'mock-host/',
    useApiKeyAuth: false,
    useBasicAuth: true,
    useOAuth: false,
    basic: {
      username: 'mock-username',
      password: 'mock-password',
      provider: 'mock-provider',
    },
  };

  let mockOauthSettings = {
    host: 'mock-host/',
    useApiKeyAuth: false,
    useBasicAuth: false,
    useOAuth: true,
    oauth: {
      clientId: 'mock-clientId',
      clientSecret: 'mock-clientSecret',
      scope: 'private+public',
    },
    options: {
      autoLogoutOn401: true,
    },
  };

  let mockApikeySettings = {
    host: 'mock-host/',
    useApiKeyAuth: true,
    useBasicAuth: false,
    useOAuth: false,
    apikey: 'mock-apikey',
    apiprovider: 'mock-apiprovider',
  };

  let mockRestServiceLoggedIn = {
    getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue('mock-access_token'),
    getIsLoggedIn: jasmine.createSpy('getIsLoggedIn').and.returnValue(true),
  };

  let mockRestServiceLoggedOut = {
    getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue('mock-access_token'),
    getIsLoggedIn: jasmine.createSpy('getIsLoggedIn').and.returnValue(false),
  };

  beforeEach(() => {
    mockRestServiceLoggedIn = {
      getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue('mock-access_token'),
      getIsLoggedIn: jasmine.createSpy('getIsLoggedIn').and.returnValue(true),
    };
    mockRestServiceLoggedOut = {
      getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue('mock-access_token'),
      getIsLoggedIn: jasmine.createSpy('getIsLoggedIn').and.returnValue(false),
    };
  });

  it('should be created', () => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockSettings, <RestService><any>mockRestServiceLoggedIn);
    expect(interceptorInstance).toBeTruthy();
  });

  it('should intercept auth requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockSettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('GET', '/mock-server/webauth/oauth/token');
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(response.url).withContext('Check url').toEqual('/mock-server/webauth/oauth/token');
      expect(response.headers.getAll('Content-Type')).withContext('Check applied Content-Type header').toEqual(['application/x-www-form-urlencoded']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept formdata/OAuth/loggedIn requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockOauthSettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', new FormData());
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedIn.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(1);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toEqual(['Bearer mock-access_token']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept formdata/OAuth/loggedOut requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockOauthSettings, <RestService><any>mockRestServiceLoggedOut);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', new FormData());
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedOut.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toBeNull();
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept formdata/Basic requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockSettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', new FormData());
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedOut.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toEqual([`Basic ${btoa(`${mockSettings.basic.username}:${mockSettings.basic.password}`)}`]);
      expect(response.headers.getAll('AuthProvider')).withContext('Check applied AuthProvider header').toEqual([mockSettings.basic.provider]);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept any/OAuth/loggedIn requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockOauthSettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-postdata', {});
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedIn.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(1);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-postdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toEqual(['Bearer mock-access_token']);
      expect(response.headers.getAll('Content-Type')).withContext('Check applied Content-Type header').toEqual(['application/json']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept any/OAuth/loggedOut requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockOauthSettings, <RestService><any>mockRestServiceLoggedOut);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-postdata', {});
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedIn.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-postdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toBeNull();
      expect(response.headers.getAll('Content-Type')).withContext('Check applied Content-Type header').toEqual(['application/json']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept any/Basic requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockSettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', {});
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedOut.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toEqual([`Basic ${btoa(`${mockSettings.basic.username}:${mockSettings.basic.password}`)}`]);
      expect(response.headers.getAll('AuthProvider')).withContext('Check applied AuthProvider header').toEqual([mockSettings.basic.provider]);
      expect(response.headers.getAll('Content-Type')).withContext('Check applied Content-Type header').toEqual(['application/json']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept API key requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockApikeySettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', {});
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedOut.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toBeNull();
      expect(response.headers.getAll('X-API-KEY')).withContext('Check applied X-API-KEY header').toEqual([mockApikeySettings.apikey]);
      expect(response.headers.getAll('AuthProvider')).withContext('Check applied AuthProvider header').toEqual([mockApikeySettings.apiprovider]);
      expect(response.headers.getAll('Content-Type')).withContext('Check applied Content-Type header').toEqual(['application/json']);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

  it('should intercept API key form data requests', fakeAsync(() => {
    const interceptorInstance: SyshubInterceptor = new SyshubInterceptor(<Settings><any>mockApikeySettings, <RestService><any>mockRestServiceLoggedIn);
    const mockRequest = new HttpRequest('POST', '/mock-server/mock-formdata', new FormData());
    const mockHandler = {
      handle: (req: HttpRequest<any>): Observable<HttpEvent<any>> => of(new HttpResponse(req))
    };

    let sub = interceptorInstance.intercept(mockRequest, mockHandler).subscribe((res) => {
      const response = <HttpResponse<any>>res;
      expect(mockRestServiceLoggedOut.getAccessToken).withContext('Check interceptor has requested access token').toHaveBeenCalledTimes(0);
      expect(response.url).withContext('Check url').toEqual('/mock-server/mock-formdata');
      expect(response.headers.getAll('Authorization')).withContext('Check applied Authorization header').toBeNull();
      expect(response.headers.getAll('X-API-KEY')).withContext('Check applied X-API-KEY header').toEqual([mockApikeySettings.apikey]);
      expect(response.headers.getAll('AuthProvider')).withContext('Check applied AuthProvider header').toEqual([mockApikeySettings.apiprovider]);
    });
    tick();
    sub?.unsubscribe();
    flush();
  }));

});
