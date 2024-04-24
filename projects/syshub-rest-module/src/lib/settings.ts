
export class Settings {

    private isbasic: boolean = true;
    private valid$: boolean = false;

    constructor(private settings: BasicRestSettings | OAuthRestSettings) {
        this.validate();
        this.valid$ = true;
    }

    public get any(): BasicRestSettings | OAuthRestSettings {
        return this.settings;
    }

    public get basic(): BasicConnectionSettings | null {
        return this.isbasic ? (<BasicRestSettings>this.settings).basic : null;
    }

    public get host(): string {
        return this.settings.host;
    }

    public get oauth(): OAuthConnectionSettings | null {
        return !this.isbasic ? (<OAuthRestSettings>this.settings).oauth : null;
    }

    public get options(): RestOptionsSettings {
        return this.settings.options!;
    }

    public get throwErrors(): boolean {
        return this.settings.throwErrors!;
    }

    public get useBasicAuth(): boolean {
        return this.isbasic;
    }

    public get useOAuth(): boolean {
        return !this.isbasic;
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
        if (!Object.keys(this.settings).includes('basic') && !Object.keys(this.settings).includes('oauth'))
            throw new Error('E2 - Missing \'basic\' or \'oauth\' property in REST API settings.');

        this.isbasic = Object.keys(this.settings).includes('basic');

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

        if (this.isbasic)
            this.validateBasicAuth(<BasicRestSettings>this.settings);

        else
            this.validateOAuth(<OAuthRestSettings>this.settings);

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

    private validateBasicAuth(settings: BasicRestSettings): void {

        // Checks for enabled basic auth
        if (settings.basic.enabled !== true)
            throw new Error('E4 - \'basic.enabled\' property must be set as enabled in REST API settings.');

        // Check - Username must be set and not empty
        if (settings.basic.username == undefined || settings.basic.username == null || settings.basic.username == '')
            throw new Error('E5 - Missing \'basic.username\' property in REST API settings.');

        // Check - Password must be set and not empty
        if (settings.basic.password == undefined || settings.basic.password == null || settings.basic.password == '')
            throw new Error('E6 - Missing \'basic.password\' property in REST API settings.');

        // Check - Provider must be set and not empty
        if (settings.basic.provider == undefined || settings.basic.provider == null || settings.basic.provider == '')
            throw new Error('E7 - Missing \'basic.provider\' property in REST API settings.');

    }

    private validateOAuth(settings: OAuthRestSettings): void {
        // Checks for enabled oauth
        if (settings.oauth.enabled !== true)
            throw new Error('E8 - \'basic.enabled\' property must be set as enabled in REST API settings.');

        // Check - clientId must be set and not empty
        if (settings.oauth.clientId == undefined || settings.oauth.clientId == null || settings.oauth.clientId == '')
            throw new Error('E9 - Missing \'oauth.clientId\' property in REST API settings.');

        // Check - clientSecret must be set and not empty
        if (settings.oauth.clientSecret == undefined || settings.oauth.clientSecret == null || settings.oauth.clientSecret == '')
            throw new Error('E10 - Missing \'oauth.clientSecret\' property in REST API settings.');

        // If scope is not set use default public
        if (settings.oauth.scope == undefined || settings.oauth.scope == null)
            settings.oauth.scope = 'public';

        // If storeKey is not set use default value
        if (settings.oauth.storeKey == undefined || settings.oauth.storeKey == null)
            settings.oauth.storeKey = 'authmod-session';
    }

}

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
}

export type BasicConnectionSettings = {
    /**
     * **basic.enabled**: Required property; Determines, whether basic authentication is enabled.
     */
    enabled: true;

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
}

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
}

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
}
