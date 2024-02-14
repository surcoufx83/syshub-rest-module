/** A sysHUB object containing information about an existing backup */
export type SyshubBackupMeta = {
    'file.encoding': string;
    'file.separator': string;
    'java.class.version': string;
    'java.runtime.version': string;
    'java.version': string;
    'line.separator': string;
    'os.name': string;
    'user.language': string;
    'user.timezone': string;
    BACKUPDATE: string;
    BACKUPDESCRIPTION: string;
    BACKUPNAME: string;
    backupTypes: { [key: string]: SyshubBackupNameStateObj };
    BACKUPUSER: string;
    COMPUTERNAME: string;
    COSMOSBACKUPBATCHSIZE: string;
    COSMOSBACKUPFILEFORMAT: string;
    COSMOSBACKUPTYPE: string;
    COSMOSSERVERIP: string;
    COSMOSSERVERNAME: string;
    COSMOSVERSION: string;
    COSMOSVERSIONSVN: string;
    DATABASEDRIVERNAME: string;
    DATABASEDRIVERVERSION: string;
    DATABASENAME: string;
    DATABASEURL: string;
    DATABASEUSERNAME: string;
    DATABASEVERSION: string;
    NUMBER_OF_PROCESSORS: string;
}

/** This object is used in sysHUB backup meta informations property backup types */
export type SyshubBackupNameStateObj = {
    name: string;
    state: boolean;
}

/** An enum that contains valid keys used in backup and restore operations */
export enum SyshubBackupTypesEnum {
    CONFIG = 'CONFIG',
    CONFIGNOPACKAGE = 'CONFIGNOPACKAGE',
    CONFIGRAW = 'CONFIGRAW',
    JOB = 'JOB',
    JOBLOG = 'JOBLOG',
    JOBSELECTION = 'JOBSELECTION',
    MISC = 'MISC',
    SYSLOG = 'SYSLOG',
    USER = 'USER',
    USERLOG = 'USERLOG',
    USERTRANSPORT = 'USERTRANSPORT',
}

/** A sysHUB category object */
export type SyshubCategory = {
    description: string;
    modifiedby: string | null;
    modifiedtime: number | null;
    name: string;
    uuid: string;
}

/** A sysHUB category reference object */
export type SyshubCategoryReference = {
    description: string | null;
    name: string;
    occurrence: number;
    type: string;
}

/** This type represents the definition of an object that is returned by sysHUB Cert store operations. */
export type SyshubCertStoreItem = {
    algorithm: string | null;
    alias: string;
    certX509IssuerDN: string;
    certX509NotAfter: string;
    certX509NotBefore: string;
    certX509PrivateKey: string;
    certX509PublicKey: string;
    certX509SerialNumber: string;
    certX509SignatureAlogorithm: string;
    certX509SubjectDN: string;
    certX509Version: string;
    certificateExpiry: string;
    expired: boolean;
    fingerprintSHA1: string;
    keySize: number;
    lastModified: string;
    protected: boolean;
    subjectAlternativeName: string;
    type: number;
}

/** A sysHUB client connection object */
export type SyshubClientConnection = {
    host: string;
    id: string;
    queue: string;
    startTime: string;
    user: string;
}

/** A sysHUB category object */
export type SyshubConfigItem = {
    children: SyshubConfigItem[];
    configValue: string;
    description: string | null;
    modifiedtime: string | number | null;
    name: string;
    parent: string | null;
    type: string;
    uuid: string;
    value: string;
}

/** A sysHUB IPP device */
export type SyshubIppDevice = {
    desc: string;
    deviceState: string;
    form: string;
    /** *img*: If set its a base64 encoded image starting with `data:image/png;base64,` followed by the binary data */
    img?: string;
    inputQueueSize: number;
    internalState: string;
    location: string;
    maxInputQueueSize: number;
    monitoredJobs: number;
    name: string;
    outputQueueSize: number;
    outputThreshold: number;
    si: 'ON' | 'OFF';
    so: 'ON' | 'OFF';
    state: string;
    uri: string;
}

export type SyshubJndiTable = {
    name: string;
    columns: SyshubJndiTableColumn[];
}

export type SyshubJndiTableColumn = {
    name: string;
    datatype: string;
    isIdColumn: boolean;
    isUnique: boolean;
}

/** A sysHUB job object */
export type SyshubJob = {
    categoryName: string | null;
    client: string | null;
    customField: string | null;
    customField1: string | null;
    customField2: string | null;
    customField3: string | null;
    customField4: string | null;
    dataType: string | null;
    del: number;
    delDate: string;
    delDays: number;
    id: number;
    inputChannel: string | null;
    jobTypeName: string | null;
    jobTypeUuid: string | null;
    pages: number;
    parentId: number | null;
    priority: number;
    procCount: number;
    processingHost: string | null;
    senderHost: string | null;
    sourceFile: string | null;
    startDate: string | null;
    startPoint: string | null;
    status: number;
    submission: string | null;
    textStatus: string | null;
    ticketFile: string | null;
    title: string | null;
    userName: string | null;
    xid: string | null;
}

/** An enum containing all possible sysHUB job states */
export enum SyshubJobStatus {
    Spooling = 0,
    Received = 1,
    Classifying = 2,
    ReadyToRun = 3,
    Hold = 4,
    TimedHold = 5,
    Processed = 6,
    Processing = 7,
    RemoteProcessing = 8,
    SpoolingError = 9,
    ClassifyingError = 10,
    ProcessingError = 11,
    RemoteError = 12,
    Deleted = 13,
    Mirrored = 14,
    MirroredProcessing = 15,
    MirroredProcessed = 16,
    MirroredError = 17,
    Manually = 18,
};

/** A sysHUB job object used for patching on the server. This object may contain any property of a SyshubJob except the job id. */
export type SyshubJobToPatch = {
    categoryName?: string | null;
    client?: string | null;
    customField?: string | null;
    customField1?: string | null;
    customField2?: string | null;
    customField3?: string | null;
    customField4?: string | null;
    dataType?: string | null;
    del?: number;
    delDate?: string;
    delDays?: number;
    inputChannel?: string | null;
    jobTypeName?: string | null;
    jobTypeUuid?: string | null;
    pages?: number;
    parentId?: number | null;
    priority?: number;
    procCount?: number;
    processingHost?: string | null;
    senderHost?: string | null;
    sourceFile?: string | null;
    startDate?: string | null;
    startPoint?: string | null;
    status?: number;
    submission?: string | null;
    textStatus?: string | null;
    ticketFile?: string | null;
    title?: string | null;
    userName?: string | null;
    xid?: string | null;
}

/** A sysHUB job type object */
export type SyshubJobType = {
    category: SyshubCategory | null;
    description: string;
    name: string;
    settings: SyshubJobTypeSettings;
    uuid: string;
}

/** A sysHUB category object as dummy for job types where uuid may be null */
export type SyshubJobTypeDummyCategory = {
    description: string;
    modifiedby: string | null;
    modifiedtime: number | null;
    name: string;
    uuid: string | null;
}

/** A sysHUB job type object */
export type SyshubJobTypeSettings = {
    PropChildren?: SyshubJobTypeSettingsChild[];
    classifiedworkflowuuid: SyshubJobTypeSettingsValue;
    datatype: SyshubJobTypeSettingsValue;
    deldays: SyshubJobTypeSettingsValue;
    initialtextstatus: SyshubJobTypeSettingsValue;
    inputchannel: SyshubJobTypeSettingsValue;
    priority: SyshubJobTypeSettingsValue;
    senderhost: SyshubJobTypeSettingsValue;
    sourcefile: SyshubJobTypeSettingsValue;
    starttype: SyshubJobTypeSettingsValue;
    textstatus: SyshubJobTypeSettingsValue;
    ticketfile: SyshubJobTypeSettingsValue;
    title: SyshubJobTypeSettingsValue;
    userkey: SyshubJobTypeSettingsValue;
    username: SyshubJobTypeSettingsValue;
    workflowuuid: SyshubJobTypeSettingsValue;
    xid: SyshubJobTypeSettingsValue;
}

/** A sysHUB job type object */
export type SyshubJobTypeSettingsChild = {
    name: string;
    value: string;
}

/** A sysHUB job type object */
export type SyshubJobTypeSettingsValue = {
    value: string | number | null;
}

/** This type represents the definition of an object that is returned by sysHUB MEM console command. */
export type SyshubMemCommandResult = {
    Cpus: number;
    DiskFree: number;
    DiskFreeUnit: string;
    Free: number;
    Max: number;
    Total: number;
}

/** This type represents the definition of an object that is returned by sysHUB MEM console command. */
export type SyshubPCommandLine = {
    CancelFlag: string;
    Class: string;
    CurrentElement: string;
    FirstInstance: boolean;
    Host: string;
    JobID: number | null;
    Jobprocessorname: string;
    OSProcID: number | null;
    Starttime: number;
    Thread: string;
    WorkflowUUID: string;
}

/** sysHUB permission */
export type SyshubPermission = {
    description: string | null;
    modifiedby: string | null;
    modifiedtime: string | null;
    name: string;
    readonly: boolean;
    uuid: string;
}

/** sysHUB permissionset */
export type SyshubPermissionSet = {
    description: string | null;
    modifiedby: string | null;
    modifiedtime: string | null;
    name: string;
    permissions: string[];
    uuid: string;
}

/** A sysHUB parameterset object */
export type SyshubPSetItem = {
    children: SyshubPSetItem[];
    description: string | null;
    modifiedtime: string | number | null;
    name: string;
    parent: string | null;
    parmValue: string;
    type: string;
    uuid: string;
    value: string;
}

/** A generic sysHUB result object used for several endpoints. */
export type SyshubResponseSimple = {
    /** The name of the response object. */
    name: string;
    /** The type of the value */
    type: 'message' | 'result';
    /** Number of records contained in the backup files. */
    value: any;
}

/** sysHUB user role */
export type SyshubRole = {
    description: string | null;
    modifiedby: string | null;
    modifiedtime: string | null;
    permissionsets: string[];
    rolename: string;
    uuid: string;
}

/** A sysHUB workflow execution object containing server information */
export type SyshubServerInformation = {
    /**
     * sysHUB Version build number as string. Used to display in about-dialog of the web client.
     * For example: "231"
     */
    buildNumber: string;

    /**
     * Date and time when server software has been compiled. Used to display in about-dialog of the web client.
     * For example: "2023-02-08T03:30:16"
     */
    buildTime: string;

    /**
     * sysHUB Version year(major version) as string. Used to display in about-dialog of the web client.
     * For example: "2022"
     */
    buildYear: string;

    /**
     * Gives a boolean true or false whether the number of connected clients is within the limit of the registered license. Used to display in about-dialog of the web client.
     */
    clientCountOk: boolean;

    /**
     * SQL Server identification (available from sysHUB 2023 not in 2022).
     * For example: "Microsoft SQL Server 15.00.2101"
     */
    database?: string;

    /**
     * Main database driver for sysHUB system JNDI connection (available from sysHUB 2023 not in 2022).
     * For example: "Microsoft JDBC Driver 11.2 for SQL Server 11.2.2.0"
     */
    databaseDriver?: string;

    /**
     * Primary Ip address (available from sysHUB 2023 not in 2022).
     * For example: "192.168.242.137"
     */
    hostIpAddress?: string;

    /**
     * Hostname FQDN (available from sysHUB 2023 not in 2022).
     * For example: "DESKTOP-QNE4EIJ.local"
     */
    hostLongName?: string;

    /**
     * Hostname (available from sysHUB 2023 not in 2022).
     * For example: "DESKTOP-QNE4EIJ"
     */
    hostShortName?: string;

    /**
     * The installed Java version (available from sysHUB 2023 not in 2022).
     * For example: "17.0.3"
     */
    javaVersion?: string;

    /**
     * The installed Java runtime version (available from sysHUB 2023 not in 2022).
     * For example: "17.0.3+7"
     */
    javaRuntimeVersion?: string;

    /**
     * Encrypted JMS Broker password.
     */
    jmsBrokerPW: string;

    /**
     * Date when license expires in German date format. Used to display in about-dialog of the web client.
     * For example: "26.02.2024"
     */
    licenseExpires: string;

    /**
     * Type of the active server license. Used to display in about-dialog of the web client.
     * For example: "nfr"
     */
    licenseType: string;

    /**
     * The name of the active grid node of this server. Empty if not part of a grid environment.
     * For example: ""
     */
    nodeName: string;

    /**
     * Platform type (available from sysHUB 2023 not in 2022).
     * For example: "amd64"
     */
    osArch?: string;

    /**
     * OS name (available from sysHUB 2023 not in 2022).
     * For example: "Windows 10"
     */
    osName?: string;

    /**
     * OS version identifier (available from sysHUB 2023 not in 2022).
     * For example: "10"
     */
    osVersion?: string;

    /**
     * The name of available system/node name combinations as string array.
     * For example: ["Base"]
     */
    systemCombinations: string[];

    /**
     * The active system name for this server.
     * For example: "Base"
     */
    systemName: string;

    /**
     * sysHUB Version number as string. Used to display in about-dialog of the web client.
     * For example: "2022.2.1"
     */
    versionNumber: string;
}

/** A sysHUB syslog entry holding system logging information */
export type SyshubSyslogEntry = {
    dateTime: string;
    hostName: string;
    id: number;
    logLevel: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL';
    message: string;
}

/** A sysHUB syslog entry holding system logging information without id */
export type SyshubSyslogEntryToCreate = {
    dateTime: string;
    hostName: string;
    logLevel: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL';
    message: string;
}

/** A sysHUB user account object */
export type SyshubUserAccount = {
    /** Email address of the user */
    email: string | null;

    /** Determines whether the user account is enabled */
    enabled: boolean;

    /** Determines whether the user is forced to change his password. Although if true you are still able to use the Rest API. */
    forcechange: boolean;

    /** A string with the last login time of this user */
    lastlogintime: string | null;

    /** Username who has changed this user object */
    modified: string;

    /** A string with a timestamp when this user object has been changed last time */
    modifiedtime: string;

    /** User name */
    name: string;

    /** User password always null to not expose any credentials */
    password: null;

    /** A list of group uuids this user is member of */
    roles: string[];

    /** User account type */
    type: 'INTERNAL' | 'LDAP' | 'WINDOWS';

    /** Users unique id */
    uuid: string;
}

/** Enumeration that contains values available in `Userlog.logCategory` */
export enum SyshubUserlogCategory {
    GENERAL,
    JOBS,
    WORKFLOW,
    CONFIG,
    ADMIN,
    USER,
    CONSOLE,
    LOG,
}

/** A sysHUB userlog entry holding user related information */
export type SyshubUserlogEntry = {
    dateTime: string;
    id: number;
    logCategory: SyshubUserlogCategory;
    logLevel: SyshubUserlogLevel;
    message: string;
    modifiedBy: string;
    objectFunction: SyshubUserlogObjectFunction;
    objectName: string | null;
    objectType: string | null;
    objectUuid: string | null;
}

/** A sysHUB userlog entry holding user related information without id */
export type SyshubUserlogEntryToCreate = {
    dateTime: string;
    logCategory: SyshubUserlogCategory;
    logLevel: SyshubUserlogLevel;
    message: string;
    modifiedBy: string;
    objectFunction: SyshubUserlogObjectFunction;
    objectName: string;
    objectType: string;
    objectUuid: string;
}

/** Enumeration that contains values available in `Userlog.logLevel` */
export enum SyshubUserlogLevel {
    INFO,
    ERROR,
}

/** Enumeration that contains values available in `Userlog.objectFunction` */
export enum SyshubUserlogObjectFunction {
    GENERAL,
    ADD,
    CHANGE,
    DELETE,
    UPDATE,
}

/** A sysHUB workflow object */
export type SyshubWorkflow = {
    activatedBy: string | null;
    activatedTime: string | null;
    cacheable: 'YES' | 'NO';
    categoryName: string | null;
    description: string | null;
    flag: 'CUSTOM' | 'PROTECTED' | 'EPOS';
    format: 'VERSION1' | 'VERSION2';
    lockedByUser: string | null;
    major: string;
    majorBase: string;
    minor: string;
    minorBase: string;
    modifiedBy: string | null;
    modifiedTime: string | null;
    name: string;
    uuid: string;
}

/** A sysHUB workflow object that is contained within the SyshubWorkflowModel */
export type SyshubWorkflowExtended = {
    activatedBy: string;
    activatedTime: string | null;
    author: string;
    baseVersion: string;
    cacheable: boolean;
    /** category is string `empty` if no category is assigned */
    category: string;
    created: string;
    description: string;
    flag: string;
    guid: string;
    inheritLogLevel: boolean;
    lockedBy: string | null;
    logLevel: number;
    modified: string | null;
    name: string;
    uuid: string;
    version: string;
}

/** A sysHUB workflow execution object holding workflow execution parameters and feedback */
export type SyshubWorkflowExecution = {
    /** Workflow asynchronous execution mode. */
    async: boolean;

    /** Dictionary map for input parameters and execution results retrieval */
    dictionary: { [key: string]: any } | null;

    /** Time at which the workflow execution has ended formatted as dd-MM-yyyyTHH:mm:ss.SSS */
    endTime: string | null;

    /** An optional id of the job to reference during workflow execution */
    jobId: number | null;

    /** Parent job log Id - All log entries will be appended under the specified job log entry. If the job log Id is not specified, all log entries will be written to job root level or syslog if no job Id is specified either. */
    jobLogId: number | null;

    /** Time at which the workflow execution has been started formatted as dd-MM-yyyyTHH:mm:ss.SSS */
    startTime: string;

    /** Workflow execution status */
    status: 'COMPLETED' | 'EXCEPTION' | 'PENDING' | 'RUNNING';

    /** Time at which the workflow execution has been submitted formatted as dd-MM-yyyyTHH:mm:ss.SSS */
    submissionTime: string;

    /** Workflow execution object unique id allowing to retrieve workflow execution feedback */
    uuid: string;

    /** Executed workflow unique id */
    workflowUuid: string;
}

/** A sysHUB workflow model that reflects the visible part of the workflow definition */
export type SyshubWorkflowModel = {
    class: 'GraphLinksModel';
    copiesKey: boolean;
    linkDataArray: GraphModelLink[];
    linkFromPortIdProperty: 'fromPort';
    linkToPortIdProperty: 'toPort';
    modelData: SyshubWorkflowExtended;
    nodeDataArray: (GraphModelAnnotationObject | GraphModelDecisionObject | GraphModelEndObject | GraphModelProcessObject | GraphModelStartObject)[];
}

/** This object defines a workflow element of type Process */
export type GraphModelAnnotationObject = {
    /** Category, always `annotation` */
    category: 'annotation';
    /** Background color in format `rgb(226,253,175)` */
    color: string;
    /** Text color in format `rgb(0,0,0)` */
    colorText: string;
    /** Unique id */
    key: string;
    /** The label is automatically generated from the designer. It is visible in the elements properties but not in the workflow itself. */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** Element location width,height as space-separated string like `292 74` */
    size: string;
    /** The text content of the annotation */
    text: string;
    /** z-index of the element */
    zOrder: number;
}

/** This object defines a workflow element of type cElement */
export type GraphModelCElementObject = {
    /** Agent who runs the cElement */
    agent: string;
    /** Category, always `celement` */
    category: 'celement';
    /** cElement instance to be used for execution */
    instanceName: string;
    /** Unique id */
    key: string;
    /** The cElement name */
    label: string;
    /** Contains internal identifier for license checks */
    licenseName: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** Namespace where the functionality is to be located */
    nameSpace: string;
    /** cElement process name */
    refName: string;
    /** Description of the cElement workflow to call */
    refShortDesc: string;
    /** Uuid of the cElement workflow to call */
    refUuid: string;
    /** Start point of the referenced cElement workflow */
    startUuid: string;
    /** Contains additional parameters */
    variable: string;
    /** Creator of the cElement */
    vendor: string;
    /** Version of the cElement */
    version: string;
    /** z-index of the element */
    zOrder: number;
}

/** This object defines a workflow element of type Decision */
export type GraphModelDecisionObject = {
    /** Category, always `decision` */
    category: 'decision';
    /** The category description; empty if no category is assigned to the decision */
    categoryDesc: string;
    /** The category name; empty if no category is assigned to the decision */
    categoryName: string;
    /** The category uuid; `not set` if no category is assigned to the decision */
    categoryUuid: string;
    /** The java method name */
    command: string;
    /** Decision description as defined in the designer. */
    description: string;
    /** Defines whether this element is a local copy of the decision */
    isGlobal: boolean;
    /** Unique id */
    key: string;
    /** The label is automatically generated from the designer. It is visible in the elements properties but not in the workflow itself. */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** Decision name */
    name: string;
    /** Contains the path of the PSet entry assigned to the decision. It's undefined if no PSet is assigned. */
    parameterSetPath?: string;
    /** If decision has a parameterset path assigned, this reflects the PSet uuid. It's null if no PSet is assigned. */
    parameterSetUuid: string | null;
    /** Contains a semi-colon separated list of parameters of the decision. Parameters that are blank will not be included in this property. This list is blank if no parameter is set and will always end with a semi-colon if at least one parameter has been filled. */
    parameters: string;
    /** The uuid of the global decision definition */
    uuid: string;
    /** z-index of the element */
    zOrder: number;
    _maturity?: 'PRODUCTION' | 'DEPRECATED';
    _maturityText?: string | null;
}

/** This object defines a workflow element of type End */
export type GraphModelEndObject = {
    /** Category, always `end` */
    category: 'end';
    /** Unique id */
    key: string;
    /** The startpoint name */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
}

/** This object defines a workflow element of type Process */
export type GraphModelProcessObject = {
    /** Category, always `process` */
    category: 'process';
    /** The category description; empty if no category is assigned to the process */
    categoryDesc: string;
    /** The category name; empty if no category is assigned to the process */
    categoryName: string;
    /** The category uuid; `not set` if no category is assigned to the process */
    categoryUuid: string;
    /** The java method name, the uuid of a beanshell script or the native command */
    command: string;
    /** Process description as defined in the designer. */
    description: string;
    /** Defines whether this element is a local copy of the process */
    isGlobal: boolean;
    /** Defines whether this element processes in a loop */
    isLoop: boolean;
    /** Unique id */
    key: string;
    /** The label is automatically generated from the designer. It is visible in the elements properties but not in the workflow itself. */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** The loop name if it is a loop process. */
    loopName: string;
    /** The maximum execution time in seconds. */
    maxTime: number;
    /** Process name */
    name: string;
    /** Contains the path of the PSet entry assigned to the process. It's undefined if no PSet is assigned. */
    parameterSetPath?: string;
    /** If process has a parameterset path assigned, this reflects the PSet uuid. It's null if no PSet is assigned. */
    parameterSetUuid: string | null;
    /** Contains a semi-colon separated list of parameters of the process. Parameters that are blank will not be included in this property. This list is blank if no parameter is set and will always end with a semi-colon if at least one parameter has been filled. */
    parameters: string;
    /** The type of process */
    type: 'class' | 'bsh' | 'native';
    /** The uuid of the global process definition */
    uuid: string;
    /** z-index of the element */
    zOrder: number;
    _maturity?: 'PRODUCTION' | 'DEPRECATED';
    _maturityText?: string | null;
}

/** This object defines a workflow element of type Start */
export type GraphModelStartObject = {
    /** Category, always `start` */
    category: 'start';
    /** Used for native or webclient debugging */
    debugQueue?: any;
    /** Unique id */
    key: string;
    /** The startpoint name */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** If set, a semi-colon separated list of user roles with ending semi-colon like `ROLE_ADMIN;ROLE_AGENT;` */
    roles?: string;
    /** Used for numbering start points */
    startOrder: number;
}

/** This object defines a workflow element of type Workflow call */
export type GraphModelWorkflowObject = {
    /** Agent who runs the workflow */
    agent: string;
    /** Category, always `workflow` */
    category: 'workflow';
    /** Defines whether this element processes in a loop */
    isLoop: boolean;
    /** Unique id */
    key: string;
    /** The label is automatically generated from the designer. It is visible in the elements properties but not in the workflow itself. */
    label: string;
    /** Element location x,y as space-separated string like `170 30` */
    loc: string;
    /** The loop name if it is a loop workflow call. */
    loopName: string;
    /** Name of the workflow to call */
    refName: string;
    /** Description of the workflow to call */
    refShortDesc: string;
    /** Uuid of the workflow to call */
    refUuid: string;
    /** Start point of the referenced workflow */
    startPoint: string;
    /** Only available if set to be processed with multiple threads */
    threadCount?: number;
    /** Thread name if parallel processing is activated */
    threadName?: string;
    /** z-index of the element */
    zOrder: number;
}

/** This object defines a connection from one workflow element to another. */
export type GraphModelLink = {
    /** Whether breakpoint has been set for this connection */
    breakpoint?: boolean;
    /** Category of the link is only set if it's result of the decision or an error connector. */
    category?: 'decision' | 'error';
    /** The connector description which is available for decision connectors only */
    description?: 'Yes' | 'No';
    /** Target elements key (unique id) */
    from: string;
    /** The position at the start element, where this connector starts. */
    fromPort: 'r' | 'b' | 'l';
    /** Target elements key (unique id) */
    to: string;
    /** The position at the target element, where this connector ends (always at the top).*/
    toPort: 't';
}

/** A sysHUB workflow reference object */
export type SyshubWorkflowReference = {
    description: string | null;
    name: string;
    appears: string;
    type: 'Config' | 'JobType' | 'Parameterset' | 'Workflow';
}

/** A sysHUB workflow versioning object */
export type SyshubWorkflowVersion = {
    description: string;
    major: number;
    minor: number;
    modifiedBy: string | null;
    modifiedTime: string | null;
    uuid: string;
    workflowItemUuid: string;
}
