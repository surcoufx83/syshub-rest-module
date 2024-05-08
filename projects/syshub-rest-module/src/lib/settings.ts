
export class Settings {

    private authtype?: 'ApiKey' | 'Basic' | 'OAuth';
    private valid$: boolean = false;
    private validScopes: string[] = [];

    constructor(private settings: ApikeyRestSettings | BasicRestSettings | OAuthRestSettings) {
        this.validate();
        this.valid$ = true;
    }

    public get any(): ApikeyRestSettings | BasicRestSettings | OAuthRestSettings {
        return this.settings;
    }

    public get apikey(): string | null {
        return this.authtype == 'ApiKey' ? (<ApikeyRestSettings>this.settings).apiKey : null;
    }

    public get apiprovider(): string | null {
        return this.authtype == 'ApiKey' ? (<ApikeyRestSettings>this.settings).provider : null;
    }

    public get basic(): BasicConnectionSettings | null {
        return this.authtype == 'Basic' ? (<BasicRestSettings>this.settings).basic : null;
    }

    /**
     * Tests whether the authentication setting allows `private` or `public` scope requests.
     * @param scope The scope required, either `public` or `private`
     * @returns true|false whether access is allowed.
     */
    public hasValidScope(scope: 'public' | 'private'): boolean {
        return this.validScopes.includes(scope);
    }

    public get host(): string {
        return this.settings.host;
    }

    public get oauth(): OAuthConnectionSettings | null {
        return this.authtype == 'OAuth' ? (<OAuthRestSettings>this.settings).oauth : null;
    }

    public get options(): RestOptionsSettings {
        return this.settings.options!;
    }

    public get throwErrors(): boolean {
        return this.settings.throwErrors!;
    }

    public get useApiKeyAuth(): boolean {
        return this.authtype == 'ApiKey';
    }

    public get useBasicAuth(): boolean {
        return this.authtype == 'Basic';
    }

    public get useOAuth(): boolean {
        return this.authtype == 'OAuth';
    }

    public get valid(): boolean {
        return this.valid$;
    }

    public get version(): SyshubVersion {
        return this.settings.version!;
    }

    private validate(): void {
        // Check - settings must not be undefined or null 
        if (!this.settings || this.settings == undefined || this.settings == null)
            throw new Error('E1 - Provided settings for REST API module are undefined or null.');

        // Check that either basic or oauth exists
        if (!Object.keys(this.settings).includes('basic') && !Object.keys(this.settings).includes('oauth') && !Object.keys(this.settings).includes('apiKey'))
            throw new Error('E2 - Missing \'basic\', \'oauth\' or \'apiKey\' property in REST API settings.');

        this.authtype =
            Object.keys(this.settings).includes('basic') ? 'Basic' :
                Object.keys(this.settings).includes('oauth') ? 'OAuth' :
                    'ApiKey';

        // Check 2 - sysHUB host must never be empty or undefined
        if (this.settings.host == undefined || this.settings.host == null || this.settings.host == '')
            throw new Error('E3 - Missing \'host\' property in REST API settings.');

        // Assign default server version
        if (this.settings.version == undefined)
            this.settings.version = SyshubVersion.DEFAULT;

        // add trailing / to hostname if missing in config
        if (!this.settings.host.endsWith('/'))
            this.settings.host = `${this.settings.host}/`;

        // Rest API prefix cosmos- if older syshub version
        if (this.settings.version == SyshubVersion.sysHUB_2021)
            this.settings.host = `${this.settings.host}cosmos-`;

        if (this.authtype === 'Basic')
            this.validateBasicAuth(<BasicRestSettings>this.settings);

        else if (this.authtype === 'OAuth')
            this.validateOAuth(<OAuthRestSettings>this.settings);

        else
            this.validateApikeyAuth(<ApikeyRestSettings>this.settings);

        // Create default options if not set
        if (this.settings.options == undefined)
            this.settings.options = { autoConnect: true, autoLogoutOn401: true, useEtags: true };

        // Create default options.autoConnect if not set
        if (this.settings.options.autoConnect == undefined)
            this.settings.options.autoConnect = true;

        // Create default options.autoLogoutOn401 if not set
        if (this.settings.options.autoLogoutOn401 == undefined)
            this.settings.options.autoLogoutOn401 = true;

        // Default options.useEtags = true if not set
        if (this.settings.options.useEtags == undefined)
            this.settings.options.useEtags = true;

        // Default throwErrors = false if not set
        if (this.settings.throwErrors == undefined)
            this.settings.throwErrors = false;
    }

    private validateApikeyAuth(settings: ApikeyRestSettings): void {

        // Check API Key not empty
        if (!settings.apiKey || settings.apiKey == '')
            throw new Error('E12 - \'apiKey\' property must not be empty.');

        // Check auth provider not empty
        if (!settings.provider || settings.provider == '')
            throw new Error('E13 - \'provider\' property must not be empty when using API key authentication.');

        // Force scope = public
        settings.scope = 'public';

        // As API key auth is available before 2024 it will throw an error if an earlier version is defined
        if (!settings.version || settings.version < SyshubVersion.sysHUB_2024)
            throw new Error('E14 - API key authentication must not be used before sysHUB Server 2024. If server version is correct, make sure to add it as `version = 4` to the config/environment file.');

        this.validScopes = ['public'];

    }

    private validateBasicAuth(settings: BasicRestSettings): void {

        // Checks for enabled basic auth
        if (!settings.basic || settings.basic.enabled !== true)
            throw new Error('E4 - \'basic.enabled\' property must be set as enabled in REST API settings.');

        if (settings.basic.requiresLogin === true) {
            // Ignore username and password by overwriting it with blank strings.
            settings.basic.username = '';
            settings.basic.password = '';
        }
        else {

            // Check - Username must be set and not empty
            if (settings.basic.username == undefined || settings.basic.username == null)
                throw new Error('E5 - Missing \'basic.username\' property in REST API settings.');

            // Check - Password must be set and not empty
            if (settings.basic.password == undefined || settings.basic.password == null)
                throw new Error('E6 - Missing \'basic.password\' property in REST API settings.');

            if (settings.basic.username === '' && settings.basic.password === '') {
                // Set requiresLogin to true as username and password are empty
                settings.basic.requiresLogin = true;
            }
            else if (settings.basic.username === '' || settings.basic.password === '') {
                // Check - Username or password empty? Error
                throw new Error('E7 - \'basic.username\' or \'basic.password\' property empty in REST API settings.');
            }
            else {
                // Username and password set -> no login required
                settings.basic.requiresLogin = false;
            }

        }

        // Check - Provider must be set and not empty
        if (settings.basic.provider == undefined || settings.basic.provider == null || settings.basic.provider == '')
            throw new Error('E8 - Missing \'basic.provider\' property in REST API settings.');

        // Set default public scope
        if (!settings.basic.scope)
            settings.basic.scope = 'public';

        this.validScopes = settings.basic.scope.split('+');

    }

    private validateOAuth(settings: OAuthRestSettings): void {
        // Checks for enabled oauth
        if (!settings.oauth || settings.oauth.enabled !== true)
            throw new Error('E9 - \'oauth.enabled\' property must be set as enabled in REST API settings.');

        // Check - clientId must be set and not empty
        if (settings.oauth.clientId == undefined || settings.oauth.clientId == null || settings.oauth.clientId == '')
            throw new Error('E10 - Missing \'oauth.clientId\' property in REST API settings.');

        // Check - clientSecret must be set and not empty
        if (settings.oauth.clientSecret == undefined || settings.oauth.clientSecret == null || settings.oauth.clientSecret == '')
            throw new Error('E11 - Missing \'oauth.clientSecret\' property in REST API settings.');

        // If scope is not set use default public
        if (settings.oauth.scope == undefined || settings.oauth.scope == null)
            settings.oauth.scope = 'public';

        // If storeKey is not set use default value
        if (settings.oauth.storeKey == undefined || settings.oauth.storeKey == null)
            settings.oauth.storeKey = 'authmod-session';

        this.validScopes = settings.oauth.scope.split('+');
    }

}

/**
 * Configuration interface for the sysHUB Rest API Service using basic authentication.
 */
export type ApikeyRestSettings = {
    /**
     * **host**: Required property; Must contain a valid url to the sysHUB server and may contain a custom port.
     * Example: `/` or `http://localhost:8088/`
     */
    host: string;

    /**
     * **version**: Optional property; Used to configure your sysHUB Server version to handle breaking changes of REST API.
     * The default value is 2022 and newer.
     */
    version?: SyshubVersion;

    /**
     * **apiKey**: Configures the API key for authentication using API keys. Make sure to configure one 
     * in the API-Server / API-Key mapping form of the webclient. You must set a mapped user and also referer 
     * (e.g. `http://localhost;https://localhost`). Make sure to also copy the name of the Api key into a new
     * authentication provider.
     */
    apiKey: string;

    /**
     * **provider**: Configures the API Server provider for authentication using API keys. Make sure to configure one 
     * in the API-Server / Authentication Provider form of the webclient. The scope must be set to public as private is not
     * allowed. Add the API Key name in the field API-Key Authentication.
     */
    provider: string;

    /**
     * **options**: Optional property; Used to configure more options for the Rest Service.
     */
    options?: RestOptionsSettings;

    /**
     * **oauth.scope**: Optional property; Configures the auth server scope and must match the settings in sysHub.
     * In case of API key authentication, *public* is the only valid option.
     */
    scope?: 'public';

    /**
     * **throwErrors**: Optional property, default false; If true the connector will throw exceptions when user is not loggedin or wrong scope is configured. If false the call will be send to the Rest API and sysHUB will reply with an error.
     */
    throwErrors?: boolean;
};

/**
 * Configuration interface for the sysHUB Rest API Service using basic authentication.
 */
export type BasicRestSettings = {
    /**
     * **host**: Required property; Must contain a valid url to the sysHUB server and may contain a custom port.
     * Example: `/` or `http://localhost:8088/`
     */
    host: string;

    /**
     * **version**: Optional property; Used to configure your sysHUB Server version to handle breaking changes of REST API.
     * The default value is 2022 and newer.
     */
    version?: SyshubVersion;

    /**
     * **basic**: Contains the connection parameters.
     */
    basic: BasicConnectionSettings;

    /**
     * **options**: Optional property; Used to configure more options for the Rest Service.
     */
    options?: RestOptionsSettings;

    /**
     * **throwErrors**: Optional property, default false; If true the connector will throw exceptions when user is not loggedin or wrong scope is configured. If false the call will be send to the Rest API and sysHUB will reply with an error.
     */
    throwErrors?: boolean;
};

export type BasicConnectionSettings = {
    /**
     * **basic.enabled**: Required property; Determines, whether basic authentication is enabled.
     */
    enabled: true;

    /**
     * **basic.requiresLogin**: Optional property; If this is set to true the calling application
     * must use the login() method to define the username and password for basic authentication.
     * **basic.username** and **basic.password** from the configuration will be ignored. The login
     * credentials will be stored in local or session storage.
     */
    requiresLogin?: boolean;

    /**
     * **basic.username**: Configures the user for basic authentication.
     */
    username: string;

    /**
     * **basic.password**: Configures the password for basic authentication.
     */
    password: string;

    /**
     * **basic.provider**: Configures the API Server provider for basic authentication.
     */
    provider: string;

    /**
     * **basic.scope**: Optional property; Configures the auth server scope and must match the settings in sysHub.
     * Allowed values: *private*, *public*, *private+public* or *public+private*, Default: *public*
     */
    scope?: 'private' | 'public' | 'private+public' | 'public+private';
};

/**
 * Configuration interface for the sysHUB Rest API Service using OAuth authentication.
 */
export type OAuthRestSettings = {
    /**
     * **host**: Required property; Must contain a valid url to the sysHUB server and may contain a custom port.
     * Example: `/` or `http://localhost:8088/`
     */
    host: string;

    /**
     * **version**: Optional property; Used to configure your sysHUB Server version to handle breaking changes of REST API.
     * The default value is 2022 and newer.
     */
    version?: SyshubVersion;

    /**
     * **oauth**: Contains the connection parameters.
     */
    oauth: OAuthConnectionSettings;

    /**
     * **options**: Optional property; Used to configure more options for the Rest Service.
     */
    options?: RestOptionsSettings;

    /**
     * **throwErrors**: Optional property, default false; If true the connector will throw exceptions when user is not loggedin or wrong scope is configured. If false the call will be send to the Rest API and sysHUB will reply with an error.
     */
    throwErrors?: boolean;
};

export type OAuthConnectionSettings = {
    /**
     * **oauth.enabled**: Required property; Determines, whether OAuth authentication is enabled.
     */
    enabled: true;

    /**
     * **oauth.clientId**: Configures the auth server Client Id.
     */
    clientId: string;

    /**
     * **oauth.clientSecret**: Configures the auth server Client Secret.
     */
    clientSecret: string;

    /**
     * **oauth.scope**: Optional property; Configures the auth server scope and must match the settings in sysHub.
     * Allowed values: *private*, *public*, *private+public* or *public+private*, Default: *public*
     */
    scope?: 'private' | 'public' | 'private+public' | 'public+private';

    /**
     * **oauth.storeKey**: Optional property; The key that is used to store the login token in the browser storage.
     * Default: *authmod-session*
     */
    storeKey?: string;
};

export type RestOptionsSettings = {
    /**
     * **options.autoConnect**: Not yet implemented.
     */
    autoConnect?: boolean;

    /**
     * **options.autoLogoutOn401**: If true, the Rest service will delete the token automatically if the sysHUB Server returns an HTTP Status 401.
     * Default: *true*
     */
    autoLogoutOn401?: boolean;

    /**
     * **options.autoLogoutTimer**: Not yet implemented.
     */
    autoLogoutTimer?: number;

    /**
     * **options.useEtags**: If true, the Rest service uses the etag-based cache mechanism from sysHUB server. If entities have not been changed, response will be HTTP status 304/Not modified with content = `null`.
     * As the `Etag` header is not announced correct prior to 2024 it may or may not work.
     * Default: *true*
     */
    useEtags?: boolean;
};

/**
 * Enumeration to differentiate sysHUB Server version. As there have been breaking changes in the sysHUB REST API
 * the connector module must know the correct version. Default is 2022 (and newer).
 */
export enum SyshubVersion {
    sysHUB_2021 = 1,
    sysHUB_2022 = 2,
    sysHUB_2023 = 3,
    sysHUB_2024 = 4,
    DEFAULT = sysHUB_2023,
};
