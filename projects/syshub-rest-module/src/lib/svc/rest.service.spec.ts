import { RestService } from './rest.service';
import { Settings } from '../settings';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpStatusCode } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { StatusNotExpectedError, UnauthorizedError, NetworkError, MissingScopeError } from '../error';
import { Token } from '../session';

describe('RestService', () => {

  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  let mockSettings = {
    host: 'mock-host/',
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

  let mockOauthSettingsPublicOnly = {
    host: 'mock-host/',
    useBasicAuth: false,
    useOAuth: true,
    oauth: {
      clientId: 'mock-clientId',
      clientSecret: 'mock-clientSecret',
      scope: 'public',
    },
    options: {
      autoLogoutOn401: true,
    },
  };

  let mockOauthSettingsPrivateOnly = {
    host: 'mock-host/',
    useBasicAuth: false,
    useOAuth: true,
    oauth: {
      clientId: 'mock-clientId',
      clientSecret: 'mock-clientSecret',
      scope: 'private',
    },
    options: {
      autoLogoutOn401: true,
    },
  };

  const mockLoggedInLocalStorage = {
    accessToken: "mock-accessToken",
    expiresIn: 2591999,
    grantTime: new Date(),
    granted: true,
    refreshToken: "mock-refreshToken",
    username: "mock-accessToken",
    expiryTime: new Date(new Date().setSeconds((new Date()).getSeconds(), 2591999 * 1000))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.removeItem('authmod-session');
  });

  it('should be created', () => {
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    expect(serviceInstance).toBeTruthy();
  });

  it('should try to refresh the session', fakeAsync(() => {
    const token = {
      accessToken: 'mock-accessToken',
      expiresIn: 0,
      expiryTime: new Date(),
      grantTime: new Date(),
      granted: true,
      refreshToken: 'mock-refreshToken',
      username: 'mock-username'
    };
    localStorage.setItem('authmod-session', JSON.stringify(token));
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    tick(10);
    let request = httpTestingController.expectOne('mock-host/webauth/oauth/token', 'Token url called');
    expect(request.request.method).withContext('Request method').toEqual('POST');
    expect(request.request.body).withContext('Request body').toEqual('grant_type=refresh_token&refresh_token=mock-refreshToken&scope=private+public&client_id=mock-clientId&client_secret=mock-clientSecret');
    request.flush({ access_token: 'mock-new-accessToken', expiresIn: 3600, refresh_token: 'mock-new-refreshToken' }, { status: 200, statusText: 'OK' });
    tick(10);
    let testvalue = JSON.parse(localStorage.getItem('authmod-session') ?? "{}");
    expect(testvalue['accessToken']).toEqual('mock-new-accessToken');
    expect(testvalue['refreshToken']).toEqual('mock-new-refreshToken');
    flush();
  }));

  it('should throw error when failing to refresh the session', fakeAsync(() => {
    const token = {
      accessToken: 'mock-accessToken',
      expiresIn: 0,
      expiryTime: new Date(),
      grantTime: new Date(),
      granted: true,
      refreshToken: 'mock-refreshToken',
      username: 'mock-username'
    };
    localStorage.setItem('authmod-session', JSON.stringify(token));
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    tick(10);
    let request = httpTestingController.expectOne('mock-host/webauth/oauth/token', 'Token url called');
    expect(request.request.method).withContext('Request method').toEqual('POST');
    expect(request.request.body).withContext('Request body').toEqual('grant_type=refresh_token&refresh_token=mock-refreshToken&scope=private+public&client_id=mock-clientId&client_secret=mock-clientSecret');
    request.error(new ProgressEvent('error'), { status: 403, statusText: 'Forbidden' });
    tick(10);
    expect(localStorage.getItem('authmod-session')).withContext('Session data cleared after error').toBeNull();
    flush();
  }));

  it('should send the correct request for GET endpoints', () => {
    const testEndpoint = 'mock-endpoint/rel-0/rel-1?p0=&p1=foo-param';
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    const subject = serviceInstance.get(testEndpoint);
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    let request = httpTestingController.expectOne(`mock-host/webapi/v3/${testEndpoint}`, 'Url called');
    expect(request.request.method).withContext('Request method').toEqual('GET');
    expect(request.request.body).withContext('Request body').toBeNull();
  });

  it('should return error if not loggedin (delete)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.delete(testEndpoint);
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (deletec)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.deletec(testEndpoint);
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (get)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.get(testEndpoint);
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (getc)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.getc(testEndpoint);
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (head)', fakeAsync(() => {
    const testEndpoint = 'mock-endpoint';
    const mocksettings = <any>{ ...mockOauthSettings };
    mocksettings.throwErrors = true;
    const serviceInstance: RestService = new RestService(<Settings><any>mocksettings, httpClient);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(() => serviceInstance.head(testEndpoint)).withContext('Returned error state').toThrowError(/^The user is not loggedin*/);
    flush();
  }));

  it('should return error if not loggedin (headc)', fakeAsync(() => {
    const testEndpoint = 'mock-endpoint';
    const mocksettings = <any>{ ...mockOauthSettings };
    mocksettings.throwErrors = true;
    const serviceInstance: RestService = new RestService(<Settings><any>mocksettings, httpClient);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(() => serviceInstance.headc(testEndpoint)).withContext('Returned error state').toThrowError(/^The user is not loggedin*/);
    flush();
  }));

  it('should return error if not loggedin (options)', fakeAsync(() => {
    const testEndpoint = 'mock-endpoint';
    const mocksettings = <any>{ ...mockOauthSettings };
    mocksettings.throwErrors = true;
    const serviceInstance: RestService = new RestService(<Settings><any>mocksettings, httpClient);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(() => serviceInstance.options(testEndpoint)).withContext('Returned error state').toThrowError(/^The user is not loggedin*/);
    flush();
  }));

  it('should return error if not loggedin (optionsc)', fakeAsync(() => {
    const testEndpoint = 'mock-endpoint';
    const mocksettings = <any>{ ...mockOauthSettings };
    mocksettings.throwErrors = true;
    const serviceInstance: RestService = new RestService(<Settings><any>mocksettings, httpClient);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(() => serviceInstance.optionsc(testEndpoint)).withContext('Returned error state').toThrowError(/^The user is not loggedin*/);
    flush();
  }));

  it('should return error if not loggedin (patch)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.patch(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (patchc)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.patchc(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (post)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.post(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (postc)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.postc(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (put)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.put(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should return error if not loggedin (putc)', fakeAsync(() => {
    let payload: any;
    const testEndpoint = 'mock-endpoint';
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    const subject = serviceInstance.putc(testEndpoint, {});
    subject.subscribe((subject_payload) => payload = subject_payload);
    expect(serviceInstance.getIsLoggedIn()).withContext('Should not be loggedin').toBeFalse();
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    tick(10);
    expect(payload ? payload['status'] : null).withContext('Returned error state').toEqual(401);
    flush();
  }));

  it('should send the correct request backupSyshub() - good case', () => {
    let payload: any;
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let subject = serviceInstance.backupSyshub('mock-backupName', 'backupDescription', 'mock-/folderpath', []);
    expect(subject).withContext('Return value is correct').toBeInstanceOf(Subject<Response>);
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent('mock-/folderpath')}`, 'Url called');
    expect(request.request.method).withContext('Request method').toEqual('POST');
    expect(request.request.body).withContext('Request body').toEqual({ BACKUPDESCRIPTION: 'backupDescription', BACKUPNAME: 'mock-backupName', BACKUPTYPES: [] });
    let response = { name: 'mock-name', type: 'result', value: true };
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(payload).withContext('Returned content').toEqual(response);
  });

  it('should send the correct request backupSyshub() - MissingScopeError case', fakeAsync(() => {
    let payload: any;
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    let subject = serviceInstance.backupSyshub('mock2-backupName', 'backupDescription', 'mock2-folderpath', []);
    subject.subscribe((subject_payload) => { console.log(payload); payload = subject_payload });
    tick(10);
    expect(payload).withContext('Returned content').toBeInstanceOf(MissingScopeError);
  }));

  it('should send the correct request backupSyshub() - StatusNotExpected case', () => {
    let payload: any;
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let subject = serviceInstance.backupSyshub('mock2-backupName', 'backupDescription', 'mock2-folderpath', []);
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent('mock2-folderpath')}`, 'Url called');
    request.flush(null, { status: HttpStatusCode.NotFound, statusText: 'Not Found' });
    expect(payload).withContext('Returned content').toBeInstanceOf(StatusNotExpectedError);
  });

  it('should send the correct request backupSyshub() - Unauthorized case', () => {
    let payload: any;
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    let subject = serviceInstance.backupSyshub('mock2-backupName', 'backupDescription', 'mock2-folderpath', []);
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent('mock2-folderpath')}`, 'Url called');
    request.flush(null, { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' });
    expect(payload).withContext('Returned content').toBeInstanceOf(UnauthorizedError);
  });

  it('should send the correct request backupSyshub() - NetworkError case', () => {
    let payload: any;
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let subject = serviceInstance.backupSyshub('mock2-backupName', 'backupDescription', 'mock2-folderpath', []);
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent('mock2-folderpath')}`, 'Url called');
    request.flush(null, { status: 0, statusText: '' });
    expect(payload).withContext('Returned content').toBeInstanceOf(NetworkError);
  });

});
