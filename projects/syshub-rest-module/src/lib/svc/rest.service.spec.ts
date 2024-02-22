import { RestService, SearchParams } from './rest.service';
import { Settings } from '../settings';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpStatusCode } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
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

  let subs: Subscription[] = [];

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
    subs.forEach((sub) => sub.unsubscribe());
    subs = [];
  });

  function testMissingScopeError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    tick(10);
    expect(payload).withContext('testMissingScopeError: Match returned content').toBeInstanceOf(MissingScopeError);
  }

  function testNetworkError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: 0, statusText: '' });
    expect(payload).withContext('testNetworkError: Match returned content').toBeInstanceOf(NetworkError);
  }

  function testStatusNotExpectedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.NotFound, statusText: 'Not Found' });
    expect(payload).withContext('testStatusNotExpectedError: Match returned content').toBeInstanceOf(StatusNotExpectedError);
  }

  function testUnauthorizedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' });
    expect(payload).withContext('testUnauthorizedError: Match returned content').toBeInstanceOf(UnauthorizedError);
  }

  function testValidAndBasicErrors(fn: Function, testurl: string, expectRequestMethod: string, expectedRequestBody: any, sendResponse: any, sendHeader: { [key: string]: string } | undefined, expectedResponse: any, status: HttpStatusCode, statusText: string) {
    testValidRequest(
      fn(),
      testurl,
      expectRequestMethod,
      expectedRequestBody,
      sendResponse,
      sendHeader,
      expectedResponse,
      status,
      statusText,
    );
    testNetworkError(
      fn(),
      testurl
    );
    testStatusNotExpectedError(
      fn(),
      testurl
    );
  };

  function testValidRequest(subject: any, expectUrl: string, expectRequestMethod: string, expectedRequestBody: any, sendResponse: any, sendHeader: { [key: string]: string } | undefined, expectedResponse: any, status: HttpStatusCode, statusText: string): void {
    let payload: any;
    expect(subject).withContext('Valid request: Return type should be instanceOf Subject<Response>').toBeInstanceOf(Subject<Response>);
    subs.push((<Subject<Response>>subject).subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
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
    testValidAndBasicErrors(
      () => serviceInstance.backupSyshub(testparams[0], testparams[1], testparams[2], []),
      testurl,
      'POST',
      { BACKUPDESCRIPTION: testparams[1], BACKUPNAME: testparams[0], BACKUPTYPES: [] },
      { name: 'mock-name', type: 'result', value: true },
      undefined,
      { name: 'mock-name', type: 'result', value: true },
      HttpStatusCode.Created, 'Created'
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
    testValidAndBasicErrors(
      () => serviceInstance.createCategory(testparam),
      testurl,
      'PUT',
      { children: [testparam] },
      { children: [testparam] },
      undefined,
      [testparam],
      HttpStatusCode.Created, 'Created'
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
    testValidAndBasicErrors(
      () => serviceInstance.createJob(<SyshubJob><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
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
    testValidAndBasicErrors(
      () => serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
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
    testValidAndBasicErrors(
      () => serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>testparam),
      testurl,
      'POST',
      testparam,
      testparam,
      { 'Location': 'mock-forward-header' },
      { content: testparam, header: { 'Location': 'mock-forward-header' } },
      HttpStatusCode.Created, 'Created'
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
    testValidAndBasicErrors(
      () => serviceInstance.deleteCategory(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
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
    testValidAndBasicErrors(
      () => serviceInstance.deleteConfigItem(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
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
    testValidAndBasicErrors(
      () => serviceInstance.deletePSetItem(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      testparam,
      HttpStatusCode.Ok, 'OK'
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
    testValidAndBasicErrors(
      () => serviceInstance.deleteJob(testparam),
      testurl,
      'DELETE',
      null,
      testparam,
      undefined,
      true,
      HttpStatusCode.NoContent, 'NoContent'
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

  it('should process method getc() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'category';
    let testurl = 'mock-host/webapi/custom/category';
    testValidRequest(
      serviceInstance.getc(testparam),
      testurl,
      'GET',
      null,
      { mock: 'foo' },
      undefined,
      { content: Object({ mock: 'foo' }), etag: undefined, header: Object({}), status: 200 },
      HttpStatusCode.Ok, 'OK'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testValidRequest(
      serviceInstance.getc(testparam),
      testurl,
      'GET',
      null,
      null,
      undefined,
      { content: null, status: 401 },
      HttpStatusCode.Unauthorized, 'Unauthorized'
    );
    flush();
  }));

  it('should process method getBackupMetadata() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-folder';
    let testurl = `mock-host/webapi/v3/backuprestore/metadata?folder=${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getBackupMetadata(testparam),
      testurl,
      'GET',
      null,
      { foo: 'mock-response' },
      undefined,
      { foo: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getBackupMetadata(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getBackupMetadata(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getCategories() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/category/list`;
    testValidAndBasicErrors(
      () => serviceInstance.getCategories(),
      testurl,
      'GET',
      null,
      { children: [{ foo: 'mock-response' }] },
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCategories(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCategories(),
      testurl
    );
    flush();
  }));

  it('should process method getCategory() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/category/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getCategory(testparam),
      testurl,
      'GET',
      null,
      { foo: 'mock-response' },
      undefined,
      { foo: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCategory(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCategory(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getCategoryRefs() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/category/references/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getCategoryRefs(testparam),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCategoryRefs(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCategoryRefs(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getCategoryRefs() with type filter correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/category/references/${encodeURIComponent(testparam)}?type=Decision`;
    testValidRequest(
      serviceInstance.getCategoryRefs(testparam, 'Decision'),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getCertStoreItems() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam: 'keystore' | 'truststore' = 'keystore';
    let testurl = `mock-host/webapi/v3/certificate/list/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getCertStoreItems(testparam),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCertStoreItems(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCertStoreItems(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getClusterStatus() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/cluster`;
    testValidAndBasicErrors(
      () => serviceInstance.getClusterStatus(),
      testurl,
      'GET',
      null,
      { foo: 'mock-response' },
      undefined,
      { foo: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getClusterStatus(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getClusterStatus(),
      testurl
    );
    flush();
  }));

  it('should process method getConfigChildren() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/config/children?uuid=${encodeURIComponent(testparam)}&maxDeep=0`;
    testValidAndBasicErrors(
      () => serviceInstance.getConfigChildren(testparam),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getConfigChildren(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getConfigChildren(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getConfigChildren() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/config/children?uuid=${encodeURIComponent(testparam)}&maxDeep=1`;
    testValidRequest(
      serviceInstance.getConfigChildren(testparam, 1),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getConfigItem() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/config/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getConfigItem(testparam),
      testurl,
      'GET',
      null,
      { foo: 'mock-response' },
      undefined,
      { foo: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getConfigItem(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getConfigItem(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getConfigPath() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/config/path/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getConfigPath(testparam),
      testurl,
      'GET',
      null,
      { value: 'mock-response' },
      undefined,
      'mock-response',
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getConfigPath(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getConfigPath(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getConnectedClients() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = true;
    let testurl = `mock-host/webapi/v3/server/list/clientInformation?showAll=${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getConnectedClients(),
      testurl,
      'GET',
      null,
      [{ value: 'mock-response' }],
      undefined,
      [{ value: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getConnectedClients(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getConnectedClients(),
      testurl
    );
    flush();
  }));

  it('should process method getConnectedClients() with false param correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = false;
    let testurl = `mock-host/webapi/v3/server/list/clientInformation?showAll=${encodeURIComponent(testparam)}`;
    testValidRequest(
      serviceInstance.getConnectedClients(testparam),
      testurl,
      'GET',
      null,
      [{ value: 'mock-response' }],
      undefined,
      [{ value: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getCurrentUser() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/currentUser`;
    testValidAndBasicErrors(
      () => serviceInstance.getCurrentUser(),
      testurl,
      'GET',
      null,
      { value: 'mock-response' },
      undefined,
      { value: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCurrentUser(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCurrentUser(),
      testurl
    );
    flush();
  }));

  it('should process method getCurrentUsersPermissions() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/users/currentUser/permissions`;
    testValidAndBasicErrors(
      () => serviceInstance.getCurrentUsersPermissions(),
      testurl,
      'GET',
      null,
      ['mock-perm1', 'mock-perm2'],
      undefined,
      ['mock-perm1', 'mock-perm2'],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCurrentUsersPermissions(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCurrentUsersPermissions(),
      testurl
    );
    flush();
  }));

  it('should process method getCurrentUsersRoles() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/users/currentUser/roles`;
    testValidAndBasicErrors(
      () => serviceInstance.getCurrentUsersRoles(),
      testurl,
      'GET',
      null,
      ['mock-role1', 'mock-role2'],
      undefined,
      ['mock-role1', 'mock-role2'],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getCurrentUsersRoles(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getCurrentUsersRoles(),
      testurl
    );
    flush();
  }));

  it('should process method getDevices() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/list/devices`;
    testValidAndBasicErrors(
      () => serviceInstance.getDevices(),
      testurl,
      'GET',
      null,
      [{ value: 'mock-response' }],
      undefined,
      [{ value: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getDevices(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getDevices(),
      testurl
    );
    flush();
  }));

  it('should process method getDevices() with true param correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/list/devices?withImages=true`;
    testValidRequest(
      serviceInstance.getDevices(true),
      testurl,
      'GET',
      null,
      [{ value: 'mock-response' }],
      undefined,
      [{ value: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getJndiDatabaseStructure() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/db/listAttributes/System?isNativeCall=true`;
    testValidAndBasicErrors(
      () => serviceInstance.getJndiDatabaseStructure(),
      testurl,
      'GET',
      null,
      SystemNativeJndiDef,
      undefined,
      SystemJndiDefResponse,
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJndiDatabaseStructure(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJndiDatabaseStructure(),
      testurl
    );
    flush();
  }));

  it('should process method getJndiDatabaseStructure() with params correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/db/listAttributes/custdb?isNativeCall=false`;
    testValidRequest(
      serviceInstance.getJndiDatabaseStructure('custdb', false),
      testurl,
      'GET',
      null,
      SystemJndiDef,
      undefined,
      SystemJndiDefResponse,
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should throw console error in method getJndiDatabaseStructure()', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/db/listAttributes/custdb?isNativeCall=false`;
    spyOn(console, 'error');
    testValidRequest(
      serviceInstance.getJndiDatabaseStructure('custdb', false),
      testurl,
      'GET',
      null,
      [{ text: "mock-tableName", node: [{ text: "foo" }] }],
      undefined,
      [{ name: 'mock-tableName', columns: [] }],
      HttpStatusCode.Ok, 'Ok'
    );
    expect(console.error).withContext('Console receives error message').toHaveBeenCalledWith('Unable to match table column definition for column foo in table mock-tableName');
    flush();
  }));

  it('should process method getJndiConnectionNames() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/db/listJNDI`;
    testValidAndBasicErrors(
      () => serviceInstance.getJndiConnectionNames(),
      testurl,
      'GET',
      null,
      ['mock-jndi1', 'mock-jndi2'],
      undefined,
      ['mock-jndi1', 'mock-jndi2'],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJndiConnectionNames(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJndiConnectionNames(),
      testurl
    );
    flush();
  }));

  it('should process method getJob() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/jobs/1024`;
    testValidAndBasicErrors(
      () => serviceInstance.getJob(1024),
      testurl,
      'GET',
      null,
      { id: 1024, title: 'mock-title' },
      undefined,
      { id: 1024, title: 'mock-title' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJob(1024),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJob(1024),
      testurl
    );
    flush();
  }));

  it('should process method getJobDir() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/jobsDir`;
    testValidAndBasicErrors(
      () => serviceInstance.getJobDir(),
      testurl,
      'GET',
      null,
      { value: 'mock-dir' },
      undefined,
      'mock-dir',
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJobDir(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJobDir(),
      testurl
    );
    flush();
  }));

  it('should process method getJobDir() with jobId correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/jobsDir?jobId=1024`;
    testValidRequest(
      serviceInstance.getJobDir(1024),
      testurl,
      'GET',
      null,
      { value: 'mock-dir/1024' },
      undefined,
      'mock-dir/1024',
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getJobType() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/jobtype/${testparam}`;
    testValidAndBasicErrors(
      () => serviceInstance.getJobType(testparam),
      testurl,
      'GET',
      null,
      { uuid: testparam, title: 'mock-title' },
      undefined,
      { uuid: testparam, title: 'mock-title' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJobType(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJobType(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getJobTypes() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/jobtype/list`;
    testValidAndBasicErrors(
      () => serviceInstance.getJobTypes(),
      testurl,
      'GET',
      null,
      {
        children: [
          { uuid: 'mock-uuid1', title: 'mock-title1' },
          { uuid: 'mock-uuid2', title: 'mock-title2', category: {} },
          { uuid: 'mock-uuid3', title: 'mock-title3', category: { uuid: null } },
          { uuid: 'mock-uuid4', title: 'mock-title4', category: { uuid: 'mock-cat-uuid' } }
        ]
      },
      undefined,
      [
        { uuid: 'mock-uuid1', title: 'mock-title1' },
        { uuid: 'mock-uuid2', title: 'mock-title2', category: null },
        { uuid: 'mock-uuid3', title: 'mock-title3', category: null },
        { uuid: 'mock-uuid4', title: 'mock-title4', category: { uuid: 'mock-cat-uuid' } }
      ],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJobTypes(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJobTypes(),
      testurl
    );
    flush();
  }));

  it('should process method getJobs() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/jobs`;
    testValidAndBasicErrors(
      () => serviceInstance.getJobs(),
      testurl,
      'GET',
      null,
      { mock: 'mock-item' },
      { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
      { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
      HttpStatusCode.Ok, 'Ok'
    );
    let testparams: SearchParams = { limit: 100, offset: 10, orderby: 'id', search: 'foo' };
    testurl = `mock-host/webapi/v3/jobs?limit=100&offset=10&orderby=id&search=foo`;
    testValidAndBasicErrors(
      () => serviceInstance.getJobs(testparams),
      testurl,
      'GET',
      null,
      { mock: 'mock-item' },
      { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '11', First: '10', Previous: '9' },
      { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '11', First: '10', Previous: '9' } },
      HttpStatusCode.Ok, 'Ok'
    );
    testurl = `mock-host/webapi/v3/jobs`;
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getJobs(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getJobs(),
      testurl
    );
    flush();
  }));

  it('should process method getNamedSystemsForConfigPath() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam: string = 'mock-/foo';
    let testurl = `mock-host/webapi/v3/server/configuredSystems?elementPath=${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getNamedSystemsForConfigPath(testparam),
      testurl,
      'GET',
      null,
      ['test', 'foo'],
      undefined,
      ['test', 'foo'],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getNamedSystemsForConfigPath(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getNamedSystemsForConfigPath(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getPermissions() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/permissions`;
    testValidAndBasicErrors(
      () => serviceInstance.getPermissions(),
      testurl,
      'GET',
      null,
      [{ mock: 'test-item' }],
      undefined,
      [{ mock: 'test-item' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getPermissions(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getPermissions(),
      testurl
    );
    flush();
  }));

  it('should process method getPermissionSets() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/permissionsets`;
    testValidAndBasicErrors(
      () => serviceInstance.getPermissionSets(),
      testurl,
      'GET',
      null,
      [{ mock: 'test-item' }],
      undefined,
      [{ mock: 'test-item' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getPermissionSets(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getPermissionSets(),
      testurl
    );
    flush();
  }));

  it('should process method getPsetChildren() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/parameterset/children?uuid=${encodeURIComponent(testparam)}&maxDeep=0`;
    testValidAndBasicErrors(
      () => serviceInstance.getPsetChildren(testparam),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getPsetChildren(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getPsetChildren(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getPsetChildren() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/parameterset/children?uuid=${encodeURIComponent(testparam)}&maxDeep=1`;
    testValidRequest(
      serviceInstance.getPsetChildren(testparam, 1),
      testurl,
      'GET',
      null,
      [{ foo: 'mock-response' }],
      undefined,
      [{ foo: 'mock-response' }],
      HttpStatusCode.Ok, 'Ok'
    );
    flush();
  }));

  it('should process method getPsetItem() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/parameterset/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getPsetItem(testparam),
      testurl,
      'GET',
      null,
      { foo: 'mock-response' },
      undefined,
      { foo: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getPsetItem(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getPsetItem(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getPsetPath() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 'mock-uuid';
    let testurl = `mock-host/webapi/v3/parameterset/path/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getPsetPath(testparam),
      testurl,
      'GET',
      null,
      { value: 'mock-response' },
      undefined,
      'mock-response',
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getPsetPath(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getPsetPath(testparam),
      testurl
    );
    flush();
  }));

  it('should process method getRoles() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/roles`;
    testValidAndBasicErrors(
      () => serviceInstance.getRoles(),
      testurl,
      'GET',
      null,
      [{ mock: 'test-item' }],
      undefined,
      [{ mock: 'test-item' }],
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getRoles(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getRoles(),
      testurl
    );
    flush();
  }));

  it('should process method getServerInformation() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/list/information`;
    testValidAndBasicErrors(
      () => serviceInstance.getServerInformation(),
      testurl,
      'GET',
      null,
      { info1: 'foo', info2: true, info3: null },
      undefined,
      { info1: 'foo', info2: true, info3: null },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getServerInformation(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getServerInformation(),
      testurl
    );
    flush();
  }));

  it('should process method getServerProperties() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/properties`;
    testValidAndBasicErrors(
      () => serviceInstance.getServerProperties(),
      testurl,
      'GET',
      null,
      { info1: 'foo', info2: true, info3: null },
      undefined,
      { info1: 'foo', info2: true, info3: null },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getServerProperties(),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getServerProperties(),
      testurl
    );
    flush();
  }));

  it('should process method getSyslogEntries() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/syslogs`;
    let testparams: SearchParams = {};
    testValidAndBasicErrors(
      () => serviceInstance.getSyslogEntries(testparams),
      testurl,
      'GET',
      null,
      { mock: 'mock-item' },
      { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
      { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
      HttpStatusCode.Ok, 'Ok'
    );
    testparams = { limit: 100, offset: 10, orderby: 'id', search: 'foo' };
    testurl = `mock-host/webapi/v3/syslogs?limit=100&offset=10&orderby=id&search=foo`;
    testValidAndBasicErrors(
      () => serviceInstance.getSyslogEntries(testparams),
      testurl,
      'GET',
      null,
      { mock: 'mock-item' },
      { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '11', First: '10', Previous: '9' },
      { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '11', First: '10', Previous: '9' } },
      HttpStatusCode.Ok, 'Ok'
    );
    testparams = {};
    testurl = `mock-host/webapi/v3/syslogs`;
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getSyslogEntries(testparams),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getSyslogEntries(testparams),
      testurl
    );
    flush();
  }));

  it('should process method getSyslogEntry() correct', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testparam = 1024;
    let testurl = `mock-host/webapi/v3/syslogs/${encodeURIComponent(testparam)}`;
    testValidAndBasicErrors(
      () => serviceInstance.getSyslogEntry(testparam),
      testurl,
      'GET',
      null,
      { value: 'mock-response' },
      undefined,
      { value: 'mock-response' },
      HttpStatusCode.Ok, 'Ok'
    );
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError(
      serviceInstance.getSyslogEntry(testparam),
      testurl
    );
    serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError(
      serviceInstance.getSyslogEntry(testparam),
      testurl
    );
    flush();
  }));

});

export const SystemJndiDef = [
  {
    "text": "config",
    "node": [
      {
        "text": "uuid:varchar"
      },
      {
        "text": "modifiedby:varchar"
      },
      {
        "text": "modifiedtime:datetime2"
      },
      {
        "text": "config_name:varchar"
      },
      {
        "text": "config_type:int"
      },
      {
        "text": "config_value:varchar"
      },
      {
        "text": "description:varchar"
      },
      {
        "text": "parentuuid:varchar"
      }
    ]
  },
  {
    "text": "filestatus",
    "node": [
      {
        "text": "id:bigint identity"
      },
      {
        "text": "jobid:bigint"
      },
      {
        "text": "sourcejobid:bigint"
      },
      {
        "text": "packageid:bigint"
      },
      {
        "text": "status:int"
      },
      {
        "text": "textstatus:varchar"
      },
      {
        "text": "filename:varchar"
      },
      {
        "text": "filetype:varchar"
      },
      {
        "text": "datatype:varchar"
      },
      {
        "text": "application:varchar"
      },
      {
        "text": "host:varchar"
      },
      {
        "text": "xid:varchar"
      },
      {
        "text": "pages:int"
      },
      {
        "text": "documents:int"
      },
      {
        "text": "prpages:int"
      },
      {
        "text": "customfield:varchar"
      },
      {
        "text": "customfield1:varchar"
      },
      {
        "text": "customfield2:varchar"
      },
      {
        "text": "customfield3:varchar"
      },
      {
        "text": "customfield4:varchar"
      },
      {
        "text": "modifiedby:varchar"
      },
      {
        "text": "modifiedtime:datetime2"
      },
      {
        "text": "customdata:varbinary"
      },
      {
        "text": "deldate:datetime2"
      }
    ]
  },
];

export const SystemNativeJndiDef = [
  {
    "text": "config",
    "node": [
      {
        "text": "uuid:varchar"
      },
      {
        "text": "modifiedby:varchar"
      },
      {
        "text": "modifiedtime:datetime2"
      },
      {
        "text": "config_name:varchar"
      },
      {
        "text": "config_type:int"
      },
      {
        "text": "config_value:varchar"
      },
      {
        "text": "description:varchar"
      },
      {
        "text": "parentuuid:varchar"
      }
    ]
  },
  {
    "text": "filestatus",
    "node": [
      {
        "text": "id:bigint identity"
      },
      {
        "text": "jobid:bigint"
      },
      {
        "text": "sourcejobid:bigint"
      },
      {
        "text": "packageid:bigint"
      },
      {
        "text": "status:int"
      },
      {
        "text": "textstatus:varchar"
      },
      {
        "text": "filename:varchar"
      },
      {
        "text": "filetype:varchar"
      },
      {
        "text": "datatype:varchar"
      },
      {
        "text": "application:varchar"
      },
      {
        "text": "host:varchar"
      },
      {
        "text": "xid:varchar"
      },
      {
        "text": "pages:int"
      },
      {
        "text": "documents:int"
      },
      {
        "text": "prpages:int"
      },
      {
        "text": "customfield:varchar"
      },
      {
        "text": "customfield1:varchar"
      },
      {
        "text": "customfield2:varchar"
      },
      {
        "text": "customfield3:varchar"
      },
      {
        "text": "customfield4:varchar"
      },
      {
        "text": "modifiedby:varchar"
      },
      {
        "text": "modifiedtime:datetime2"
      },
      {
        "text": "customdata:varbinary"
      },
      {
        "text": "deldate:datetime2"
      }
    ]
  },
];

export const SystemJndiDefResponse = [
  {
    "name": "config",
    "columns": [
      {
        "name": "uuid",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "modifiedby",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "modifiedtime",
        "datatype": "datetime2",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "config_name",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "config_type",
        "datatype": "int",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "config_value",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "description",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "parentuuid",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      }
    ]
  },
  {
    "name": "filestatus",
    "columns": [
      {
        "name": "id",
        "datatype": "bigint",
        "isIdColumn": true,
        "isUnique": false
      },
      {
        "name": "jobid",
        "datatype": "bigint",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "sourcejobid",
        "datatype": "bigint",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "packageid",
        "datatype": "bigint",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "status",
        "datatype": "int",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "textstatus",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "filename",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "filetype",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "datatype",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "application",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "host",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "xid",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "pages",
        "datatype": "int",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "documents",
        "datatype": "int",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "prpages",
        "datatype": "int",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customfield",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customfield1",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customfield2",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customfield3",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customfield4",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "modifiedby",
        "datatype": "varchar",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "modifiedtime",
        "datatype": "datetime2",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "customdata",
        "datatype": "varbinary",
        "isIdColumn": false,
        "isUnique": false
      },
      {
        "name": "deldate",
        "datatype": "datetime2",
        "isIdColumn": false,
        "isUnique": false
      }
    ]
  }
];