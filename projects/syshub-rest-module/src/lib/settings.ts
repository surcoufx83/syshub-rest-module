
export class Settings {

    private valid$: boolean = false;

    constructor(private settings: RestSettings) {
        this.validate();
        this.valid$ = true;
    }

    public get any(): RestSettings {
        return this.settings;
    }

    public get basic(): RestBasicSettings {
        return this.settings.basic!;
    }

    public get host(): string {
        return this.settings.host;
    }

    public get oauth(): RestOAuthSettings {
        return this.settings.oauth!;
    }

    public get options(): RestOptionsSettings {
        return this.settings.options!;
    }

    public get throwErrors(): boolean {
        return this.settings.throwErrors!;
    }

    public get valid(): boolean {
        return this.valid$;
    }

    public get version(): SyshubVersion {
        return this.settings.version!;
    }

    private validate(): void {
        // Check 1 - settings must not be undefined or null 
        if (this.settings == undefined || this.settings == null)
            throw new Error('E1 - Provided settings for REST API module are undefined or null.');

        // Check 2 - sysHUB host must never be empty or undefined
        if (this.settings.host == undefined || this.settings.host == null || this.settings.host == '')
            throw new Error('E2 - Missing \'host\' property in REST API settings.');

        // Assign default server version
        if (this.settings.version == undefined)
            this.settings.version = SyshubVersion.DEFAULT;

        // add trailing / to hostname if missing in config
        if (!this.settings.host.endsWith('/'))
            this.settings.host = `${this.settings.host}/`;

        // Rest API prefix cosmos- if older syshub version
        if (this.settings.version == SyshubVersion.sysHUB_2021)
            this.settings.host = `${this.settings.host}cosmos-`;

        // If basic property is missing, create it with default values
        if (this.settings.basic == undefined || this.settings.basic == null)
            this.settings.basic = { enabled: false };

        // Checks for enabled basic auth
        if (this.settings.basic.enabled === true) {

            // Check 3 - Username must be set and not empty
            if (this.settings.basic.username == undefined || this.settings.basic.username == null || this.settings.basic.username == '')
                throw new Error('E3 - Missing \'basic.username\' property in REST API settings.');

            // Check 4 - Password must be set and not empty
            if (this.settings.basic.password == undefined || this.settings.basic.password == null || this.settings.basic.password == '')
                throw new Error('E4 - Missing \'basic.password\' property in REST API settings.');

            // Check 5 - Provider must be set and not empty
            if (this.settings.basic.provider == undefined || this.settings.basic.provider == null || this.settings.basic.provider == '')
                throw new Error('E5 - Missing \'basic.provider\' property in REST API settings.');
        }

        // If oauth property is missing, create it with default values
        if (this.settings.oauth == undefined || this.settings.oauth == null)
            this.settings.oauth = { enabled: false };

        // Checks for enabled oauth
        if (this.settings.oauth.enabled) {

            // Check 6 - clientId must be set and not empty
            if (this.settings.oauth.clientId == undefined || this.settings.oauth.clientId == null || this.settings.oauth.clientId == '')
                throw new Error('E6 - Missing \'oauth.clientId\' property in REST API settings.');

            // Check 7 - clientSecret must be set and not empty
            if (this.settings.oauth.clientSecret == undefined || this.settings.oauth.clientSecret == null || this.settings.oauth.clientSecret == '')
                throw new Error('E7 - Missing \'oauth.clientSecret\' property in REST API settings.');

            // If scope is not set use default public
            if (this.settings.oauth.scope == undefined || this.settings.oauth.scope == null)
                this.settings.oauth.scope = 'public';

            // If storeKey is not set use default value
            if (this.settings.oauth.storeKey == undefined || this.settings.oauth.storeKey == null)
                this.settings.oauth.storeKey = 'authmod-session';
        }

        // Check 8 - basic and oauth must not de disabled at the same time
        if (!this.settings.basic.enabled && !this.settings.oauth.enabled)
            throw new Error('E8 - Both, basic and oauth are disabled in REST API settings. This is not supported, enable exactly one of both methods.');

        // Check 9 - basic and oauth must not be enabled at the same time
        if (this.settings.basic.enabled && this.settings.oauth.enabled)
            throw new Error('E9 - Both, basic and oauth are enabled in REST API settings. This is not supported, disable one of both methods.');

        // Create default options if not set
        if (this.settings.options == undefined)
            this.settings.options = { autoConnect: true, autoLogoutOn401: true };

        // Create default options.autoConnect if not set
        if (this.settings.options.autoConnect == undefined)
            this.settings.options.autoConnect = true;

        // Create default options.autoLogoutOn401 if not set
        if (this.settings.options.autoLogoutOn401 == undefined)
            this.settings.options.autoLogoutOn401 = true;

        // Default throwErrors = false if not set
        if (this.settings.throwErrors == undefined)
            this.settings.throwErrors = false;
    }

}

/**
 * Configuration interface for the sysHUB Rest API Service.
 * Either *basic* or *oauth* must be set!
 */
export type RestSettings = {
    /**
     * **host**: Required property; Must contain a valid url to the sysHUB server and may contain a custom port.
     * Example: http://localhost:8088/
     */
    host: string;

    /**
     * **version**: Optional property; Used to configure your sysHUB Server version to handle breaking changes of REST API.
     * The default value is 2022 and newer.
     */
    version?: SyshubVersion;

    /**
     * **basic**: Optional property; Used for setting up the basic authentication.
     */
    basic?: RestBasicSettings;

    /**
     * **oauth**: Optional property; Used for setting up the OAuth authentication.
     */
    oauth?: RestOAuthSettings;

    /**
     * **options**: Optional property; Used to configure more options for the Rest Service.
     */
    options?: RestOptionsSettings;

    /**
     * **throwErrors**: Optional property, default false; If true the connector will throw exceptions when user is not loggedin or wrong scope is configured. If false the call will be send to the Rest API and sysHUB will reply with an error.
     */
    throwErrors?: boolean;
}

export type RestBasicSettings = {
    /**
     * **basic.enabled**: Required property; Determines, whether basic authentication is enabled.
     */
    enabled: boolean;

    /**
     * **basic.username**: Required if basic auth is enabled; Configures the user for basic authentication.
     */
    username?: string;

    /**
     * **basic.password**: Required if basic auth is enabled; Configures the password for basic authentication.
     */
    password?: string;

    /**
     * **basic.provider**: Required if basic auth is enabled; Configures the API Server provider for basic authentication.
     */
    provider?: string;
}

export type RestOAuthSettings = {
    /**
     * **oauth.enabled**: Required property; Determines, whether OAuth authentication is enabled.
     */
    enabled: boolean;

    /**
     * **oauth.clientId**: Required if oauth is enabled; Configures the auth server Client Id.
     */
    clientId?: string;

    /**
     * **oauth.clientSecret**: Required if oauth is enabled; Configures the auth server Client Secret.
     */
    clientSecret?: string;

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
}

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
}

/**
 * Enumeration to differentiate sysHUB Server version. As there have been breaking changes in the sysHUB REST API
 * the connector module must know the correct version. Default is 2022 (and newer).
 */
export enum SyshubVersion {
    sysHUB_2021 = 1,
    sysHUB_2022 = 2,
    sysHUB_2023 = 3,
    DEFAULT = sysHUB_2023,
}
