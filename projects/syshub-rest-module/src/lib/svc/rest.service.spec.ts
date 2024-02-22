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

  function testGenericMethod(params: { fn: Function, url: string, method: string, expectedRequestBody: any, sendResponse: any, sendHeader?: { [key: string]: string } | undefined, expectedResponse?: any, status?: HttpStatusCode, statusText?: string, includeErrorTests?: boolean }[]) {
    let payload: any;
    let sub: Subscription;
    params.forEach((param) => {
      let subject = (<Observable<any>>param.fn());
      expect(subject).withContext(`testPostMethod: Return type of ${param.fn} should be instanceOf Subject<Response>`).toBeInstanceOf(Subject<Response>);
      sub = subject.subscribe((subject_payload) => payload = subject_payload);
      let request = httpTestingController.expectOne(param.url, `testPostMethod: Url check ${param.fn}`);
      expect(request.request.method).withContext(`testPostMethod: Check request method for ${param.fn}`).toEqual(param.method);
      expect(request.request.body).withContext(`testPostMethod: Check request body for ${param.fn}`).toEqual(param.expectedRequestBody);
      request.flush(param.sendResponse, { status: param.status ?? HttpStatusCode.Ok, statusText: param.statusText ?? 'Ok', headers: param.sendHeader });
      tick(10);
      expect(payload).withContext(`testPostMethod: Check processed payload for ${param.fn}`).toEqual(param.expectedResponse ?? param.sendResponse);
      sub?.unsubscribe();
      payload = undefined;
      if (param.includeErrorTests !== false) {
        testNetworkError(param.fn(), param.url);
        testStatusNotExpectedError(param.fn(), param.url);
      }
    });
  };

  function testMissingScopeError(fns: Function[]): void {
    let payload: any;
    let sub: Subscription;
    fns.forEach((fn) => {
      sub = (<Observable<any>>fn()).subscribe((subject_payload) => payload = subject_payload);
      tick(10);
      expect(payload).withContext(`testMissingScopeError: ${fn}`).toBeInstanceOf(MissingScopeError);
      sub?.unsubscribe();
      payload = undefined;
    });
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

  function testUnauthorizedError(params: [Function, string, any?][]): void {
    let payload: any;
    let sub: Subscription;
    params.forEach((param) => {
      sub = (<Observable<any>>param[0]()).subscribe((subject_payload) => payload = subject_payload);
      let request = httpTestingController.expectOne(param[1], `testUnauthorizedError: ${param[0]}`)
      request.flush(null, { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' });
      tick();
      if (param[2] == undefined)
        expect(payload).withContext(`testUnauthorizedError: ${param[0]}`).toBeInstanceOf(UnauthorizedError);
      else
        expect(payload).withContext(`testUnauthorizedError: ${param[0]}`).toEqual(param[2]);
      sub?.unsubscribe();
      payload = undefined;
    });
  }

  function testCustomValidation(subject: any, expectUrl: string, expectRequestMethod: string, expectedRequestBody: any, sendResponse: any, sendHeader: { [key: string]: string } | undefined, expectedResponse: any, status: HttpStatusCode, statusText: string): void {
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

  it('should handle missing private scope correct', fakeAsync(() => {
    let serviceInstance = new RestService(<Settings><any>mockOauthSettingsPublicOnly, httpClient);
    testMissingScopeError([
      () => serviceInstance.createCategory(<SyshubCategory><any>{}),
      () => serviceInstance.deleteCategory(''),
      () => serviceInstance.deleteConfigItem(''),
      () => serviceInstance.deletePSetItem(''),
      () => serviceInstance.getCategories(),
      () => serviceInstance.getCategory(''),
      () => serviceInstance.getCategoryRefs(''),
      () => serviceInstance.getClusterStatus(),
      () => serviceInstance.getConfigChildren(''),
      () => serviceInstance.getConfigItem(''),
      () => serviceInstance.getConfigPath(''),
      () => serviceInstance.getConnectedClients(),
      () => serviceInstance.getCurrentUsersPermissions(),
      () => serviceInstance.getCurrentUsersRoles(),
      () => serviceInstance.getDevices(),
      () => serviceInstance.getJndiDatabaseStructure(),
      () => serviceInstance.getJndiConnectionNames(),
      () => serviceInstance.getJobType(''),
      () => serviceInstance.getJobTypes(),
      () => serviceInstance.getNamedSystemsForConfigPath(''),
      () => serviceInstance.getPermissions(),
      () => serviceInstance.getPermissionSets(),
      () => serviceInstance.getPsetChildren(''),
      () => serviceInstance.getPsetItem(''),
      () => serviceInstance.getPsetPath(''),
      () => serviceInstance.getRoles(),
      () => serviceInstance.getServerProperties(),
      () => serviceInstance.getUsers(),
      () => serviceInstance.getWorkflows({}),
      () => serviceInstance.getWorkflowModel(''),
      () => serviceInstance.getWorkflowReferences(''),
    ])
    flush();
  }));

  it('should handle missing public scope correct', fakeAsync(() => {
    let serviceInstance = new RestService(<Settings><any>mockOauthSettingsPrivateOnly, httpClient);
    testMissingScopeError([
      () => serviceInstance.backupSyshub('', '', '', []),
      () => serviceInstance.createJob(<SyshubJob><any>{}),
      () => serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>{}),
      () => serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>{}),
      () => serviceInstance.deleteJob(1),
      () => serviceInstance.getBackupMetadata(''),
      () => serviceInstance.getCertStoreItems('keystore'),
      () => serviceInstance.getCurrentUser(),
      () => serviceInstance.getJob(1),
      () => serviceInstance.getJobDir(),
      () => serviceInstance.getJobs(),
      () => serviceInstance.getServerInformation(),
      () => serviceInstance.getSyslogEntries({}),
      () => serviceInstance.getSyslogEntry(1),
      () => serviceInstance.getSyslogHostnames(),
      () => serviceInstance.getUserlogEntries(),
      () => serviceInstance.getUserlogEntry(1),
      () => serviceInstance.getWorkflowExecution(''),
      () => serviceInstance.getWorkflowExecutions(),
    ])
    flush();
  }));

  it('should handle unauthorized correct', fakeAsync(() => {
    localStorage.setItem('authmod-session', JSON.stringify(mockLoggedInLocalStorage));
    let serviceInstance = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testUnauthorizedError([
      [() => serviceInstance.backupSyshub('', '', '', []), 'mock-host/webapi/v3/backuprestore/backup?folder='],
      [() => serviceInstance.createCategory(<SyshubCategory><any>{}), 'mock-host/webapi/v3/category/list'],
      [() => serviceInstance.createJob(<SyshubJob><any>{}), 'mock-host/webapi/v3/jobs'],
      [() => serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>{}), 'mock-host/webapi/v3/syslogs'],
      [() => serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>{}), 'mock-host/webapi/v3/userlogs'],
      [() => serviceInstance.deletec('category'), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.deleteCategory(''), 'mock-host/webapi/v3/category/'],
      [() => serviceInstance.deleteConfigItem(''), 'mock-host/webapi/v3/config/'],
      [() => serviceInstance.deleteJob(1), 'mock-host/webapi/v3/jobs/1'],
      [() => serviceInstance.deletePSetItem(''), 'mock-host/webapi/v3/parameterset/'],
      [() => serviceInstance.getc('category'), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.getBackupMetadata(''), 'mock-host/webapi/v3/backuprestore/metadata?folder='],
      [() => serviceInstance.getCategories(), 'mock-host/webapi/v3/category/list'],
      [() => serviceInstance.getCategory(''), 'mock-host/webapi/v3/category/'],
      [() => serviceInstance.getCategoryRefs(''), 'mock-host/webapi/v3/category/references/'],
      [() => serviceInstance.getCertStoreItems('keystore'), 'mock-host/webapi/v3/certificate/list/keystore'],
      [() => serviceInstance.getClusterStatus(), 'mock-host/webapi/v3/server/cluster'],
      [() => serviceInstance.getConfigChildren(''), 'mock-host/webapi/v3/config/children?uuid=&maxDeep=0'],
      [() => serviceInstance.getConfigItem(''), 'mock-host/webapi/v3/config/'],
      [() => serviceInstance.getConfigPath(''), 'mock-host/webapi/v3/config/path/'],
      [() => serviceInstance.getConnectedClients(), 'mock-host/webapi/v3/server/list/clientInformation?showAll=true'],
      [() => serviceInstance.getCurrentUser(), 'mock-host/webapi/v3/currentUser'],
      [() => serviceInstance.getCurrentUsersPermissions(), 'mock-host/webapi/v3/users/currentUser/permissions'],
      [() => serviceInstance.getCurrentUsersRoles(), 'mock-host/webapi/v3/users/currentUser/roles'],
      [() => serviceInstance.getDevices(), 'mock-host/webapi/v3/server/list/devices'],
      [() => serviceInstance.getJndiConnectionNames(), 'mock-host/webapi/v3/server/db/listJNDI'],
      [() => serviceInstance.getJndiDatabaseStructure(), 'mock-host/webapi/v3/server/db/listAttributes/System?isNativeCall=true'],
      [() => serviceInstance.getJob(1), 'mock-host/webapi/v3/jobs/1'],
      [() => serviceInstance.getJobDir(), 'mock-host/webapi/v3/server/jobsDir'],
      [() => serviceInstance.getJobs(), 'mock-host/webapi/v3/jobs'],
      [() => serviceInstance.getJobType(''), 'mock-host/webapi/v3/jobtype/'],
      [() => serviceInstance.getJobTypes(), 'mock-host/webapi/v3/jobtype/list'],
      [() => serviceInstance.getNamedSystemsForConfigPath(''), 'mock-host/webapi/v3/server/configuredSystems?elementPath='],
      [() => serviceInstance.getPermissions(), 'mock-host/webapi/v3/permissions'],
      [() => serviceInstance.getPermissionSets(), 'mock-host/webapi/v3/permissionsets'],
      [() => serviceInstance.getPsetChildren(''), 'mock-host/webapi/v3/parameterset/children?uuid=&maxDeep=0'],
      [() => serviceInstance.getPsetItem(''), 'mock-host/webapi/v3/parameterset/'],
      [() => serviceInstance.getPsetPath(''), 'mock-host/webapi/v3/parameterset/path/'],
      [() => serviceInstance.getRoles(), 'mock-host/webapi/v3/roles'],
      [() => serviceInstance.getServerInformation(), 'mock-host/webapi/v3/server/list/information'],
      [() => serviceInstance.getServerProperties(), 'mock-host/webapi/v3/server/properties'],
      [() => serviceInstance.getSyslogEntries({}), 'mock-host/webapi/v3/syslogs'],
      [() => serviceInstance.getSyslogEntry(1), 'mock-host/webapi/v3/syslogs/1'],
      [() => serviceInstance.getSyslogHostnames(), 'mock-host/webapi/v3/syslogs/hostNames'],
      [() => serviceInstance.getUserlogEntries(), 'mock-host/webapi/v3/userlogs'],
      [() => serviceInstance.getUserlogEntry(1), 'mock-host/webapi/v3/userlogs/1'],
      [() => serviceInstance.getUsers(), 'mock-host/webapi/v3/users'],
      [() => serviceInstance.getWorkflows({}), 'mock-host/webapi/v3/workflows'],
      [() => serviceInstance.getWorkflowExecution(''), 'mock-host/webapi/v3/workflows/execute/'],
      [() => serviceInstance.getWorkflowExecutions(), 'mock-host/webapi/v3/workflows/execute'],
      [() => serviceInstance.getWorkflowModel(''), 'mock-host/webapi/v3/workflow/'],
      [() => serviceInstance.getWorkflowReferences(''), 'mock-host/webapi/v3/workflows/checkReferences?uuid='],
    ])
    flush();
  }));

  it('should handle all methods correct', fakeAsync(() => {
    const simpleCustomResponse = { content: { mock: 'foo' }, etag: undefined, header: {}, status: 200 };
    const simpleObjectWithChildrenArray = { children: [{ mock: 'foo1' }, { mock: 'foo2' }] };
    const simpleObjectWithStr = { mock: 'foo' };
    const simpleObjectWithId = { id: 1 };
    const simpleSuccessResponse = { name: 'mock-name', type: 'mock-result', value: true };
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    testGenericMethod([
      {
        fn: () => serviceInstance.backupSyshub('mock-backupName', 'mock-backupDescription', 'mock-/folderpath', []),
        url: `mock-host/webapi/v3/backuprestore/backup?folder=${encodeURIComponent('mock-/folderpath')}`, method: 'POST',
        expectedRequestBody: { BACKUPDESCRIPTION: 'mock-backupDescription', BACKUPNAME: 'mock-backupName', BACKUPTYPES: [] },
        sendResponse: { name: 'mock-name', type: 'result', value: true },
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.createCategory(<SyshubCategory><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/category/list`, method: 'PUT',
        expectedRequestBody: { children: [simpleObjectWithId] },
        sendResponse: { children: [simpleObjectWithId] },
        expectedResponse: [simpleObjectWithId],
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.createJob(<SyshubJob><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/jobs`, method: 'POST',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithId,
        sendHeader: { 'Location': 'mock-forward-header' },
        expectedResponse: { content: simpleObjectWithId, header: { 'Location': 'mock-forward-header' } },
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.createSyslogEntry(<SyshubSyslogEntryToCreate><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/syslogs`, method: 'POST',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithId,
        sendHeader: { 'Location': 'mock-forward-header' },
        expectedResponse: { content: simpleObjectWithId, header: { 'Location': 'mock-forward-header' } },
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.createUserlogEntry(<SyshubUserlogEntryToCreate><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/userlogs`, method: 'POST',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithId,
        sendHeader: { 'Location': 'mock-forward-header' },
        expectedResponse: { content: simpleObjectWithId, header: { 'Location': 'mock-forward-header' } },
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.deletec('category'),
        url: `mock-host/webapi/custom/category`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.deleteCategory('mock-uuid'),
        url: `mock-host/webapi/v3/category/mock-uuid`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: simpleSuccessResponse,
        expectedResponse: simpleSuccessResponse
      },
      {
        fn: () => serviceInstance.deleteConfigItem('mock-uuid'),
        url: `mock-host/webapi/v3/config/mock-uuid`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: simpleSuccessResponse,
        expectedResponse: simpleSuccessResponse
      },
      {
        fn: () => serviceInstance.deletePSetItem('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/mock-uuid`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: simpleSuccessResponse,
        expectedResponse: simpleSuccessResponse
      },
      {
        fn: () => serviceInstance.deleteJob(1),
        url: `mock-host/webapi/v3/jobs/1`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: true,
        status: HttpStatusCode.NoContent, statusText: 'NoContent'
      },
      {
        fn: () => serviceInstance.getc('category'),
        url: `mock-host/webapi/custom/category`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getBackupMetadata('mock-/folder'),
        url: `mock-host/webapi/v3/backuprestore/metadata?folder=${encodeURIComponent('mock-/folder')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getCategories(),
        url: `mock-host/webapi/v3/category/list`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray,
        expectedResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getCategory('mock-uuid'),
        url: `mock-host/webapi/v3/category/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getCategoryRefs('mock-uuid'),
        url: `mock-host/webapi/v3/category/references/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getCategoryRefs('mock-uuid', 'Decision'),
        url: `mock-host/webapi/v3/category/references/mock-uuid?type=Decision`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getCertStoreItems('keystore'),
        url: `mock-host/webapi/v3/certificate/list/keystore`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getClusterStatus(),
        url: `mock-host/webapi/v3/server/cluster`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getConfigChildren('mock-uuid'),
        url: `mock-host/webapi/v3/config/children?uuid=mock-uuid&maxDeep=0`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getConfigChildren('mock-uuid', 1),
        url: `mock-host/webapi/v3/config/children?uuid=mock-uuid&maxDeep=1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getConfigItem('mock-uuid'),
        url: `mock-host/webapi/v3/config/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getConfigPath('mock-uuid'),
        url: `mock-host/webapi/v3/config/path/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-response' },
        expectedResponse: 'mock-response'
      },
      {
        fn: () => serviceInstance.getConnectedClients(),
        url: `mock-host/webapi/v3/server/list/clientInformation?showAll=true`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getConnectedClients(false),
        url: `mock-host/webapi/v3/server/list/clientInformation?showAll=false`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getCurrentUser(),
        url: `mock-host/webapi/v3/currentUser`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getCurrentUsersPermissions(),
        url: `mock-host/webapi/v3/users/currentUser/permissions`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getCurrentUsersRoles(),
        url: `mock-host/webapi/v3/users/currentUser/roles`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getDevices(),
        url: `mock-host/webapi/v3/server/list/devices`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getDevices(true),
        url: `mock-host/webapi/v3/server/list/devices?withImages=true`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getJndiDatabaseStructure(),
        url: `mock-host/webapi/v3/server/db/listAttributes/System?isNativeCall=true`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: SystemNativeJndiDef,
        expectedResponse: SystemJndiDefResponse
      },
      {
        fn: () => serviceInstance.getJndiDatabaseStructure('custdb', false),
        url: `mock-host/webapi/v3/server/db/listAttributes/custdb?isNativeCall=false`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: SystemJndiDef,
        expectedResponse: SystemJndiDefResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getJndiConnectionNames(),
        url: `mock-host/webapi/v3/server/db/listJNDI`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getJob(1),
        url: `mock-host/webapi/v3/jobs/1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithId
      },
      {
        fn: () => serviceInstance.getJobDir(),
        url: `mock-host/webapi/v3/server/jobsDir`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-dir' },
        expectedResponse: 'mock-dir'
      },
      {
        fn: () => serviceInstance.getJobDir(1),
        url: `mock-host/webapi/v3/server/jobsDir?jobId=1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-dir/1' },
        expectedResponse: 'mock-dir/1',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getJobType('mock-uuid'),
        url: `mock-host/webapi/v3/jobtype/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithId
      },
      {
        fn: () => serviceInstance.getJobTypes(),
        url: `mock-host/webapi/v3/jobtype/list`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: {
          children: [
            { uuid: 'mock-uuid1', title: 'mock-title1' },
            { uuid: 'mock-uuid2', title: 'mock-title2', category: {} },
            { uuid: 'mock-uuid3', title: 'mock-title3', category: { uuid: null } },
            { uuid: 'mock-uuid4', title: 'mock-title4', category: { uuid: 'mock-cat-uuid' } }
          ]
        },
        expectedResponse: [
          { uuid: 'mock-uuid1', title: 'mock-title1' },
          { uuid: 'mock-uuid2', title: 'mock-title2', category: null },
          { uuid: 'mock-uuid3', title: 'mock-title3', category: null },
          { uuid: 'mock-uuid4', title: 'mock-title4', category: { uuid: 'mock-cat-uuid' } }
        ]
      },
      {
        fn: () => serviceInstance.getJobs(),
        url: `mock-host/webapi/v3/jobs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
      },
      {
        fn: () => serviceInstance.getJobs({ limit: 100, offset: 10, orderby: 'id', search: 'foo' }),
        url: `mock-host/webapi/v3/jobs?limit=100&offset=10&orderby=id&search=foo`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getNamedSystemsForConfigPath('mock-/foo'),
        url: `mock-host/webapi/v3/server/configuredSystems?elementPath=${encodeURIComponent('mock-/foo')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getPermissions(),
        url: `mock-host/webapi/v3/permissions`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getPermissionSets(),
        url: `mock-host/webapi/v3/permissionsets`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getPsetChildren('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/children?uuid=mock-uuid&maxDeep=0`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getPsetChildren('mock-uuid', 1),
        url: `mock-host/webapi/v3/parameterset/children?uuid=mock-uuid&maxDeep=1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getPsetItem('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getPsetPath('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/path/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-response' },
        expectedResponse: 'mock-response'
      },
      {
        fn: () => serviceInstance.getRoles(),
        url: `mock-host/webapi/v3/roles`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getServerInformation(),
        url: `mock-host/webapi/v3/server/list/information`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getServerProperties(),
        url: `mock-host/webapi/v3/server/properties`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getSyslogEntries({}),
        url: `mock-host/webapi/v3/syslogs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
      },
      {
        fn: () => serviceInstance.getSyslogEntries({ limit: 100, offset: 10, orderby: 'id', search: 'foo' }),
        url: `mock-host/webapi/v3/syslogs?limit=100&offset=10&orderby=id&search=foo`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getSyslogEntry(1),
        url: `mock-host/webapi/v3/syslogs/1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getSyslogHostnames(),
        url: `mock-host/webapi/v3/syslogs/hostNames`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { result: [{ "col-1": "mock-1" }, { "col-1": "mock-2" }] },
        expectedResponse: ['mock-1', 'mock-2'],
      },
      {
        fn: () => serviceInstance.getUserlogEntries({}),
        url: `mock-host/webapi/v3/userlogs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
      },
      {
        fn: () => serviceInstance.getUserlogEntries({ limit: 100, offset: 10, orderby: 'id', search: 'foo' }),
        url: `mock-host/webapi/v3/userlogs?limit=100&offset=10&orderby=id&search=foo`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getUserlogEntry(1),
        url: `mock-host/webapi/v3/userlogs/1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getUsers(),
        url: `mock-host/webapi/v3/users`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getWorkflows({}),
        url: `mock-host/webapi/v3/workflows`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getWorkflows({ limit: 100, offset: 10, orderby: 'id', search: 'foo' }),
        url: `mock-host/webapi/v3/workflows?limit=100&offset=10&orderby=id&search=foo`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.getWorkflowExecution('mock-/uuid'),
        url: `mock-host/webapi/v3/workflows/execute/${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getWorkflowExecutions(),
        url: `mock-host/webapi/v3/workflows/execute`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
      {
        fn: () => serviceInstance.getWorkflowModel('mock-/uuid'),
        url: `mock-host/webapi/v3/workflow/${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.getWorkflowReferences('mock-/uuid'),
        url: `mock-host/webapi/v3/workflows/checkReferences?uuid=${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children
      },
    ])
    flush();
  }));

  it('should throw console error in method getJndiDatabaseStructure()', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/server/db/listAttributes/custdb?isNativeCall=false`;
    spyOn(console, 'error');
    testCustomValidation(
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