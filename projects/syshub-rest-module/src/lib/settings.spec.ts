import { ApikeyRestSettings, BasicRestSettings, OAuthRestSettings, Settings, SyshubVersion } from './settings';

describe('Settings', () => {

  let mockApikey: ApikeyRestSettings = {
    host: 'https://mock-host/',
    apiKey: 'mock-key',
    provider: 'mock-provider',
    version: SyshubVersion.sysHUB_2024
  };

  let mockBasic: BasicRestSettings = {
    host: 'https://mock-host/',
    basic: {
      enabled: true,
      username: 'mock-username',
      password: 'mock-password',
      provider: 'mock-provider'
    }
  };

  let mockOAuth: OAuthRestSettings = {
    host: 'https://mock-host/',
    oauth: {
      enabled: true,
      clientId: 'mock-clientId',
      clientSecret: 'mock-clientSecret',
    }
  };

  it('should create an instance', () => {
    expect(() => new Settings(mockBasic)).toBeTruthy();
  });

  it('should throw error if nothing provided', () => {
    expect(() => new Settings(<any>(null))).toThrowError(/^E1.*/);
  });

  it('should throw error if missing basic, oauth and apikey', () => {
    expect(() => new Settings(<any>{})).toThrowError(/^E2.*/);
  });

  it('should throw error if missing host', () => {
    expect(() => new Settings(<any>{ basic: {} })).toThrowError(/^E3.*/);
  });

  it('should throw error if basic.enabled is missing', () => {
    expect(() => new Settings(<any>{ host: 'foo', basic: {} })).toThrowError(/^E4.*/);
  });

  it('should throw error if basic.username is missing or empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true } })).toThrowError(/^E5.*/);
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: null } })).toThrowError(/^E5.*/);
  });

  it('should throw error if basic.password is missing or empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo' } })).toThrowError(/^E6.*/);
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo', password: null } })).toThrowError(/^E6.*/);
  });

  it('should throw error if basic.provider is missing or empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo', password: 'foo' } })).toThrowError(/^E8.*/);
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo', password: 'foo', provider: null } })).toThrowError(/^E8.*/);
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo', password: 'foo', provider: '' } })).toThrowError(/^E8.*/);
  });

  it('should clear username and password if requiresLogin', () => {
    const validateObj: BasicRestSettings = {
      host: 'https://mock-host/',
      version: SyshubVersion.DEFAULT,
      basic: { enabled: true, username: 'mock-username', password: 'mock-password', provider: 'mock-provider', requiresLogin: true },
      options: { autoConnect: true, autoLogoutOn401: true, useEtags: true },
      throwErrors: false,
    };
    const settingsInstance = new Settings(validateObj);
    expect(settingsInstance.basic?.requiresLogin).toBeTrue();
    expect(settingsInstance.basic?.username).toEqual('');
    expect(settingsInstance.basic?.password).toEqual('');
  });

  it('should set requiresLogin if username and password empty', () => {
    const validateObj: BasicRestSettings = {
      host: 'https://mock-host/',
      version: SyshubVersion.DEFAULT,
      basic: { enabled: true, username: '', password: '', provider: 'mock-provider', requiresLogin: false },
      options: { autoConnect: true, autoLogoutOn401: true, useEtags: true },
      throwErrors: false,
    };
    const settingsInstance = new Settings(validateObj);
    expect(settingsInstance.basic?.requiresLogin).toBeTrue();
    expect(settingsInstance.basic?.username).toEqual('');
    expect(settingsInstance.basic?.password).toEqual('');
  });

  it('should throw an error if username or password empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: 'foo', password: '' } })).toThrowError(/^E7.*/);
    expect(() => new Settings(<any>{ host: 'foo', basic: { enabled: true, username: '', password: 'bar' } })).toThrowError(/^E7.*/);
  });

  it('should throw error if oauth.enabled is missing', () => {
    expect(() => new Settings(<any>{ host: 'foo', oauth: {} })).toThrowError(/^E9.*/);
  });

  it('should throw error if oauth.clientId is missing or empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true } })).toThrowError(/^E10.*/);
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true, clientId: null } })).toThrowError(/^E10.*/);
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true, clientId: '' } })).toThrowError(/^E10.*/);
  });

  it('should throw error if oauth.clientSecret is missing or empty', () => {
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true, clientId: 'foo' } })).toThrowError(/^E11.*/);
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true, clientId: 'foo', clientSecret: null } })).toThrowError(/^E11.*/);
    expect(() => new Settings(<any>{ host: 'foo', oauth: { enabled: true, clientId: 'foo', clientSecret: '' } })).toThrowError(/^E11.*/);
  });

  it('should create an basic auth instance', () => {
    const settingsInstance = new Settings(mockBasic);
    const validateObj: BasicRestSettings = {
      host: 'https://mock-host/',
      version: SyshubVersion.DEFAULT,
      basic: { enabled: true, username: 'mock-username', password: 'mock-password', provider: 'mock-provider', requiresLogin: false, scope: 'public' },
      options: { autoConnect: true, autoLogoutOn401: true, useEtags: true },
      throwErrors: false,
    };
    expect(settingsInstance).withContext('Object created').toBeTruthy();
    expect(settingsInstance).withContext('Object instance of Settings').toBeInstanceOf(Settings);
    expect(settingsInstance.host).withContext('Host property').toEqual('https://mock-host/');
    expect(settingsInstance.options).withContext('Options property').toBeTruthy();
    expect(settingsInstance.apikey).withContext('apikey property').toBeNull();
    expect(settingsInstance.apiprovider).withContext('apiprovider property').toBeNull();
    expect(settingsInstance.basic).withContext('Basic property').toBeTruthy();
    expect(settingsInstance.oauth).withContext('OAuth property').toBeNull();
    expect(settingsInstance.basic?.enabled).withContext('Basic enabled property').toBeTruthy();
    expect(settingsInstance.basic?.username).withContext('Basic username property').toEqual('mock-username');
    expect(settingsInstance.basic?.password).withContext('Basic password property').toEqual('mock-password');
    expect(settingsInstance.basic?.provider).withContext('Basic provider property').toEqual('mock-provider');
    expect(settingsInstance.useApiKeyAuth).withContext('useApiKeyAuth property').toBeFalse();
    expect(settingsInstance.useBasicAuth).withContext('useBasicAuth property').toBeTrue();
    expect(settingsInstance.useOAuth).withContext('useOAuth property').toBeFalse();
    expect(settingsInstance.valid).withContext('valid property').toBeTrue();
    expect(settingsInstance.version).withContext('version property').toEqual(SyshubVersion.DEFAULT);
    expect(settingsInstance.any).withContext('settings property').toEqual(validateObj);
  });

  it('should create an oauth instance', () => {
    const settingsInstance = new Settings(mockOAuth);
    const validateObj: OAuthRestSettings = {
      host: 'https://mock-host/',
      version: SyshubVersion.DEFAULT,
      oauth: { enabled: true, clientId: 'mock-clientId', clientSecret: 'mock-clientSecret', scope: 'public', storeKey: 'authmod-session' },
      options: { autoConnect: true, autoLogoutOn401: true, useEtags: true },
      throwErrors: false,
    };
    expect(settingsInstance).withContext('Object created').toBeTruthy();
    expect(settingsInstance).withContext('Object instance of Settings').toBeInstanceOf(Settings);
    expect(settingsInstance.host).withContext('Host property').toEqual('https://mock-host/');
    expect(settingsInstance.options).withContext('Options property').toBeTruthy();
    expect(settingsInstance.apikey).withContext('apikey property').toBeNull();
    expect(settingsInstance.apiprovider).withContext('apiprovider property').toBeNull();
    expect(settingsInstance.oauth).withContext('OAuth property').toBeTruthy();
    expect(settingsInstance.basic).withContext('Basic property').toBeNull();
    expect(settingsInstance.oauth?.enabled).withContext('OAuth enabled property').toBeTruthy();
    expect(settingsInstance.oauth?.clientId).withContext('OAuth clientId property').toEqual('mock-clientId');
    expect(settingsInstance.oauth?.clientSecret).withContext('OAuth clientSecret property').toEqual('mock-clientSecret');
    expect(settingsInstance.oauth?.scope).withContext('OAuth scope property').toEqual('public');
    expect(settingsInstance.oauth?.storeKey).withContext('OAuth storeKey property').toEqual('authmod-session');
    expect(settingsInstance.useApiKeyAuth).withContext('useApiKeyAuth property').toBeFalse();
    expect(settingsInstance.useBasicAuth).withContext('useBasicAuth property').toBeFalse();
    expect(settingsInstance.useOAuth).withContext('useOAuth property').toBeTrue();
    expect(settingsInstance.valid).withContext('valid property').toBeTrue();
    expect(settingsInstance.version).withContext('version property').toEqual(SyshubVersion.DEFAULT);
    expect(settingsInstance.any).withContext('settings property').toEqual(validateObj);
  });

  it('should fix missing trailing / for host', () => {
    let tempbasic = { ...mockBasic };
    tempbasic.host = 'foo';
    const settingsInstance = new Settings(tempbasic);
    expect(settingsInstance.host).withContext('Host property').toEqual('foo/');
  });

  it('should append cosmos- for syshub 2021 to the host', () => {
    let tempbasic = { ...mockBasic };
    tempbasic.version = SyshubVersion.sysHUB_2021;
    const settingsInstance = new Settings(tempbasic);
    expect(settingsInstance.host).withContext('Host property').toEqual('https://mock-host/cosmos-');
  });

  it('should fix missing options', () => {
    let tempbasic = { ...mockBasic };
    tempbasic.options = {};
    const settingsInstance = new Settings(tempbasic);
    expect(settingsInstance.options.autoConnect).withContext('autoConnect property').toBeTrue();
    expect(settingsInstance.options.autoLogoutOn401).withContext('autoLogoutOn401 property').toBeTrue();
    expect(settingsInstance.options.autoLogoutTimer).withContext('autoLogoutTimer property stays undefined').toBeFalsy();
    expect(settingsInstance.throwErrors).withContext('throwErrors property').toBeFalse();
    expect(settingsInstance.basic?.scope).withContext('basic.scope property').toEqual('public');
  });

  it('should keep options if set', () => {
    let tempbasic = { ...mockBasic };
    tempbasic.basic.scope = 'private+public';
    tempbasic.options = { autoConnect: false, autoLogoutOn401: false, autoLogoutTimer: 1000 };
    tempbasic.throwErrors = true;
    const settingsInstance = new Settings(tempbasic);
    expect(settingsInstance.options.autoConnect).withContext('autoConnect property').toBeFalse();
    expect(settingsInstance.options.autoLogoutOn401).withContext('autoLogoutOn401 property').toBeFalse();
    expect(settingsInstance.options.autoLogoutTimer).withContext('autoLogoutTimer property').toEqual(1000);
    expect(settingsInstance.throwErrors).withContext('throwErrors property').toBeTrue();
    expect(settingsInstance.basic?.scope).withContext('basic.scope property').toEqual('private+public');
  });

  it('should fix missing oauth options', () => {
    const settingsInstance = new Settings(mockOAuth);
    expect(settingsInstance.oauth?.scope).withContext('scope property').toEqual('public');
    expect(settingsInstance.oauth?.storeKey).withContext('storeKey property').toEqual('authmod-session');
  });

  it('should keep oauth options if set', () => {
    let tempoauth = { ...mockOAuth };
    tempoauth.oauth.scope = 'public+private';
    tempoauth.oauth.storeKey = 'mock-storeKey'
    const settingsInstance = new Settings(tempoauth);
    expect(settingsInstance.oauth?.scope).withContext('scope property').toEqual('public+private');
    expect(settingsInstance.oauth?.storeKey).withContext('storeKey property').toEqual('mock-storeKey');
  });

  it('ApiKey / should throw error if required properties are missing', () => {
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: '' })).toThrowError(/^E12.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: null })).toThrowError(/^E12.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: 'mock-apiKey' })).toThrowError(/^E13.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: 'mock-apiKey', provider: '' })).toThrowError(/^E13.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: 'mock-apiKey', provider: null })).toThrowError(/^E13.*/);
    expect(() => new Settings(<any>{ host: 'foo', apiKey: 'mock-apiKey', provider: 'mock-provider' })).toThrowError(/^E14.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2021, apiKey: 'mock-apiKey', provider: 'mock-provider' })).toThrowError(/^E14.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2022, apiKey: 'mock-apiKey', provider: 'mock-provider' })).toThrowError(/^E14.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2023, apiKey: 'mock-apiKey', provider: 'mock-provider' })).toThrowError(/^E14.*/);
    expect(() => new Settings(<any>{ host: 'foo', version: SyshubVersion.sysHUB_2024, apiKey: 'mock-apiKey', provider: 'mock-provider' })).not.toThrowError(/^E14.*/);
  });

  it('ApiKey / should create an instance', () => {
    const settingsInstance = new Settings(mockApikey);
    const validateObj: ApikeyRestSettings = {
      host: 'https://mock-host/',
      apiKey: 'mock-key',
      provider: 'mock-provider',
      scope: 'public',
      options: { autoConnect: true, autoLogoutOn401: true, useEtags: true },
      throwErrors: false,
      version: SyshubVersion.sysHUB_2024
    };
    expect(settingsInstance).withContext('Object created').toBeTruthy();
    expect(settingsInstance).withContext('Object instance of Settings').toBeInstanceOf(Settings);
    expect(settingsInstance.host).withContext('Host property').toEqual(mockApikey.host);
    expect(settingsInstance.options).withContext('Options property').toBeTruthy();
    expect(settingsInstance.apikey).withContext('apikey property').toEqual(mockApikey.apiKey);
    expect(settingsInstance.apiprovider).withContext('apiprovider property').toEqual(mockApikey.provider);
    expect(settingsInstance.oauth).withContext('OAuth property').toBeNull();
    expect(settingsInstance.basic).withContext('Basic property').toBeNull();
    expect(settingsInstance.useApiKeyAuth).withContext('useApiKeyAuth property').toBeTrue();
    expect(settingsInstance.useBasicAuth).withContext('useBasicAuth property').toBeFalse();
    expect(settingsInstance.useOAuth).withContext('useOAuth property').toBeFalse();
    expect(settingsInstance.valid).withContext('valid property').toBeTrue();
    expect(settingsInstance.version).withContext('version property').toEqual(SyshubVersion.sysHUB_2024);
    expect(settingsInstance.any).withContext('settings property').toEqual(validateObj);
  });

});
