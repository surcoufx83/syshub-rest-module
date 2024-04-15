import { RestService, SearchParams } from './rest.service';
import { Settings } from '../settings';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpStatusCode } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { StatusNotExpectedError, UnauthorizedError, NetworkError, MissingScopeError, NotLoggedinError, UnexpectedContentError, ArgumentError } from '../error';
import { Token } from '../session';
import { SyshubCategory, SyshubJob, SyshubJobToPatch, SyshubSyslogEntryToCreate, SyshubUserlogEntryToCreate } from '../types';

describe('RestService', () => {

  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  const mockSettings = {
    host: 'mock-host/',
    useBasicAuth: true,
    useOAuth: false,
    basic: {
      username: 'mock-username',
      password: 'mock-password',
      provider: 'mock-provider',
    },
    options: {
      useEtags: true
    },
  };

  const mockOauthSettings = {
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
      useEtags: true
    },
  };

  const mockOauthSettingsPublicOnly = {
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
      useEtags: true
    },
  };

  const mockOauthSettingsPrivateOnly = {
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
      useEtags: true
    },
  };

  let subs: Subscription[] = [];

  const mockLoggedInLocalStorage = {
    accessToken: 'mock-accessToken',
    expiresIn: 2591999,
    grantTime: new Date(),
    granted: true,
    refreshToken: 'mock-refreshToken',
    username: 'mock-accessToken',
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
    localStorage.removeItem('authmod-etags');
    subs.forEach((sub) => sub.unsubscribe());
    subs = [];
  });

  function testGenericMethod(params: { fn: Function, url: string, method: string, expectedRequestBody: any, sendResponse: any, sendHeader?: { [key: string]: string } | undefined, expectedResponse?: any, expectedHeaders?: { [key: string]: string | null }, status?: HttpStatusCode, statusText?: string, includeErrorTests?: boolean, includeNotModified?: boolean }[]) {
    let payload: any;
    let sub: Subscription;
    params.forEach((param) => {
      let subject = (<Observable<any>>param.fn());
      expect(subject).withContext(`testGenericMethod: Return type of ${param.fn} should be instanceOf Subject<Response>`).toBeInstanceOf(Subject<Response>);
      sub = subject.subscribe((subject_payload) => payload = subject_payload);
      let request = httpTestingController.expectOne(param.url, `testGenericMethod: Url check ${param.fn}`);
      expect(request.request.method).withContext(`testGenericMethod: Check request method for ${param.fn}`).toEqual(param.method);
      expect(request.request.body).withContext(`testGenericMethod: Check request body for ${param.fn}`).toEqual(param.expectedRequestBody);
      if (param.expectedHeaders) {
        Object.keys(param.expectedHeaders).forEach((key) => {
          expect(request.request.headers.get(key)).withContext(`testGenericMethod: Check request header ${key}`).toEqual(param.expectedHeaders![key]);
        });
      }
      request.flush(param.sendResponse, { status: param.status ?? HttpStatusCode.Ok, statusText: param.statusText ?? 'Ok', headers: param.sendHeader });
      tick(10);
      if (param.expectedResponse instanceof Error) {
        expect(payload).withContext(`testGenericMethod: Check processed payload type for ${param.fn}`).toBeInstanceOf(param.expectedResponse.constructor);
        expect(payload).withContext(`testGenericMethod: Check processed payload content for ${param.fn}`).toEqual(param.expectedResponse ?? param.sendResponse);
      }
      else
        expect(payload).withContext(`testGenericMethod: Check processed payload for ${param.fn}`).toEqual(param.expectedResponse ?? param.sendResponse);
      sub?.unsubscribe();
      payload = undefined;
      if (param.includeErrorTests !== false) {
        testNetworkError(param.fn(), param.url);
        testStatusNotExpectedError(param.fn(), param.url);
      }
      if (param.includeNotModified === true)
        testNotModifiedError(param.fn(), param.url);
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
  };

  function testNetworkError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: 0, statusText: '' });
    expect(payload).withContext('testNetworkError: Match returned content').toBeInstanceOf(NetworkError);
  };

  function testNotLoggedinError(params: { serviceInstance: RestService, fn: Function, }[]): void {
    let payload: any;
    let sub: Subscription;
    params.forEach((param) => {
      sub = (<Observable<any>>param.fn()).subscribe((subject_payload) => payload = subject_payload);
      expect(param.serviceInstance.getIsLoggedIn()).withContext(`testUnauthorizedError: Logged in state for ${param.fn}`).toBeFalse();
      tick(10);
      expect(payload ? payload['status'] : null).withContext(`testUnauthorizedError: Return code for ${param.fn}`).toEqual(401);
      sub?.unsubscribe();
      payload = undefined;
    });
  };

  function testNotModifiedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.NotModified, statusText: 'Not Modified' });
    expect(payload).withContext('testNotModifiedError: Match returned content').toEqual(304);
  };

  function testStatusNotExpectedError(subject: Observable<any>, expectUrl: string): void {
    let payload: any;
    subs.push(subject.subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Url called');
    request.flush(null, { status: HttpStatusCode.NotFound, statusText: 'Not Found' });
    expect(payload).withContext('testStatusNotExpectedError: Match returned content').toBeInstanceOf(StatusNotExpectedError);
  };

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
  };

  function testCustomValidation(subject: any, expectUrl: string, expectRequestMethod: string, expectedRequestBody: any, sendResponse: any, sendHeader: { [key: string]: string } | undefined, expectedResponse: any, status: HttpStatusCode, statusText: string): void {
    let payload: any;
    expect(subject).withContext('Valid request: Return type should be instanceOf Subject<Response>').toBeInstanceOf(Subject<Response>);
    subs.push((<Subject<Response>>subject).subscribe((subject_payload) => payload = subject_payload));
    let request = httpTestingController.expectOne(expectUrl, 'Valid request: Expected url called');
    expect(request.request.method).withContext('Valid request: Match request method').toEqual(expectRequestMethod);
    expect(request.request.body).withContext('Valid request: Match request body').toEqual(expectedRequestBody);
    request.flush(sendResponse, { status: status, statusText: statusText, headers: sendHeader });
    expect(payload).withContext('Valid request: Match returned content').toEqual(expectedResponse);
  };

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
    let testvalue = JSON.parse(localStorage.getItem('authmod-session') ?? '{}');
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

  it('should throw error when trying to login with basic auth', fakeAsync(() => {
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    expect(() => serviceInstance.login('', '')).withContext('Logging in with basic auth').toThrow(new Error('Method login not allowed for basic authentication'));
    flush();
  }));

  it('should load etags from cache', () => {
    localStorage.setItem('authmod-etags', JSON.stringify({ 'foo': 'bar' }));
    const serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    expect(serviceInstance).toBeTruthy();
  });

  it('should remove etags if not in use', () => {
    localStorage.setItem('authmod-etags', JSON.stringify({ 'foo': 'bar' }));
    let tempsettings = <Settings><any>{ ...mockSettings };
    tempsettings.options.useEtags = false;
    const serviceInstance: RestService = new RestService(tempsettings, httpClient);
    expect(serviceInstance).toBeTruthy();
    expect(localStorage.getItem('authmod-etags')).withContext('Etag to be removed from localStorage').toBeNull();
  });

  it('should handle login correct', fakeAsync(() => {
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    let payload: any;
    let sub = (<Observable<boolean | null | HttpErrorResponse>>serviceInstance.login('mock-user', 'mock-password')).subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webauth/oauth/token`, `Called url: serviceInstance.login('mock-user', 'mock-password')`);
    expect(request.request.method).withContext('Request method').toEqual('POST');
    expect(request.request.body).withContext('Request body').toEqual('grant_type=password&username=mock-user&password=mock-password&scope=private+public&client_id=mock-clientId&client_secret=mock-clientSecret');
    request.flush({ access_token: 'mock-access_token', expires_in: 3600, refresh_token: 'mock-refresh_token', scope: 'private+public' }, { status: HttpStatusCode.Ok, statusText: 'Ok' });
    tick(10);
    let storage: any = localStorage.getItem('authmod-session');
    expect(storage == null).withContext('Session data set after login response').toBeFalse();
    if (storage != null) {
      storage = JSON.parse(storage);
      expect(storage['accessToken']).withContext('Session data check accessToken').toEqual('mock-access_token');
      expect(storage['refreshToken']).withContext('Session data check refreshToken').toEqual('mock-refresh_token');
      expect(storage['expiresIn']).withContext('Session data check expiresIn').toEqual(3600);
    }
    expect(payload).withContext('Method to return true in subject').toBeTrue();
    sub.unsubscribe();
    flush();
  }));

  it('should handle login error correct', fakeAsync(() => {
    const serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    let payload: any;
    let sub = (<Observable<boolean | null | HttpErrorResponse>>serviceInstance.login('mock-user', 'mock-password')).subscribe((subject_payload) => payload = subject_payload);
    let request = httpTestingController.expectOne(`mock-host/webauth/oauth/token`, `Called url: serviceInstance.login('mock-user', 'mock-password')`);
    expect(request.request.method).withContext('Request method').toEqual('POST');
    expect(request.request.body).withContext('Request body').toEqual('grant_type=password&username=mock-user&password=mock-password&scope=private+public&client_id=mock-clientId&client_secret=mock-clientSecret');
    request.flush({}, { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' });
    tick(10);
    let storage: any = localStorage.getItem('authmod-session');
    expect(storage).withContext('Session data empty after failed login response').toBeNull();
    expect(payload).withContext('Method to return error object in subject').toBeInstanceOf(HttpErrorResponse);
    sub.unsubscribe();
    flush();
  }));

  it('should return error if not loggedin for all generic methods like get() or head()', fakeAsync(() => {
    const testEndpoint = 'mock-endpoint';
    let serviceInstance: RestService = new RestService(<Settings><any>mockOauthSettings, httpClient);
    testNotLoggedinError([
      { serviceInstance: serviceInstance, fn: () => serviceInstance.delete(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.deletec(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.get(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.getc(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.head(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.headc(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.options(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.optionsc(testEndpoint) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.patch(testEndpoint, {}) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.patchc(testEndpoint, {}) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.post(testEndpoint, {}) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.postc(testEndpoint, {}) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.put(testEndpoint, {}) },
      { serviceInstance: serviceInstance, fn: () => serviceInstance.putc(testEndpoint, {}) },
    ]);
    let tempsettings = <any>{ ...mockOauthSettings };
    tempsettings.throwErrors = true;
    serviceInstance = new RestService(<Settings><any>tempsettings, httpClient);
    expect(() => serviceInstance.delete(testEndpoint)).withContext('Should throw an error if enabled').toThrow(new NotLoggedinError());
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
      () => serviceInstance.getWorkflowStartpoints(''),
      () => serviceInstance.getWorkflowVersions(''),
      () => serviceInstance.searchConfig({ name: 'mock' }),
      () => serviceInstance.searchPSet({ name: 'mock' }),
    ]);
    let tempsettings = <any>{ ...mockOauthSettingsPublicOnly };
    tempsettings.throwErrors = true;
    serviceInstance = new RestService(<Settings><any>tempsettings, httpClient);
    expect(() => serviceInstance.getCategory('')).withContext('Should throw an error if enabled').toThrow(new MissingScopeError('private'));
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
      () => serviceInstance.patchJob(1, <SyshubJobToPatch><any>{}),
      () => serviceInstance.replaceJob(1, <SyshubJobToPatch><any>{}),
      () => serviceInstance.restoreSyshub('', []),
      () => serviceInstance.runConsoleCommand('', []),
      () => serviceInstance.runConsoleCommandHelp(),
      () => serviceInstance.runConsoleCommandMem(),
      () => serviceInstance.runConsoleCommandP(),
      () => serviceInstance.runWorkflow(''),
      () => serviceInstance.runWorkflowAlias('', {}),
      () => serviceInstance.uploadFileToJob(1, 'ticket', new File([''], 'mock-file.pdf'), 'mock-file.pdf'),
    ]);
    let tempsettings = <any>{ ...mockOauthSettingsPrivateOnly };
    tempsettings.throwErrors = true;
    serviceInstance = new RestService(<Settings><any>tempsettings, httpClient);
    expect(() => serviceInstance.getBackupMetadata('')).withContext('Should throw an error if enabled').toThrow(new MissingScopeError('public'));
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
      [() => serviceInstance.delete('category'), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.deletec('category'), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.deleteCategory(''), 'mock-host/webapi/v3/category/'],
      [() => serviceInstance.deleteConfigItem(''), 'mock-host/webapi/v3/config/'],
      [() => serviceInstance.deleteJob(1), 'mock-host/webapi/v3/jobs/1'],
      [() => serviceInstance.deletePSetItem(''), 'mock-host/webapi/v3/parameterset/'],
      [() => serviceInstance.get('category'), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
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
      [() => serviceInstance.getWorkflowStartpoints(''), 'mock-host/webapi/v3/server/startPoint/list/'],
      [() => serviceInstance.getWorkflowVersions(''), 'mock-host/webapi/v3/workflows//versions'],
      [() => serviceInstance.head('category'), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.headc('category'), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.options('category'), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.optionsc('category'), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.patch('category', {}), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.patchc('category', {}), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.patchJob(1, {}), 'mock-host/webapi/v3/jobs/1'],
      [() => serviceInstance.post('category', {}), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.postc('category', {}), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.put('category', {}), 'mock-host/webapi/v3/category', { content: null, status: 401 }],
      [() => serviceInstance.putc('category', {}), 'mock-host/webapi/custom/category', { content: null, status: 401 }],
      [() => serviceInstance.replaceJob(1, {}), 'mock-host/webapi/v3/jobs/1'],
      [() => serviceInstance.restoreSyshub('', []), 'mock-host/webapi/v3/backuprestore/restore?folder='],
      [() => serviceInstance.runConsoleCommand('', []), 'mock-host/webapi/v3/consolecommands/execute/'],
      [() => serviceInstance.runConsoleCommandHelp(), 'mock-host/webapi/v3/consolecommands/execute/HELP'],
      [() => serviceInstance.runConsoleCommandMem(), 'mock-host/webapi/v3/consolecommands/execute/MEM'],
      [() => serviceInstance.runConsoleCommandP(), 'mock-host/webapi/v3/consolecommands/execute/P'],
      [() => serviceInstance.runWorkflow(''), 'mock-host/webapi/v3/workflows/execute'],
      [() => serviceInstance.searchConfig({ name: 'mock' }), 'mock-host/webapi/v3/config?name=mock'],
      [() => serviceInstance.searchPSet({ name: 'mock' }), 'mock-host/webapi/v3/parameterset?name=mock'],
      [() => serviceInstance.uploadFileToJob(1, 'ticket', new File([''], 'mock-file.pdf'), 'mock-file.pdf'), 'mock-host/webapi/v3/jobs/1/uploadFile?type=ticket'],
    ])
    flush();
  }));

  it('should handle etag cache correct', fakeAsync(() => {
    localStorage.setItem('authmod-etags', JSON.stringify({ 'foo': 'bar' }));
    let tempsettings = <Settings><any>{ ...mockSettings };
    tempsettings.options.useEtags = true;
    const serviceInstance: RestService = new RestService(tempsettings, httpClient);
    testGenericMethod([{
      fn: () => serviceInstance.get('category'),
      url: `mock-host/webapi/v3/category`, method: 'GET',
      expectedRequestBody: null,
      sendResponse: { mock: 'foo' },
      sendHeader: { 'etag': 'mock-etag' },
      expectedResponse: { content: { mock: 'foo' }, etag: 'mock-etag', header: {}, status: 200 },
      includeErrorTests: false
    }]);
    expect(JSON.parse(localStorage.getItem('authmod-etags') || '{}')).withContext('Correct etag cache set').toEqual(<any>{ foo: 'bar', category: 'mock-etag' });
  }));

  it('should handle etag cached request correct', fakeAsync(() => {
    localStorage.setItem('authmod-etags', JSON.stringify({ 'category': 'mock-etag' }));
    let tempsettings = <Settings><any>{ ...mockSettings };
    tempsettings.options.useEtags = true;
    const serviceInstance: RestService = new RestService(tempsettings, httpClient);
    testGenericMethod([{
      fn: () => serviceInstance.get('category'),
      url: `mock-host/webapi/v3/category`, method: 'GET',
      expectedRequestBody: null,
      expectedHeaders: { 'If-None-Match': 'mock-etag' },
      sendResponse: null,
      status: HttpStatusCode.NotModified,
      expectedResponse: { content: null, status: 304 },
      includeErrorTests: false
    }, {
      fn: () => serviceInstance.get('category', undefined, true),
      url: `mock-host/webapi/v3/category`, method: 'GET',
      expectedRequestBody: null,
      expectedHeaders: { 'If-None-Match': null },
      sendResponse: { mock: 'foo' },
      expectedResponse: { content: { mock: 'foo' }, etag: undefined, header: {}, status: 200 },
      includeErrorTests: false
    }, {
      fn: () => serviceInstance.get('category', undefined, false, 'abc'),
      url: `mock-host/webapi/v3/category`, method: 'GET',
      expectedRequestBody: null,
      expectedHeaders: { 'If-None-Match': 'abc' },
      sendResponse: null,
      status: HttpStatusCode.NotModified,
      expectedResponse: { content: null, status: 304 },
      includeErrorTests: false
    }]);
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
        fn: () => serviceInstance.delete('category'),
        url: `mock-host/webapi/v3/category`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
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
        fn: () => serviceInstance.get('category'),
        url: `mock-host/webapi/v3/category`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getCategories(),
        url: `mock-host/webapi/v3/category/list`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray,
        expectedResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getCategory('mock-uuid'),
        url: `mock-host/webapi/v3/category/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getCategoryRefs('mock-uuid'),
        url: `mock-host/webapi/v3/category/references/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getClusterStatus(),
        url: `mock-host/webapi/v3/server/cluster`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getConfigChildren('mock-uuid'),
        url: `mock-host/webapi/v3/config/children?uuid=mock-uuid&maxDeep=0`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getConfigPath('mock-uuid'),
        url: `mock-host/webapi/v3/config/path/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-response' },
        expectedResponse: 'mock-response',
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getConnectedClients(),
        url: `mock-host/webapi/v3/server/list/clientInformation?showAll=true`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getCurrentUsersPermissions(),
        url: `mock-host/webapi/v3/users/currentUser/permissions`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getCurrentUsersRoles(),
        url: `mock-host/webapi/v3/users/currentUser/roles`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getDevices(),
        url: `mock-host/webapi/v3/server/list/devices`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        expectedResponse: SystemJndiDefResponse,
        includeNotModified: true
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
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getJob(1),
        url: `mock-host/webapi/v3/jobs/1`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithId,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getJobDir(),
        url: `mock-host/webapi/v3/server/jobsDir`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-dir' },
        expectedResponse: 'mock-dir',
        includeNotModified: true
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
        sendResponse: simpleObjectWithId,
        includeNotModified: true
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
        ],
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getJobs(),
        url: `mock-host/webapi/v3/jobs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeNotModified: true
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
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getPermissions(),
        url: `mock-host/webapi/v3/permissions`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getPermissionSets(),
        url: `mock-host/webapi/v3/permissionsets`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getPsetChildren('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/children?uuid=mock-uuid&maxDeep=0`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getPsetPath('mock-uuid'),
        url: `mock-host/webapi/v3/parameterset/path/mock-uuid`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { value: 'mock-response' },
        expectedResponse: 'mock-response',
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getRoles(),
        url: `mock-host/webapi/v3/roles`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getServerInformation(),
        url: `mock-host/webapi/v3/server/list/information`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getServerProperties(),
        url: `mock-host/webapi/v3/server/properties`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getSyslogEntries({}),
        url: `mock-host/webapi/v3/syslogs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getSyslogHostnames(),
        url: `mock-host/webapi/v3/syslogs/hostNames`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { result: [{ 'col-1': 'mock-1' }, { 'col-1': 'mock-2' }] },
        expectedResponse: ['mock-1', 'mock-2'],
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getUserlogEntries({}),
        url: `mock-host/webapi/v3/userlogs`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { mock: 'mock-item' },
        sendHeader: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' },
        expectedResponse: { content: { mock: 'mock-item' }, header: { Abs_count: '1024', Highest_Id: '815', Last: '815', Next: '1', First: '0', Previous: '-1' } },
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getUsers(),
        url: `mock-host/webapi/v3/users`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflows({}),
        url: `mock-host/webapi/v3/workflows`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
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
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflowExecutions(),
        url: `mock-host/webapi/v3/workflows/execute`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflowModel('mock-/uuid'),
        url: `mock-host/webapi/v3/workflow/${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflowReferences('mock-/uuid'),
        url: `mock-host/webapi/v3/workflows/checkReferences?uuid=${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflowStartpoints('mock-/uuid'),
        url: `mock-host/webapi/v3/server/startPoint/list/${encodeURIComponent('mock-/uuid')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: ['mock-1', 'mock-2'],
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.getWorkflowVersions('mock-/uuid'),
        url: `mock-host/webapi/v3/workflows/${encodeURIComponent('mock-/uuid')}/versions`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        includeNotModified: true
      },
      {
        fn: () => serviceInstance.head('category'),
        url: `mock-host/webapi/v3/category`, method: 'HEAD',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.headc('category'),
        url: `mock-host/webapi/custom/category`, method: 'HEAD',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.options('category'),
        url: `mock-host/webapi/v3/category`, method: 'OPTIONS',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.optionsc('category'),
        url: `mock-host/webapi/custom/category`, method: 'OPTIONS',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.patch('category', simpleObjectWithId),
        url: `mock-host/webapi/v3/category`, method: 'PATCH',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.patchc('category', simpleObjectWithId),
        url: `mock-host/webapi/custom/category`, method: 'PATCH',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.patchJob(1, <SyshubJobToPatch><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/jobs/1`, method: 'PATCH',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.post('category', simpleObjectWithId),
        url: `mock-host/webapi/v3/category`, method: 'POST',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.postc('category', simpleObjectWithId),
        url: `mock-host/webapi/custom/category`, method: 'POST',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.put('category', simpleObjectWithId),
        url: `mock-host/webapi/v3/category`, method: 'PUT',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.putc('category', simpleObjectWithId),
        url: `mock-host/webapi/custom/category`, method: 'PUT',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr,
        expectedResponse: simpleCustomResponse,
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.replaceJob(1, <SyshubJobToPatch><any>simpleObjectWithId),
        url: `mock-host/webapi/v3/jobs/1`, method: 'PUT',
        expectedRequestBody: simpleObjectWithId,
        sendResponse: simpleObjectWithStr
      },
      {
        fn: () => serviceInstance.restoreSyshub('mock-/folder', ['mock-opt1', 'mock-opt2']),
        url: `mock-host/webapi/v3/backuprestore/restore?folder=${encodeURIComponent('mock-/folder')}`, method: 'POST',
        expectedRequestBody: { BACKUPTYPES: ['mock-opt1', 'mock-opt2'] },
        sendResponse: simpleSuccessResponse,
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.runConsoleCommand('foo/', ['mock-opt1', 'mock-opt2']),
        url: `mock-host/webapi/v3/consolecommands/execute/${encodeURIComponent('foo/')}`, method: 'POST',
        expectedRequestBody: ['mock-opt1', 'mock-opt2'],
        sendResponse: ['mock-1', 'mock-2'],
        status: HttpStatusCode.Accepted, statusText: 'Accepted'
      },
      {
        fn: () => serviceInstance.runConsoleCommandHelp(),
        url: `mock-host/webapi/v3/consolecommands/execute/HELP`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          'Available commands:',
          '',
          '',
          'AR\t\tList,acquires, removes or releases acquired semaphore resources',
          'ADDINDEX\tAdd new index in the Lucene',
          'BACKUP\t\tBackup system data to XML files',
          'BACKUPJOBS\tBackup job entries to a XML file in the backup dir',
          'CWFP\t\tCancel a running WorkflowProcessor by its id after the @',
          'CLL\t\tChange the level of a logger',
          'CI\t\tCommands to get information regarding cluster load and manage some distributed objects',
          'CRONCMD\t\tCron Command: start, stop or restart a SchedulerCron task.',
          'DB\t\tDisplay table statistics',
          'DIAG\t\tCreates a diag zip-file',
          'EXPORTPPK\tExport a package to a PPK or CEL file.',
          'MEMGC\t\tRun the Garbage collector to free unused memory',
        ],
        expectedResponse: {
          'AR': 'List,acquires, removes or releases acquired semaphore resources',
          'ADDINDEX': 'Add new index in the Lucene',
          'BACKUP': 'Backup system data to XML files',
          'BACKUPJOBS': 'Backup job entries to a XML file in the backup dir',
          'CWFP': 'Cancel a running WorkflowProcessor by its id after the @',
          'CLL': 'Change the level of a logger',
          'CI': 'Commands to get information regarding cluster load and manage some distributed objects',
          'CRONCMD': 'Cron Command: start, stop or restart a SchedulerCron task.',
          'DB': 'Display table statistics',
          'DIAG': 'Creates a diag zip-file',
          'EXPORTPPK': 'Export a package to a PPK or CEL file.',
          'MEMGC': 'Run the Garbage collector to free unused memory'
        },
        status: HttpStatusCode.Accepted, statusText: 'Accepted'
      },
      {
        fn: () => serviceInstance.runConsoleCommandHelp(),
        url: `mock-host/webapi/v3/consolecommands/execute/HELP`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: ['mock-1'],
        expectedResponse: new UnexpectedContentError(['mock-1']),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandHelp(),
        url: `mock-host/webapi/v3/consolecommands/execute/HELP`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [null, 'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6', 'mock-7', 'mock-8', 'mock-9'],
        expectedResponse: new UnexpectedContentError([null, 'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6', 'mock-7', 'mock-8', 'mock-9']),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandHelp(),
        url: `mock-host/webapi/v3/consolecommands/execute/HELP`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [null, 'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6', 'mock-7', 'mock-8', 'mock-9'],
        expectedResponse: new UnexpectedContentError([null, 'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6', 'mock-7', 'mock-8', 'mock-9']),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandMem(),
        url: `mock-host/webapi/v3/consolecommands/execute/MEM`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          'Memory statistics:',
          '',
          'Free :\t299.233.456',
          'Max  :\t2.147.483.648',
          'Total:\t536.870.912',
          '',
          'CPUs:\t8',
          'Disk free[kb]:\t15.606.972'
        ],
        expectedResponse: {
          'Cpus': 8,
          'DiskFree': 15606972,
          'DiskFreeUnit': 'kb',
          'Free': 299233456,
          'Max': 2147483648,
          'Total': 536870912
        },
        status: HttpStatusCode.Accepted, statusText: 'Accepted'
      },
      {
        fn: () => serviceInstance.runConsoleCommandMem(),
        url: `mock-host/webapi/v3/consolecommands/execute/MEM`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: ['mock-1'],
        expectedResponse: new UnexpectedContentError(['mock-1']),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandMem(),
        url: `mock-host/webapi/v3/consolecommands/execute/MEM`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          'statistics:',
          '',
          'Free :\t299.233.456',
          'Max  :\t2.147.483.648',
          'Total:\t536.870.912',
          '',
          'CPUs:\t8',
          'Disk free[kb]:\t15.606.972'
        ],
        expectedResponse: new UnexpectedContentError([
          'statistics:',
          '',
          'Free :\t299.233.456',
          'Max  :\t2.147.483.648',
          'Total:\t536.870.912',
          '',
          'CPUs:\t8',
          'Disk free[kb]:\t15.606.972'
        ]),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandMem(),
        url: `mock-host/webapi/v3/consolecommands/execute/MEM`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          'Memory statistics:',
          '',
          'Foo :\t299.233.456',
          'Mock  :\t2.147.483.648',
          'Total:\t536.870.912',
          '',
          'CPUs:\t8',
          'Disk free[kb]:\t15.606.972'
        ],
        expectedResponse: new UnexpectedContentError([
          'Memory statistics:',
          '',
          'Foo :\t299.233.456',
          'Mock  :\t2.147.483.648',
          'Total:\t536.870.912',
          '',
          'CPUs:\t8',
          'Disk free[kb]:\t15.606.972'
        ]),
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandP(),
        url: `mock-host/webapi/v3/consolecommands/execute/P`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          "Class;Jobprocessorname;Thread;Starttime;FirstInstance?;WorkflowUUID;CurrentElement;OS ProcID;CancelFlag;JobID;Host"
        ],
        expectedResponse: [],
        status: HttpStatusCode.Accepted, statusText: 'Accepted'
      },
      {
        fn: () => serviceInstance.runConsoleCommandP(),
        url: `mock-host/webapi/v3/consolecommands/execute/P`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          "Class;Jobprocessorname;Thread;Starttime;FirstInstance?;WorkflowUUID;CurrentElement;OS ProcID;CancelFlag;JobID;Host",
          "com.oce.workflow.runtime.LicenseControlledWorkflowProcessor@6d1b392e;Default;Thread[JOBPROCESSOR_Default,9,main];76100156104400;true;c0a8f28986bc16d88186bc96d87d0000;Sleep;-;UNKNOWN;63445;DESKTOP-QNE4EIJ"
        ],
        expectedResponse: [
          {
            "Class": "com.oce.workflow.runtime.LicenseControlledWorkflowProcessor@6d1b392e",
            "Jobprocessorname": "Default",
            "Thread": "Thread[JOBPROCESSOR_Default,9,main]",
            "Starttime": 76100156104400,
            "FirstInstance": true,
            "WorkflowUUID": "c0a8f28986bc16d88186bc96d87d0000",
            "CurrentElement": "Sleep",
            "OSProcID": null,
            "CancelFlag": "UNKNOWN",
            "JobID": 63445,
            "Host": "DESKTOP-QNE4EIJ"
          }
        ],
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runConsoleCommandP(),
        url: `mock-host/webapi/v3/consolecommands/execute/P`, method: 'POST',
        expectedRequestBody: [],
        sendResponse: [
          "Class;Jobprocessorname;Thread;Starttime;FirstInstance?;WorkflowUUID;CurrentElement;OS ProcID;CancelFlag;JobID;Host",
          "com.oce.workflow.runtime.LicenseControlledWorkflowProcessor@6d1b392e;Default;Thread[JOBPROCESSOR_Default,9,main];76100156104400;false;c0a8f28986bc16d88186bc96d87d0000;Sleep;1234;UNKNOWN;-;DESKTOP-QNE4EIJ"
        ],
        expectedResponse: [
          {
            "Class": "com.oce.workflow.runtime.LicenseControlledWorkflowProcessor@6d1b392e",
            "Jobprocessorname": "Default",
            "Thread": "Thread[JOBPROCESSOR_Default,9,main]",
            "Starttime": 76100156104400,
            "FirstInstance": false,
            "WorkflowUUID": "c0a8f28986bc16d88186bc96d87d0000",
            "CurrentElement": "Sleep",
            "OSProcID": 1234,
            "CancelFlag": "UNKNOWN",
            "JobID": null,
            "Host": "DESKTOP-QNE4EIJ"
          }
        ],
        status: HttpStatusCode.Accepted, statusText: 'Accepted',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runWorkflow('mock-uuid'),
        url: `mock-host/webapi/v3/workflows/execute`, method: 'POST',
        expectedRequestBody: { async: true, workflowUuid: 'mock-uuid' },
        sendResponse: null,
        sendHeader: { 'Location': 'mock-ref' },
        expectedResponse: ['mock-ref', 201],
        status: HttpStatusCode.Created, statusText: 'Created'
      },
      {
        fn: () => serviceInstance.runWorkflow('mock-uuid', false, 1024),
        url: `mock-host/webapi/v3/workflows/execute`, method: 'POST',
        expectedRequestBody: { async: false, jobId: 1024, workflowUuid: 'mock-uuid' },
        sendResponse: null,
        sendHeader: { 'Location': 'mock-ref' },
        expectedResponse: ['mock-ref', 201],
        status: HttpStatusCode.Created, statusText: 'Created',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runWorkflowAlias('mock-alias', { mock: 'foo' }),
        url: `mock-host/webapi/v3/workflows/execute/alias/mock-alias`, method: 'POST',
        expectedRequestBody: { mock: 'foo' },
        sendResponse: { test: 'mock' },
        expectedResponse: { content: { test: 'mock' }, etag: undefined, header: Object({}), status: 200 },
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runWorkflowAlias('mock-alias', { mock: 'foo' }, 'DELETE'),
        url: `mock-host/webapi/v3/workflows/execute/alias/mock-alias`, method: 'DELETE',
        expectedRequestBody: null,
        sendResponse: { test: 'mock' },
        expectedResponse: { content: { test: 'mock' }, etag: undefined, header: Object({}), status: 200 },
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runWorkflowAlias('mock-alias', { mock: 'foo' }, 'GET'),
        url: `mock-host/webapi/v3/workflows/execute/alias/mock-alias`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: { test: 'mock' },
        expectedResponse: { content: { test: 'mock' }, etag: undefined, header: Object({}), status: 200 },
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.runWorkflowAlias('mock-alias', { mock: 'foo' }, 'PUT'),
        url: `mock-host/webapi/v3/workflows/execute/alias/mock-alias`, method: 'PUT',
        expectedRequestBody: { mock: 'foo' },
        sendResponse: { test: 'mock' },
        expectedResponse: { content: { test: 'mock' }, etag: undefined, header: Object({}), status: 200 },
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.searchConfig({ 'name': 'mock-/name' }),
        url: `mock-host/webapi/v3/config?name=${encodeURIComponent('mock-/name')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        status: HttpStatusCode.Ok, statusText: 'Ok'
      },
      {
        fn: () => serviceInstance.searchConfig({ 'name': 'mock-/name', description: 'mock-desc', value: 'value' }),
        url: `mock-host/webapi/v3/config?description=${encodeURIComponent('mock-desc')}&name=${encodeURIComponent('mock-/name')}&value=${encodeURIComponent('value')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.searchPSet({ 'name': 'mock-/name' }),
        url: `mock-host/webapi/v3/parameterset?name=${encodeURIComponent('mock-/name')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        status: HttpStatusCode.Ok, statusText: 'Ok'
      },
      {
        fn: () => serviceInstance.searchPSet({ 'name': 'mock-/name', description: 'mock-desc', value: 'value' }),
        url: `mock-host/webapi/v3/parameterset?description=${encodeURIComponent('mock-desc')}&name=${encodeURIComponent('mock-/name')}&value=${encodeURIComponent('value')}`, method: 'GET',
        expectedRequestBody: null,
        sendResponse: simpleObjectWithChildrenArray.children,
        status: HttpStatusCode.Ok, statusText: 'Ok',
        includeErrorTests: false
      },
      {
        fn: () => serviceInstance.uploadFileToJob(1, 'ticket', new File([''], 'mock-file.pdf'), 'mock-file.pdf'),
        url: `mock-host/webapi/v3/jobs/1/uploadFile?type=${encodeURIComponent('ticket')}`, method: 'POST',
        expectedRequestBody: new FormData(),
        sendResponse: true,
        status: HttpStatusCode.Created, statusText: 'Created'
      },
    ]);
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
      [{ text: 'mock-tableName', node: [{ text: 'foo' }] }],
      undefined,
      [{ name: 'mock-tableName', columns: [] }],
      HttpStatusCode.Ok, 'Ok'
    );
    expect(console.error).withContext('Console receives error message').toHaveBeenCalledWith('Unable to match table column definition for column foo in table mock-tableName');
    flush();
  }));

  it('should throw console error in method runConsoleCommandHelp()', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    let testurl = `mock-host/webapi/v3/consolecommands/execute/HELP`;
    spyOn(console, 'error');
    testCustomValidation(
      serviceInstance.runConsoleCommandHelp(),
      testurl,
      'POST',
      [],
      ['Available commands:',
        'cmd1\t\tCommand 1 is the best',
        'cmd2\t\tCommand 2 is the best',
        'cmd3\t\tCommand 3 is the best',
        'cmd4\t\tCommand 4 is the best',
        'cmd5\t\tCommand 5 is the best',
        'cmd6\t\tCommand 6 is the best',
        'cmd7\t\tCommand 7 is the best',
        'cmd8\t\tCommand 8 is the best',
        'cmd-failes',
      ],
      undefined,
      {
        cmd1: 'Command 1 is the best',
        cmd2: 'Command 2 is the best',
        cmd3: 'Command 3 is the best',
        cmd4: 'Command 4 is the best',
        cmd5: 'Command 5 is the best',
        cmd6: 'Command 6 is the best',
        cmd7: 'Command 7 is the best',
        cmd8: 'Command 8 is the best',
      },
      HttpStatusCode.Accepted, 'Accepted'
    );
    expect(console.error).withContext('Console receives error message').toHaveBeenCalledWith('Unexpected content in line 10: cmd-failes');
    flush();
  }));

  it('should throw error in method searchConfig()', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    expect(() => serviceInstance.searchConfig({})).withContext('searchConfig() with empty search settins').toThrow(new ArgumentError('Search configuration must contain at least one of the properties not undefined.', 'search', {}));
    expect(() => serviceInstance.searchConfig({ name: '', description: '', value: '' })).withContext('searchConfig() with empty search settins').toThrow(new ArgumentError('Search configuration must contain at least one of the properties not empty.', 'search', { name: '', description: '', value: '' }));
    flush();
  }));

  it('should throw error in method searchPSet()', fakeAsync(() => {
    let serviceInstance: RestService = new RestService(<Settings><any>mockSettings, httpClient);
    expect(() => serviceInstance.searchPSet({})).withContext('searchPSet() with empty search settins').toThrow(new ArgumentError('Search configuration must contain at least one of the properties not undefined.', 'search', {}));
    expect(() => serviceInstance.searchPSet({ name: '', description: '', value: '' })).withContext('searchPSet() with empty search settins').toThrow(new ArgumentError('Search configuration must contain at least one of the properties not empty.', 'search', { name: '', description: '', value: '' }));
    flush();
  }));

});

export const SystemJndiDef = [
  {
    'text': 'config',
    'node': [
      {
        'text': 'uuid:varchar'
      },
      {
        'text': 'modifiedby:varchar'
      },
      {
        'text': 'modifiedtime:datetime2'
      },
      {
        'text': 'config_name:varchar'
      },
      {
        'text': 'config_type:int'
      },
      {
        'text': 'config_value:varchar'
      },
      {
        'text': 'description:varchar'
      },
      {
        'text': 'parentuuid:varchar'
      }
    ]
  },
  {
    'text': 'filestatus',
    'node': [
      {
        'text': 'id:bigint identity'
      },
      {
        'text': 'jobid:bigint'
      },
      {
        'text': 'sourcejobid:bigint'
      },
      {
        'text': 'packageid:bigint'
      },
      {
        'text': 'status:int'
      },
      {
        'text': 'textstatus:varchar'
      },
      {
        'text': 'filename:varchar'
      },
      {
        'text': 'filetype:varchar'
      },
      {
        'text': 'datatype:varchar'
      },
      {
        'text': 'application:varchar'
      },
      {
        'text': 'host:varchar'
      },
      {
        'text': 'xid:varchar'
      },
      {
        'text': 'pages:int'
      },
      {
        'text': 'documents:int'
      },
      {
        'text': 'prpages:int'
      },
      {
        'text': 'customfield:varchar'
      },
      {
        'text': 'customfield1:varchar'
      },
      {
        'text': 'customfield2:varchar'
      },
      {
        'text': 'customfield3:varchar'
      },
      {
        'text': 'customfield4:varchar'
      },
      {
        'text': 'modifiedby:varchar'
      },
      {
        'text': 'modifiedtime:datetime2'
      },
      {
        'text': 'customdata:varbinary'
      },
      {
        'text': 'deldate:datetime2'
      }
    ]
  },
];

export const SystemNativeJndiDef = [
  {
    'text': 'config',
    'node': [
      {
        'text': 'uuid:varchar'
      },
      {
        'text': 'modifiedby:varchar'
      },
      {
        'text': 'modifiedtime:datetime2'
      },
      {
        'text': 'config_name:varchar'
      },
      {
        'text': 'config_type:int'
      },
      {
        'text': 'config_value:varchar'
      },
      {
        'text': 'description:varchar'
      },
      {
        'text': 'parentuuid:varchar'
      }
    ]
  },
  {
    'text': 'filestatus',
    'node': [
      {
        'text': 'id:bigint identity'
      },
      {
        'text': 'jobid:bigint'
      },
      {
        'text': 'sourcejobid:bigint'
      },
      {
        'text': 'packageid:bigint'
      },
      {
        'text': 'status:int'
      },
      {
        'text': 'textstatus:varchar'
      },
      {
        'text': 'filename:varchar'
      },
      {
        'text': 'filetype:varchar'
      },
      {
        'text': 'datatype:varchar'
      },
      {
        'text': 'application:varchar'
      },
      {
        'text': 'host:varchar'
      },
      {
        'text': 'xid:varchar'
      },
      {
        'text': 'pages:int'
      },
      {
        'text': 'documents:int'
      },
      {
        'text': 'prpages:int'
      },
      {
        'text': 'customfield:varchar'
      },
      {
        'text': 'customfield1:varchar'
      },
      {
        'text': 'customfield2:varchar'
      },
      {
        'text': 'customfield3:varchar'
      },
      {
        'text': 'customfield4:varchar'
      },
      {
        'text': 'modifiedby:varchar'
      },
      {
        'text': 'modifiedtime:datetime2'
      },
      {
        'text': 'customdata:varbinary'
      },
      {
        'text': 'deldate:datetime2'
      }
    ]
  },
];

export const SystemJndiDefResponse = [
  {
    'name': 'config',
    'columns': [
      {
        'name': 'uuid',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'modifiedby',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'modifiedtime',
        'datatype': 'datetime2',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'config_name',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'config_type',
        'datatype': 'int',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'config_value',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'description',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'parentuuid',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      }
    ]
  },
  {
    'name': 'filestatus',
    'columns': [
      {
        'name': 'id',
        'datatype': 'bigint',
        'isIdColumn': true,
        'isUnique': false
      },
      {
        'name': 'jobid',
        'datatype': 'bigint',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'sourcejobid',
        'datatype': 'bigint',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'packageid',
        'datatype': 'bigint',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'status',
        'datatype': 'int',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'textstatus',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'filename',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'filetype',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'datatype',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'application',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'host',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'xid',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'pages',
        'datatype': 'int',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'documents',
        'datatype': 'int',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'prpages',
        'datatype': 'int',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customfield',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customfield1',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customfield2',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customfield3',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customfield4',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'modifiedby',
        'datatype': 'varchar',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'modifiedtime',
        'datatype': 'datetime2',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'customdata',
        'datatype': 'varbinary',
        'isIdColumn': false,
        'isUnique': false
      },
      {
        'name': 'deldate',
        'datatype': 'datetime2',
        'isIdColumn': false,
        'isUnique': false
      }
    ]
  }
];