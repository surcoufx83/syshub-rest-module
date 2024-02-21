import { RestService } from './rest.service';
import { Settings } from '../settings';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpStatusCode } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { StatusNotExpectedError, UnauthorizedError, NetworkError, MissingScopeError } from '../error';
import { Token } from '../session';
import { SyshubCategory, SyshubJob, SyshubSyslogEntryToCreate, SyshubUserlogEntryToCreate } from '../types';

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

  function testMissingScopeError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subject.subscribe((subject_payload) => payload = subject_payload);
    tick(10);
    expect(payload).withContext('testMissingScopeError: Match returned content').toBeInstanceOf(MissingScopeError);
  }

  function testNetworkError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: 0, statusText: '' });
    expect(payload).withContext('testNetworkError: Match returned content').toBeInstanceOf(NetworkError);
  }

  function testStatusNotExpectedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.NotFound, statusText: 'Not Found' });
    expect(payload).withContext('testStatusNotExpectedError: Match returned content').toBeInstanceOf(StatusNotExpectedError);
  }

  function testUnauthorizedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subject.subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' });
    expect(payload).withContext('testUnauthorizedError: Match returned content').toBeInstanceOf(UnauthorizedError);
  }

  function testValidRequest(subject: any, expectUrl: string, expectRequestMethod: string, expectedRequestBody: any, sendResponse: any, sendHeader: { [key: string]: string } | undefined, expectedResponse: any, status: HttpStatusCode, statusText: string): void {
    let payload: any;
    expect(subject).withContext('Valid request: Return type should be instanceOf Subject<Response>').toBeInstanceOf(Subject<Response>);
    (<Subject<Response>>subject).subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(expectUrl, 'Valid request: Expected url called');
    expect(request.request.method).withContext('Valid request: Match request method').toEqual(expectRequestMethod);
    expect(request.request.body).withContext('Valid request: Match request body').toEqual(expectedRequestBody);
    request.flush(sendResponse, { status: status, statusText: statusText, headers: sendHeader });
    expect(payload).withContext('Valid request: Match returned content').toEqual(expectedResponse);
  }

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

  it('should return correct accessToken', () => {
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    expect(serviceInstance.getAccessToken()).withContext('Refers to access token from session').toEqual(mockLoggedInLocalStorage.accessToken);
  });

  it('should process method backupSyshub() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparams: string[] = ['mock-backupName', 'backupDescription', 'mock-/folderpath'];
    let testurl = `mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent(testparams[2])}`;
    testValidRequest(
      serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl,
      'POST',
      { BACKUPDESCRIPTION: testparams[1], BACKUPNAME: testparams[0], BACKUPTYPES: [] },
      { name: 'mock-name', type: 'result', value: true },
      undefined,
      { name: 'mock-name', type: 'result', value: true },
      HttpStatusCode.Created, 'Created'
    );
    testNetworkError(
      serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl
    );
    flush();
  }));

  it('should process method createCategory() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam: SyshubCategory = {
      description: 'mock-description',
      modifiedby: null,
      modifiedtime: null,
      name: 'mock-name',
      uuid: 'mock-uuid'
    };
    let testurl = `mock-host/webapi/v3/category/list`;
    testValidRequest(
      serviceInstance.createCategory(testparam),
      testurl,
      'PUT',
      { children: [testparam] },
      { children: [testparam] },
      undefined,
      [testparam],
      HttpStatusCode.Created, 'Created'
    );
    testNetworkError(
      serviceInstance.createCategory(testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.createCategory(testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.createCategory(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.createCategory(testparam),
      testurl
    );
    flush();
  }));

  it('should process method createJob() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = { id: 'mock-id', };
    let testurl = `mock-host/webapi/v3/jobs`;
    testValidRequest(
      serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
    );
    testNetworkError(
      serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl
    );
    flush();
  }));

  it('should process method createSyslogEntry() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = { id: 'mock-id', };
    let testurl = `mock-host/webapi/v3/syslogs`;
    testValidRequest(
      serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
    );
    testNetworkError(
      serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl
    );
    flush();
  }));

  it('should process method createUserlogEntry() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = { id: 'mock-id', };
    let testurl = `mock-host/webapi/v3/userlogs`;
    testValidRequest(
      serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
    );
    testNetworkError(
      serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl
    );
    flush();
  }));

  it('should process method deletec() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'category';
    let testurl = 'mock-host/webapi/custom/category';
    testValidRequest(
      serviceInstance.deletec(testparam),
      testurl,
      'DELETE',
      null,
      { mock: 'foo' },
      undefined,
      { content: Object({ mock: 'foo' }), etag: undefined, header: Object({}), status: 200 },
      HttpStatusCode.Ok, 'OK'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testValidRequest(
      serviceInstance.deletec(testparam),
      testurl,
      'DELETE',
      null,
      null,
      undefined,
      { content: null, status: 401 },
      HttpStatusCode.Unauthorized, 'Unauthorized'
    );
    flush();
  }));

  it('should process method deleteCategory() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/category/${encodeURIComponent(testparam)}`;
    testValidRequest(
      serviceInstance.deleteCategory(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
    );
    testNetworkError(
      serviceInstance.deleteCategory(testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.deleteCategory(testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.deleteCategory(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.deleteCategory(testparam),
      testurl
    );
    flush();
  }));

  it('should process method deleteConfigItem() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/config/${encodeURIComponent(testparam)}`;
    testValidRequest(
      serviceInstance.deleteConfigItem(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
    );
    testNetworkError(
      serviceInstance.deleteConfigItem(testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.deleteConfigItem(testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.deleteConfigItem(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.deleteConfigItem(testparam),
      testurl
    );
    flush();
  }));

  it('should process method deletePSetItem() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/parameterset/${encodeURIComponent(testparam)}`;
    testValidRequest(
      serviceInstance.deletePSetItem(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
    );
    testNetworkError(
      serviceInstance.deletePSetItem(testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.deletePSetItem(testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.deletePSetItem(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.deletePSetItem(testparam),
      testurl
    );
    flush();
  }));

  it('should process method deleteJob() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 1024;
    let testurl = `mock-host/webapi/v3/jobs/${encodeURIComponent(testparam)}`;
    testValidRequest(
      serviceInstance.deleteJob(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      true,
      HttpStatusCode.NoContent, 'NoContent'
    );
    testNetworkError(
      serviceInstance.deleteJob(testparam),
      testurl
    );
    testStatusNotExpectedError(
      serviceInstance.deleteJob(testparam),
      testurl
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.deleteJob(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.deleteJob(testparam),
      testurl
    );
    flush();
  }));

});
