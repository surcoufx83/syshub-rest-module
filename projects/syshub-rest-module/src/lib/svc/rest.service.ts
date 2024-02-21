import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  ArgumentError,
  MissingScopeError,
  NetworkError,
  NotLoggedinError,
  StatusNotExpectedError,
  UnauthorizedError,
  UnexpectedContentError
} from '../error';
import { Session, Token } from '../session';
import { Settings } from '../settings';
import {
  SyshubBackupMeta,
  SyshubCategory,
  SyshubCategoryReference,
  SyshubCertStoreItem,
  SyshubClientConnection,
  SyshubConfigItem,
  SyshubIppDevice,
  SyshubJndiTable,
  SyshubJob,
  SyshubJobToPatch,
  SyshubJobType,
  SyshubMemCommandResult,
  SyshubPCommandLine,
  SyshubPSetItem,
  SyshubPermission,
  SyshubPermissionSet,
  SyshubResponseSimple,
  SyshubRole,
  SyshubServerInformation,
  SyshubSyslogEntry,
  SyshubSyslogEntryToCreate,
  SyshubUserAccount,
  SyshubUserlogEntry,
  SyshubUserlogEntryToCreate,
  SyshubWorkflow,
  SyshubWorkflowExecution,
  SyshubWorkflowModel,
  SyshubWorkflowReference,
  SyshubWorkflowVersion
} from '../types';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  // reference to the session object
  private session!: Session;

  // track the current login state and make it public readable
  private isLoggedIn$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this.isLoggedIn$.asObservable();

  // track the current access token and make it public readable
  private token$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public token = this.token$.asObservable();

  constructor(private settings: Settings, private httpClient: HttpClient) {
    // create session object
    this.session = new Session(settings);

    // subscribe to changes in loggedin state
    this.session.isLoggedIn.subscribe((state) => this.isLoggedIn$.next(state));

    // subscribe to changes in refresh is due and if true refresh session token
    this.session.refreshIsDue.subscribe((state) => {
      if (state === true)
        this.refresh();
    });

    // subscribe to current token
    this.session.token.subscribe((token) => this.token$.next(token));
  }

  /**
   * Starts sysHUB backup. This is a synchronous process so it can take some time until completed.
   * @param backupName Name for this backup.
   * @param backupDescription Description text for this backup.
   * @param folderpath Backup folder that will be created inside sysHUB root folder (contents will be overwritten!).
   * @param includeOptions Array of options to backup (see enum *SyshubBackupTypesEnum* for available options).
   * @returns Object of type *SyshubResponseSimple* if backup has been created; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public backupSyshub(backupName: string, backupDescription: string, folderpath: string, includeOptions: string[]): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post(`backuprestore/backup?folder=${encodeURIComponent(folderpath)}`, { BACKUPDESCRIPTION: backupDescription, BACKUPNAME: backupName, BACKUPTYPES: includeOptions }).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Creates one sysHUB category.
   * @param category A new category to create. Make sure to create your own uuid as it's not created by the server.
   * @returns Object of type *SyshubCategory[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public createCategory(category: SyshubCategory): Observable<SyshubCategory[] | Error> {
    let subject: Subject<SyshubCategory[] | Error> = new Subject<SyshubCategory[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.put(`category/list`, { children: [category] }).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<SyshubCategory[]>response.content['children']);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /** Private method to convert *SearchParams* object into url query params */
  private createQueryParamsMap(params?: SearchParams): string {
    let queryParams = '';
    if (params != undefined) {
      if (params.limit != undefined)
        queryParams = `${queryParams}&limit=${encodeURIComponent(params.limit)}`;
      if (params.offset != undefined)
        queryParams = `${queryParams}&offset=${encodeURIComponent(params.offset)}`;
      if (params.orderby != undefined)
        queryParams = `${queryParams}&orderby=${encodeURIComponent(params.orderby)}`;
      if (params.search != undefined)
        queryParams = `${queryParams}&search=${encodeURIComponent(params.search)}`;
    }
    return queryParams;
  }

  /**
   * Creates one job on the server and returns it.
   * @returns Object of type *JobResponse* (which contains some headers and the content as *SyshubJob*) or *StatusNotExpectedError* in case of an error.
   * @param job An object representing the job to create; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public createJob(job: SyshubJob): Observable<JobResponse | Error> {
    let subject: Subject<JobResponse | Error> = new Subject<JobResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post(`jobs`, job, ['Location']).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<JobResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of jobs from the server.
   * @returns Object of type *SyslogResponse* (which contains some headers and the content as *SyshubSyslogEntry*) or *StatusNotExpectedError* in case of an error.
   * @param entry An object representing the log entry to create; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public createSyslogEntry(entry: SyshubSyslogEntryToCreate): Observable<SyslogResponse | Error> {
    let subject: Subject<SyslogResponse | Error> = new Subject<SyslogResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post(`syslogs`, entry, ['Location']).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<SyslogResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of jobs from the server.
   * @returns Object of type *UserlogResponse* (which contains some headers and the content as *SyshubUserlogEntry*) or *StatusNotExpectedError* in case of an error.
   * @param entry An object representing the log entry to create; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public createUserlogEntry(entry: SyshubUserlogEntryToCreate): Observable<UserlogResponse | Error> {
    let subject: Subject<UserlogResponse | Error> = new Subject<UserlogResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post(`userlogs`, entry, ['Location']).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<UserlogResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to send a HTTP DELETE request to the sysHUB Server.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public delete(endpoint: string): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.delete<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to send a HTTP DELETE request to a **custom endpoint** of the sysHUB Server.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/custom/* and must not include this.
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public deletec(endpoint: string): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.delete<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Removes one sysHUB category.
   * @param uuid The uuid of the category
   * @returns Object of type *SyshubResponseSimple*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public deleteCategory(uuid: string): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.delete(`category/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Deletes a config item and its children.
   * @param uuid the uuid of the config item.
   * @returns *SyshubResponseSimple*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public deleteConfigItem(uuid: string): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.delete(`config/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Deletes a parameterset item and its children.
   * @param uuid the uuid of the parameterset item.
   * @returns *SyshubResponseSimple*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public deletePSetItem(uuid: string): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.delete(`parameterset/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Deletes one job object by its id from the server.
   * @param id The id of the job to delete.
   * @returns True if job has been removed; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public deleteJob(id: number): Observable<true | Error> {
    let subject: Subject<true | Error> = new Subject<true | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.delete(`jobs/${encodeURIComponent(id)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.NoContent) {
        subject.next(true);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(204, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to an endpoint via HTTP GET.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public get(endpoint: string, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.get<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to call a **custom endpoint** via HTTP GET.
   * @param endpoint The custom Rest API endpoint that follows after *custom/* and must not include this.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth.
   */
  public getc(endpoint: string, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.get<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Returns the current access token
   */
  public getAccessToken(): string {
    return this.token$.value;
  }

  /**
   * Returns meta information from a previously generated backup.
   * @param folderpath Backup folder that will be created inside sysHUB root folder.
   * @returns Object of type *SyshubBackupMeta* if folder is found and meta information are available; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getBackupMetadata(folderpath: string): Observable<SyshubBackupMeta | Error> {
    let subject: Subject<SyshubBackupMeta | Error> = new Subject<SyshubBackupMeta | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`backuprestore/metadata?folder=${encodeURIComponent(folderpath)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubBackupMeta>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Get a list of all sysHUB categories.
   * @returns Object of type *SyshubCategory[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCategories(): Observable<SyshubCategory[] | Error> {
    let subject: Subject<SyshubCategory[] | Error> = new Subject<SyshubCategory[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`category/list`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubCategory[]>response.content['children']);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Return one sysHUB category.
   * @param uuid The uuid of the category
   * @returns Object of type *SyshubCategory*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCategory(uuid: string): Observable<SyshubCategory | Error> {
    let subject: Subject<SyshubCategory | Error> = new Subject<SyshubCategory | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`category/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubCategory>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Return one sysHUB category.
   * @param uuid The uuid of the category
   * @returns Object of type *SyshubCategoryReference[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCategoryRefs(uuid: string, type?: 'Decision' | 'Process' | 'Jobtype' | 'Workflow' | undefined): Observable<SyshubCategoryReference[] | Error> {
    let subject: Subject<SyshubCategoryReference[] | Error> = new Subject<SyshubCategoryReference[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`category/references/${encodeURIComponent(uuid)}${type != undefined ? `?type=${encodeURIComponent(type)}` : ''}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubCategoryReference[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns all items from key or trust store.
   * @param store Provide either keystore or truststore.
   * @returns Object of type *SyshubCertStoreItem[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCertStoreItems(store: 'keystore' | 'truststore'): Observable<SyshubCertStoreItem[] | Error> {
    let subject: Subject<SyshubCertStoreItem[] | Error> = new Subject<SyshubCertStoreItem[] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`certificate/list/${store}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubCertStoreItem[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the sysHUB cluster status.
   * @returns Object of type *SyshubResponseSimple*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getClusterStatus(): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/cluster`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the children recursively.
   * @param uuid the uuid of the config item.
   * @param [maxDeep=0] If 0 all childs recursively are returned, otherwise the depth of returned items is determined by this value.
   * @returns *SyshubConfigItem[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getConfigChildren(uuid: string, maxDeep: number = 0): Observable<SyshubConfigItem[] | Error> {
    let subject: Subject<SyshubConfigItem[] | Error> = new Subject<SyshubConfigItem[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`config/children?uuid=${encodeURIComponent(uuid)}&maxDeep=${encodeURIComponent(maxDeep)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubConfigItem[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns one config item.
   * @param uuid the uuid of the config item.
   * @returns *SyshubConfigItem*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getConfigItem(uuid: string): Observable<SyshubConfigItem | Error> {
    let subject: Subject<SyshubConfigItem | Error> = new Subject<SyshubConfigItem | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`config/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubConfigItem>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the path inside the config tree of one config item.
   * @param uuid the uuid of the config item.
   * @returns *string*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getConfigPath(uuid: string): Observable<string | Error> {
    let subject: Subject<string | Error> = new Subject<string | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`config/path/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next((<SyshubResponseSimple>response.content).value);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of connected clients.
   * @param [all=true] If set to true all connections are shown, if not only client connections.
   * @returns *SyshubClientConnection[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getConnectedClients(all: boolean = true): Observable<SyshubClientConnection[] | Error> {
    let subject: Subject<SyshubClientConnection[] | Error> = new Subject<SyshubClientConnection[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/list/clientInformation?showAll=${all}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubClientConnection[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the current user object from the sysHUB Rest API if loggedin.
   * @returns Object of type *SyshubUserAccount*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCurrentUser(): Observable<SyshubUserAccount | Error> {
    let subject: Subject<SyshubUserAccount | Error> = new Subject<SyshubUserAccount | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get('currentUser').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubUserAccount>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of permission names of the loggedin user.
   * @returns *string[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCurrentUsersPermissions(): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('users/currentUser/permissions').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of role names of the loggedin user.
   * @returns *string[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getCurrentUsersRoles(): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('users/currentUser/roles').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the IPP devices.
   * @param [withImg=false] If true, device image is included as base64 encoded binary data.
   * @returns *SyshubIppDevice[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getDevices(withImg: boolean = false): Observable<SyshubIppDevice[] | Error> {
    let subject: Subject<SyshubIppDevice[] | Error> = new Subject<SyshubIppDevice[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/list/devices${withImg ? `?withImages=true` : ``}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubIppDevice[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the current loggedin state
   */
  public getIsLoggedIn(): boolean {
    return this.isLoggedIn$.value;
  }

  /**
   * Returns the table structure of a connected database.
   * @param jndi The JNDI connection name, eg. `System`.
   * @param [native=true] Switches the behavior of the Server. If false, it will return a cached structure for the System JNDI, although a different jndi name is provided.
   * @returns Object of type *SyshubJndiTable[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJndiDatabaseStructure(jndi: string = 'System', native: boolean = true): Observable<SyshubJndiTable[] | Error> {
    let subject: Subject<SyshubJndiTable[] | Error> = new Subject<SyshubJndiTable[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/db/listAttributes/${encodeURIComponent(jndi)}?isNativeCall=${encodeURIComponent(native)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        const data = <DbStructResponse[]>response.content;
        let struct: SyshubJndiTable[] = [];

        data.forEach((item) => {
          let table: SyshubJndiTable = {
            name: item.text,
            columns: [],
          };
          item.node.forEach((node) => {
            let match = node.text.match(/^(?<col>[^:]+):(?<type>[^ ]+)( (?<opts>[^:]+))?$/)
            if (match != null) {
              table.columns.push({
                name: match.groups!['col'],
                datatype: match.groups!['type'],
                isIdColumn: match.groups!['opts'] == 'identity',
                isUnique: match.groups!['opts'] == 'unique',
              });
            }
            else {
              console.error(`Unable to match table column definition for column ${node.text} in table ${item.text}`);
            }
          });
          struct.push(table);
        });

        subject.next(struct);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of JNDI connection names.
   * @returns *string[]* with the names of the connections; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJndiConnectionNames(): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('server/db/listJNDI').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Return one job object by its id from the server.
   * @param id The id of the job to retrieve.
   * @returns Object of type *SyshubJob*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJob(id: number): Observable<SyshubJob | Error> {
    let subject: Subject<SyshubJob | Error> = new Subject<SyshubJob | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`jobs/${encodeURIComponent(id)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubJob>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returs common job dir or if param `id` is provided the jobdir for a job identified by `id`.
   * @param id Optional: If provided, the server will return the dir for the given jobid.
   * @returns string; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJobDir(id?: number | undefined): Observable<string | Error> {
    let subject: Subject<string | Error> = new Subject<string | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`server/jobsDir${id ? `?jobId=${encodeURIComponent(id)}` : ''}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next((<SyshubResponseSimple>response.content).value);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returs the definition of one sysHUB job type.
   * @param uuid The uuid of the job type to retrieve.
   * @returns *SyshubJobType* object; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJobType(uuid: string): Observable<SyshubJobType | Error> {
    let subject: Subject<SyshubJobType | Error> = new Subject<SyshubJobType | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`jobtype/${uuid}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubJobType>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returs the definition of all sysHUB job types.
   * @returns *SyshubJobType[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJobTypes(): Observable<SyshubJobType[] | Error> {
    let subject: Subject<SyshubJobType[] | Error> = new Subject<SyshubJobType[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`jobtype/list`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        let types: SyshubJobType[] = [...(<{ children: SyshubJobType[] }>response.content).children];
        /*
         In 2023.2 the category property is an object with uuid = null if no category is assigned.
         For better usability this category is changed to null if category.uuid is null.
        */
        for (let i = 0; i < types.length; i++) {
          if (types[i].category != null) {
            if (types[i].category!.uuid == null)
              types[i].category = null;
          }
        }
        subject.next(types);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of jobs from the server.
   * @param params An object to filter the list of jobs.
   * @returns Object of type *JobsResponse* (which contains some headers and the content as *SyshubJob[]*); *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getJobs(params?: SearchParams): Observable<JobsResponse | Error> {
    let subject: Subject<JobsResponse | Error> = new Subject<JobsResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    let queryParams = this.createQueryParamsMap(params);
    this.get(`jobs${queryParams === '' ? '' : `?${queryParams.substring(1)}`}`, ['Abs_count', 'Highest_Id', 'Last', 'Next', 'First', 'Previous']).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<JobsResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of named systems that have been configured for the given config path.
   * @param path The path from the config tree, e.g. `HotFolder`, `System`, `System/ApiServer`
   * @returns Object of type *string[]*. If the path is not found, an empty array is returned. *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getNamedSystemsForConfigPath(path: string): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/configuredSystems?elementPath=${encodeURIComponent(path)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the permissions available on the server.
   * @returns *SyshubPermission[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getPermissions(): Observable<SyshubPermission[] | Error> {
    let subject: Subject<SyshubPermission[] | Error> = new Subject<SyshubPermission[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('permissions').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubPermission[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the permissionsets available on the server.
   * @returns *SyshubPermissionSet[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getPermissionSets(): Observable<SyshubPermissionSet[] | Error> {
    let subject: Subject<SyshubPermissionSet[] | Error> = new Subject<SyshubPermissionSet[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('permissionsets').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubPermissionSet[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the children recursively.
   * @param uuid the uuid of the parameterset item.
   * @param [maxDeep=0] If 0 all childs recursively are returned, otherwise the depth of returned items is determined by this value.
   * @returns *SyshubPSetItem[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getPsetChildren(uuid: string, maxDeep: number = 0): Observable<SyshubPSetItem[] | Error> {
    let subject: Subject<SyshubPSetItem[] | Error> = new Subject<SyshubPSetItem[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`parameterset/children?uuid=${encodeURIComponent(uuid)}&maxDeep=${encodeURIComponent(maxDeep)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubPSetItem[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns one parameterset item.
   * @param uuid the uuid of the parameterset item.
   * @returns *SyshubPSetItem*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getPsetItem(uuid: string): Observable<SyshubPSetItem | Error> {
    let subject: Subject<SyshubPSetItem | Error> = new Subject<SyshubPSetItem | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`parameterset/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubPSetItem>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the path inside the parameterset tree of one parameterset item.
   * @param uuid the uuid of the parameterset item.
   * @returns *string*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getPsetPath(uuid: string): Observable<string | Error> {
    let subject: Subject<string | Error> = new Subject<string | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`parameterset/path/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next((<SyshubResponseSimple>response.content).value);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns all roles available on the server.
   * @returns *SyshubRole[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getRoles(): Observable<SyshubRole[] | Error> {
    let subject: Subject<SyshubRole[] | Error> = new Subject<SyshubRole[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('roles').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubRole[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns some sysHUB server information mainly used in the web client. The returned object contains the system and node name.
   * @returns Object of type *SyshubServerInformation*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getServerInformation(): Observable<SyshubServerInformation | Error> {
    let subject: Subject<SyshubServerInformation | Error> = new Subject<SyshubServerInformation | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get('server/list/information').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubServerInformation>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns some sysHUB server information mainly used in the web client. The returned object contains the system and node name.
   * @returns Object of type *{ [key: string]: string }*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getServerProperties(): Observable<{ [key: string]: string } | Error> {
    let subject: Subject<{ [key: string]: string } | Error> = new Subject<{ [key: string]: string } | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get('server/properties').subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<{ [key: string]: string }>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns an iterable list of syslog entries from the server.
   * @param params An object to filter the list of syslog entries.
   * @returns Object of type *SyslogsResponse* (which contains some headers and the content as *SyshubSyslogEntry[]*); *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getSyslogEntries(params: SearchParams): Observable<SyslogsResponse | Error> {
    let subject: Subject<SyslogsResponse | Error> = new Subject<SyslogsResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    let queryParams = this.createQueryParamsMap(params);
    this.get(`syslogs${queryParams === '' ? '' : `?${queryParams.substring(1)}`}`, ['Abs_count', 'Highest_Id', 'Last', 'Next', 'First', 'Previous']).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyslogsResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Return one syslog entry object by its id from the server.
   * @param id The id of the entry to retrieve.
   * @returns Object of type *SyshubSyslogEntry*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getSyslogEntry(id: number): Observable<SyshubSyslogEntry | Error> {
    let subject: Subject<SyshubSyslogEntry | Error> = new Subject<SyshubSyslogEntry | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`syslogs/${encodeURIComponent(id)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubSyslogEntry>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns all the hostnames of the system log.
   * @returns string[] containing the host names; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getSyslogHostnames(): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`syslogs/hostNames`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        const responseItems = <SyslogHostnamesResponse>response.content;
        let resultItems: string[] = [];
        responseItems.result.forEach((value) => resultItems.push(value['col-1']));
        subject.next(resultItems);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns an literable list of userlog entries from the server.
   * @param params An object to filter the list of userlog entries.
   * @returns Object of type *UserlogsResponse* (which contains some headers and the content as *SyshubUserlogEntry[]*); *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getUserlogEntries(params?: SearchParams): Observable<UserlogsResponse | Error> {
    let subject: Subject<UserlogsResponse | Error> = new Subject<UserlogsResponse | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    let queryParams = this.createQueryParamsMap(params);
    this.get(`userlogs${queryParams === '' ? '' : `?${queryParams.substring(1)}`}`, ['Abs_count', 'Highest_Id', 'Last', 'Next', 'First', 'Previous']).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<UserlogsResponse>{
          content: response.content,
          header: response.header,
        });
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Return one syslog entry object by its id from the server.
   * @param id The id of the entry to retrieve.
   * @returns Object of type *SyshubUserlogEntry*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getUserlogEntry(id: number): Observable<SyshubUserlogEntry | Error> {
    let subject: Subject<SyshubUserlogEntry | Error> = new Subject<SyshubUserlogEntry | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`userlogs/${encodeURIComponent(id)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubUserlogEntry>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of users from the server.
   * @returns *SyshubUserAccount[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getUsers(): Observable<SyshubUserAccount[] | Error> {
    let subject: Subject<SyshubUserAccount[] | Error> = new Subject<SyshubUserAccount[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`users`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubUserAccount[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a filterable list of workflows from the server.
   * @param params An object to filter the list of workflows.
   * @returns *SyshubWorkflow[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflows(params: SearchParams): Observable<SyshubWorkflow[] | Error> {
    let subject: Subject<SyshubWorkflow[] | Error> = new Subject<SyshubWorkflow[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    let queryParams = this.createQueryParamsMap(params);
    this.get(`workflows${queryParams === '' ? '' : `?${queryParams.substring(1)}`}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflow[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Get one workflow execution resource for the given execution Uuid.
   * @returns Object of type *SyshubWorkflowExecution*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowExecution(uuid: string): Observable<SyshubWorkflowExecution | Error> {
    let subject: Subject<SyshubWorkflowExecution | Error> = new Subject<SyshubWorkflowExecution | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`workflows/execute/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflowExecution>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Get all workflow execution resources for execution monitoring and result retrieval.
   * @returns Object of type *SyshubWorkflowExecution[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowExecutions(): Observable<SyshubWorkflowExecution[] | Error> {
    let subject: Subject<SyshubWorkflowExecution[] | Error> = new Subject<SyshubWorkflowExecution[] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.get(`workflows/execute`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflowExecution[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns the workflow definition as used by the workflow designer.
   * This endpoint is not part of the official documentation so the functionality may break with any sysHUB update.
   * @param uuid Uuid of the workflow.
   * @returns *SyshubWorkflowModel*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowModel(uuid: string): Observable<SyshubWorkflowModel | Error> {
    let subject: Subject<SyshubWorkflowModel | Error> = new Subject<SyshubWorkflowModel | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`workflow/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflowModel>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of references to the workflow.
   * @param uuid Uuid of the workflow.
   * @returns *SyshubWorkflowReference[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowReferences(uuid: string): Observable<SyshubWorkflowReference[] | Error> {
    let subject: Subject<SyshubWorkflowReference[] | Error> = new Subject<SyshubWorkflowReference[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`workflows/checkReferences?uuid=${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflowReference[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of start points of a workflow.
   * @param uuid Uuid of the workflow.
   * @returns *string[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowStartpoints(uuid: string): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`server/startPoint/list/${encodeURIComponent(uuid)}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a list of a workflows versions from the server.
   * @param uuid Uuid of the workflow.
   * @returns *SyshubWorkflowVersion[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public getWorkflowVersions(uuid: string): Observable<SyshubWorkflowVersion[] | Error> {
    let subject: Subject<SyshubWorkflowVersion[] | Error> = new Subject<SyshubWorkflowVersion[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    this.get(`workflows/${encodeURIComponent(uuid)}/versions`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubWorkflowVersion[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * In case of an arror in get(), post(), patch(), etc... this method creates the
   * subject error status that is returned to the caller. In case of a 401/Unauthorized
   * error, it forces a token refresh. If this failes, the user will be logged out.
   * @param subject The subject to be set with the error.
   * @param e The error response from the call to the server.
   */
  private handleError(subject: Subject<Response>, e: HttpErrorResponse): void {
    if (e.status == HttpStatusCode.Unauthorized)
      this.refresh();
    subject.next({
      content: e.error,
      status: e.status,
    });
    subject.complete();
  }

  private handleResponse(subject: Subject<Response>, response: HttpResponse<any>, acceptHeader?: string[]): void {
    let respheader: { [key: string]: string | null } = {};
    acceptHeader?.forEach((key) => respheader[key] = response.headers.get(key));
    subject.next({
      content: response.body,
      etag: response.headers.get('etag') || undefined,
      header: respheader,
      status: response.status,
    });
    subject.complete();
  }

  /**
   * Use this method to an endpoint via HTTP HEAD.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @returns An observable object which receives the raw http response of error.
   * @throws NotLoggedinError If user is not loggedin with OAuth.
   */
  public head(endpoint: string): Observable<HttpResponse<any> | HttpErrorResponse> {
    this.requireLoggedin();
    let subject: Subject<HttpResponse<any> | HttpErrorResponse> = new Subject<HttpResponse<any> | HttpErrorResponse>();
    this.httpClient.head<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`).subscribe({
      next: (response) => {
        subject.next(response);
        subject.complete();
      },
      error: (e: HttpErrorResponse) => {
        subject.next(e);
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to call a **custom endpoint** via HTTP HEAD.
   * @param endpoint The custom Rest API endpoint that follows after *custom/* and must not include this.
   * @returns An observable object which receives the raw http response of error.
   * @throws NotLoggedinError If user is not loggedin with OAuth.
   */
  public headc(endpoint: string): Observable<HttpResponse<any> | HttpErrorResponse> {
    this.requireLoggedin();
    let subject: Subject<HttpResponse<any> | HttpErrorResponse> = new Subject<HttpResponse<any> | HttpErrorResponse>();
    this.httpClient.head<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`).subscribe({
      next: (response) => {
        subject.next(response);
        subject.complete();
      },
      error: (e: HttpErrorResponse) => {
        subject.next(e);
        subject.complete();
      }
    });
    return subject;
  }

  /** Returns whether the internal Rest API endpoints are allowed. */
  private get isInternalRestApiAllowed(): boolean {
    return this.settings.useBasicAuth || (this.settings.oauth!.scope !== undefined && this.settings.oauth!.scope.indexOf('private') > -1);
  }

  /** Returns whether the public Rest API endpoints are allowed. */
  private get isPublicRestApiAllowed(): boolean {
    return this.settings.useBasicAuth || (this.settings.oauth!.scope !== undefined && this.settings.oauth!.scope.indexOf('public') > -1);
  }

  /**
   * Login method to send the username and its password to the Rest API to signin the user.
   * @param username A string containing the users username.
   * @param password A string containing the users password.
   * @returns A subscribable subject that contains the status of the login process. It starts with null, and changes to 
   * true on success or an HttpErrorResponse in case of any error.
   */
  public login(username: string, password: string): BehaviorSubject<boolean | null | HttpErrorResponse> {
    const serv = this;
    let subject = new BehaviorSubject<boolean | null | HttpErrorResponse>(null);
    if (!this.settings.useOAuth) {
      throw new Error('Method sendOAuthRefresh not allowed for basic authentication')
    }
    let body: string = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&`
      + `scope=${this.settings!.oauth!.scope}&client_id=${this.settings!.oauth!.clientId}&client_secret=${encodeURIComponent(this.settings!.oauth!.clientSecret!)}`;
    this.httpClient.post(`${this.settings!.host}webauth/oauth/token`, body, { observe: 'response' }).subscribe({
      next: (response) => {
        if (response && response.body) {
          const responseBody = <SyshubAuthResponse>response.body;
          let token: Token = {
            accessToken: responseBody.access_token,
            expiresIn: responseBody.expires_in,
            grantTime: new Date(),
            granted: true,
            refreshToken: responseBody.refresh_token,
            username: username
          };
          serv.session.setToken(token);
          subject.next(true);
          subject.complete();
        }
        subject.next(false);
        subject.complete();
      },
      error: (e: HttpErrorResponse) => {
        subject.next(e);
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Method to clear the users login session.
   */
  public logout(): void {
    this.session.clearToken();
  }

  /**
   * Use this method to an endpoint via HTTP OPTIONS.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @returns An observable object which receives the raw http response of error.
   * @throws NotLoggedinError If user is not loggedin with OAuth.
   */
  public options(endpoint: string): Observable<HttpResponse<any> | HttpErrorResponse> {
    this.requireLoggedin();
    let subject: Subject<HttpResponse<any> | HttpErrorResponse> = new Subject<HttpResponse<any> | HttpErrorResponse>();
    this.httpClient.options<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`).subscribe({
      next: (response) => {
        subject.next(response);
        subject.complete();
      },
      error: (e: HttpErrorResponse) => {
        subject.next(e);
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to call a **custom endpoint** via HTTP OPTIONS.
   * @param endpoint The custom Rest API endpoint that follows after *custom/* and must not include this.
   * @returns An observable object which receives the raw http response of error.
   * @throws NotLoggedinError If user is not loggedin with OAuth.
   */
  public optionsc(endpoint: string): Observable<HttpResponse<any> | HttpErrorResponse> {
    this.requireLoggedin();
    let subject: Subject<HttpResponse<any> | HttpErrorResponse> = new Subject<HttpResponse<any> | HttpErrorResponse>();
    this.httpClient.options<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`).subscribe({
      next: (response) => {
        subject.next(response);
        subject.complete();
      },
      error: (e: HttpErrorResponse) => {
        subject.next(e);
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP PATCH to the sysHUB Server. Make sure that the data matches the expected data 
   * of the sysHUB endpoint.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public patch(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.patch<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP PATCH to a **custom endpoint** of the sysHUB Server. Make sure that the data matches the expected data 
   * of the sysHUB endpoint.
   * @param endpoint The Rest API endpoint that follows after *custom/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public patchc(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.patch<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Patch properties of a job on the sysHUB Server and return it afterwards. The replacing object may contain anything but the job id. Every property that does not exist will be ignored.
   * @param id The id of the job to replace.
   * @param job The job object to patch the original job without id property (Type *SyshubJobToPatch*)
   * @returns Object of type *SyshubJob*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public patchJob(id: number, job: SyshubJobToPatch): Observable<SyshubJob | Error> {
    let subject: Subject<SyshubJob | Error> = new Subject<SyshubJob | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.patch(`jobs/${encodeURIComponent(id)}`, job).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubJob>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP POST to the sysHUB Server. Make sure that the data matches the expected data of 
   * the sysHUB endpoint.
   * To send files to the server make sure to use payload of type *FormData*.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public post(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.post<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP POST to a **custom endpoint** of the sysHUB Server. Make sure that the data matches the expected data of 
   * the sysHUB endpoint.
   * To send files to the server make sure to use payload of type *FormData*.
   * @param endpoint The Rest API endpoint that follows after *custom/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public postc(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.post<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP PUT to the sysHUB Server. Make sure that the data matches the expected data of 
   * the sysHUB endpoint.
   * @param endpoint The Rest API endpoint that follows after *webapi/v3/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public put(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.put<HttpResponse<any>>(`${this.settings.host}webapi/v3/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  /**
   * Use this method to send data via HTTP PUT to a **custom endpoint** the sysHUB Server. Make sure that the data matches the expected data of 
   * the sysHUB endpoint.
   * @param endpoint The Rest API endpoint that follows after *custom/* and must not include this.
   * @param payload Any data that can be sent to the sysHUB Server.
   * @param acceptHeader An array of strings containing header names from the server response to add to the response of this method
   * @returns An observable object to track the status and result of the Rest API call.
   * @throws NotLoggedinError If user is not loggedin with OAuth and throw errors has been enabled in settings.
   */
  public putc(endpoint: string, payload: any, acceptHeader?: string[]): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requireLoggedin(subject))
      return subject;
    this.httpClient.put<HttpResponse<any>>(`${this.settings.host}webapi/custom/${endpoint}`, payload, { observe: 'response' }).subscribe({
      next: (response) => this.handleResponse(subject, response, acceptHeader),
      error: (e: HttpErrorResponse) => this.handleError(subject, e)
    });
    return subject;
  }

  private isRefreshing: boolean = false;
  /**
   * Private method which handles the automatic refresh of a session.
   */
  private refresh(): void {
    if (this.isRefreshing)
      return;
    this.isRefreshing = true;
    const serv = this;
    this.sendOAuthRefresh().subscribe(
      (data: SyshubAuthResponse) => {
        let token: Token = {
          accessToken: data.access_token,
          expiresIn: data.expires_in,
          grantTime: new Date(),
          granted: true,
          refreshToken: data.refresh_token,
          username: this.session.getUsername(),
        };
        serv.session.setToken(token);
        setTimeout(() => {
          this.isRefreshing = false;
        }, 5000);
      },
      (error: HttpErrorResponse) => {
        /**
         * sysHUB does send different HTTP Status codes if refresh token or session token is expired.
         */
        if ((error.status == 400 || error.status == 401 || error.status == 403) && this.settings.options.autoLogoutOn401) {
          this.logout();
          this.isRefreshing = false;
        }
      }
    );
  }

  /**
   * Replace a job on the sysHUB Server and return it afterwards. The replacing object may contain anything but the job id. Every property that does not exist will be resetted to its default value.
   * @param id The id of the job to replace.
   * @param job The job object to replace the original job without id property (Type *SyshubJobToPatch*)
   * @returns Object of type *SyshubJob*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public replaceJob(id: number, job: SyshubJobToPatch): Observable<SyshubJob | Error> {
    let subject: Subject<SyshubJob | Error> = new Subject<SyshubJob | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.put(`jobs/${encodeURIComponent(id)}`, job).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubJob>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /** Throws an NotLoggedinError if user is not loggedin */
  private requireLoggedin(subject?: Subject<Response>): boolean {
    if (!this.isLoggedIn$.value) {
      if (this.settings.throwErrors)
        throw new NotLoggedinError();
      if (subject !== undefined)
        setTimeout(() => {
          subject.next({
            content: new NotLoggedinError().message,
            status: 401,
          });
          subject.complete();
        }, 1);
      return false;
    }
    return true;
  }

  /** Throws an MissingScopeError if private scope is missing */
  private requirePrivateScope(subject: Subject<any | Error>): boolean | Error {
    if (!this.isInternalRestApiAllowed) {
      if (this.settings.throwErrors)
        throw new MissingScopeError('private');
      setTimeout(() => {
        subject.next(new MissingScopeError('private'));
        subject.complete();
      }, 1);
      return false;
    }
    return true;
  }

  /** Throws an MissingScopeError if public scope is missing */
  private requirePublicScope(subject: Subject<any | Error>): boolean | Error {
    if (!this.isPublicRestApiAllowed) {
      if (this.settings.throwErrors)
        throw new MissingScopeError('public');
      setTimeout(() => {
        subject.next(new MissingScopeError('public'));
        subject.complete();
      }, 1);
      return false;
    }
    return true;
  }

  /**
   * Starts sysHUB restore from backup. This is a synchronous process so it can take some time until completed.
   * @param folderpath Backup folder that will be created inside sysHUB root folder (contents will be overwritten!).
   * @param includeOptions Array of options to backup (see enum *SyshubBackupTypesEnum* for available options).
   * @returns Object of type *SyshubResponseSimple* if backup has been restored; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public restoreSyshub(folderpath: string, includeOptions: string[]): Observable<SyshubResponseSimple | Error> {
    let subject: Subject<SyshubResponseSimple | Error> = new Subject<SyshubResponseSimple | Error>();
    this.requirePublicScope(subject);
    this.post(`backuprestore/restore?folder=${encodeURIComponent(folderpath)}`, { BACKUPTYPES: includeOptions }).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(<SyshubResponseSimple>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Executes one console command with optional parameters.
   * @param cmd The command to execute. The Rest API does not allow the commands `SHUT`, `EXIT` and `RESTART`.
   * @param params Optional string-array containg parameters for the command
   * @returns Object of type *string[]* if command has been executed; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runConsoleCommand(cmd: string, params: string[] = []): Observable<string[] | Error> {
    let subject: Subject<string[] | Error> = new Subject<string[] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post(`consolecommands/execute/${encodeURIComponent(cmd)}`, params).subscribe((response) => {
      if (response.status == HttpStatusCode.Accepted) {
        subject.next(<string[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(202, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Executes the HELP console command and converts the result to a list of key-value strings where key is the command and value the description of the command.
   * @returns Object of type *{ [key: string]: string }* if command has been executed; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runConsoleCommandHelp(): Observable<{ [key: string]: string } | Error> {
    let subject = new Subject<{ [key: string]: string } | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.runConsoleCommand('HELP').subscribe((response) => {

      if (response instanceof StatusNotExpectedError) {
        subject.next(response);
        subject.complete();
        return;
      }

      response = <string[]>response;
      if (response.length < 10 || (response[0] ?? '') != 'Available commands:') {
        subject.next(new UnexpectedContentError(response));
        subject.complete();
        return;
      }

      let responseobj: { [key: string]: string } = {};
      response.forEach((line, i) => {
        if (i > 0 && line != '') {
          const items: string[] = line.replace('\t\t', '\t').split('\t');
          if (items.length == 2) {
            responseobj[items[0]] = items[1];
          }
          else
            console.error(`Unexpected content in line ${i + 1}: ${line}`);
        }
      });

      subject.next(responseobj);
      subject.complete();

    });
    return subject;
  }

  /**
   * Executes the MEM console command and converts the result to an usable object.
   * @returns Object of type *SyshubMemCommandResult* if command has been executed; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runConsoleCommandMem(): Observable<SyshubMemCommandResult | Error> {
    let subject = new Subject<SyshubMemCommandResult | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.runConsoleCommand('MEM').subscribe((response) => {

      if (response instanceof StatusNotExpectedError) {
        subject.next(response);
        subject.complete();
        return;
      }

      response = <string[]>response;
      if (response.length != 8 || (response[0] ?? '') != 'Memory statistics:') {
        subject.next(new UnexpectedContentError(response));
        subject.complete();
        return;
      }

      const matches = response.join('\n').match(/(?:Free :\s)(?<freemem>\d+(?:.\d)+)\n(?:Max  :\s)(?<maxmem>\d+(?:.\d)+)\n(?:Total:\s)(?<totalmem>\d+(?:.\d)+)\n\n(?:CPUs:\s)(?<cpus>\d+)\n(?:Disk free\[(?<diskfreeUnit>\w+)\]:\s)(?<diskfree>\d+(?:.\d)+)/);
      if (matches == null) {
        subject.next(new UnexpectedContentError(response));
        subject.complete();
        return;
      }

      let responseobj: SyshubMemCommandResult = {
        Cpus: +matches.groups!['cpus'],
        DiskFree: +matches.groups!['diskfree'].replaceAll('.', ''),
        DiskFreeUnit: matches.groups!['diskfreeUnit'],
        Free: +matches.groups!['freemem'].replaceAll('.', ''),
        Max: +matches.groups!['maxmem'].replaceAll('.', ''),
        Total: +matches.groups!['totalmem'].replaceAll('.', ''),
      };
      subject.next(responseobj);
      subject.complete();

    });
    return subject;
  }

  /**
   * Executes the P console command and converts the result to an usable object.
   * @returns Object of type *SyshubPCommandLine[]* if command has been executed; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runConsoleCommandP(): Observable<SyshubPCommandLine[] | Error> {
    let subject = new Subject<SyshubPCommandLine[] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.runConsoleCommand('P').subscribe((response) => {

      if (response instanceof StatusNotExpectedError) {
        subject.next(response);
        subject.complete();
        return;
      }

      response = <string[]>response;
      let responseitems: SyshubPCommandLine[] = [];

      response.forEach((line, i) => {
        if (i > 0) {
          const lineitems = line.split(/;/);
          responseitems.push({
            Class: lineitems[0],
            Jobprocessorname: lineitems[1],
            Thread: lineitems[2],
            Starttime: +lineitems[3],
            FirstInstance: lineitems[4] === 'true',
            WorkflowUUID: lineitems[5],
            CurrentElement: lineitems[6],
            OSProcID: lineitems[7] == '-' ? null : +lineitems[7],
            CancelFlag: lineitems[8],
            JobID: lineitems[9] == '-' ? null : +lineitems[9],
            Host: lineitems[10]
          });
        }
      });

      subject.next(responseitems);
      subject.complete();

    });
    return subject;
  }

  /**
   * Get all workflow execution resources for execution monitoring and result retrieval.
   * @param uuid sysHUB Workflow Uuid to execute
   * @param [async=true] Determines whether to run the workflow synchronous or asynchronous.
   * @param jobId Optional; If set the workflow will be executed with the given job as currentjob.
   * @returns Object of type *[string, number]* (which contains the url where to query the status and the Http Status code 201 or 202) if workflow has been accepted; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runWorkflow(uuid: string, async: boolean = true, jobId?: number): Observable<[string, number] | Error> {
    let subject: Subject<[string, number] | Error> = new Subject<[string, number] | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    this.post('workflows/execute', jobId ? { async: async, workflowUuid: uuid, jobId: jobId } : { async: async, workflowUuid: uuid }, ['Location']).subscribe((response) => {
      if (response.status == HttpStatusCode.Created || response.status == HttpStatusCode.Accepted) {
        subject.next([response.header!['Location']!, response.status]);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Execute a workflow by its alias name.
   * To send files to the server make sure to use payload of type *FormData*.
   * @param alias sysHUB Workflow Alias name
   * @param payload Any payload you want to send to the workflows httpbody object
   * @param method Give one method to use for the communication with sysHUB, default is 'POST'
   * @returns An observable object to track the status and result of the Rest API call. The response will be whatever sysHUB sends as response; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public runWorkflowAlias(alias: string, payload: any | undefined, method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'POST'): Observable<Response> {
    let subject: Subject<Response> = new Subject<Response>();
    if (!this.requirePublicScope(subject))
      return subject;
    switch (method) {
      case 'DELETE':
        return this.delete(`workflows/execute/alias/${alias}`);
      case 'GET':
        return this.get(`workflows/execute/alias/${alias}`);
      case 'POST':
        return this.post(`workflows/execute/alias/${alias}`, payload);
      case 'PUT':
        return this.put(`workflows/execute/alias/${alias}`, payload);
    }
  }

  /**
   * Returns a tree structure of config items from the root down to the found items.
   * @param search Search configuration: Provide at least a description, name or value to search in.
   * @returns *SyshubConfigItem[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws ArgumentError In case that `search` is invalid.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public searchConfig(search: SearchTree): Observable<SyshubConfigItem[] | Error> {
    if (search.description == undefined && search.name == undefined && search.value == undefined)
      throw new ArgumentError('Search configuration must contain at least one of the properties not undefined.', 'search', search);
    if (search.description == '' && search.name == '' && search.value == '')
      throw new ArgumentError('Search configuration must contain at least one of the properties not empty.', 'search', search);
    let subject: Subject<SyshubConfigItem[] | Error> = new Subject<SyshubConfigItem[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    let searchby: string[] = [];
    if (search.description != undefined && search.description != '')
      searchby.push(`description=${encodeURIComponent(search.description)}`)
    if (search.name != undefined && search.name != '')
      searchby.push(`name=${encodeURIComponent(search.name)}`)
    if (search.value != undefined && search.value != '')
      searchby.push(`value=${encodeURIComponent(search.value)}`)
    this.get(`config?${searchby.join('&')}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubConfigItem[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Returns a tree structure of parameterset items from the root down to the found items.
   * @param search Search configuration: Provide at least a description, name or value to search in.
   * @returns *SyshubPSetItem[]*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws ArgumentError In case that `search` is invalid.
   * @throws MissingScopeError In case that access to private Rest API has not been granted and throw errors has been enabled in settings.
   */
  public searchPSet(search: SearchTree): Observable<SyshubPSetItem[] | Error> {
    if (search.description == undefined && search.name == undefined && search.value == undefined)
      throw new ArgumentError('Search configuration must contain at least one of the properties not undefined.', 'search', search);
    if (search.description == '' && search.name == '' && search.value == '')
      throw new ArgumentError('Search configuration must contain at least one of the properties not empty.', 'search', search);
    let subject: Subject<SyshubPSetItem[] | Error> = new Subject<SyshubPSetItem[] | Error>();
    if (!this.requirePrivateScope(subject))
      return subject;
    let searchby: string[] = [];
    if (search.description != undefined && search.description != '')
      searchby.push(`description=${encodeURIComponent(search.description)}`)
    if (search.name != undefined && search.name != '')
      searchby.push(`name=${encodeURIComponent(search.name)}`)
    if (search.value != undefined && search.value != '')
      searchby.push(`value=${encodeURIComponent(search.value)}`)
    this.get(`parameterset?${searchby.join('&')}`).subscribe((response) => {
      if (response.status == HttpStatusCode.Ok) {
        subject.next(<SyshubPSetItem[]>response.content);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(200, response));
        subject.complete();
      }
    });
    return subject;
  }

  /**
   * Private method that creates necessary body for the refresh.
   * @param username Username
   * @param password Password
   * @returns The subject from httpClient.post()
   */
  private sendOAuthRefresh(): Observable<any> {
    if (!this.settings.useOAuth) {
      throw new Error('Method sendOAuthRefresh not allowed for basic authentication')
    }
    let body: string = `grant_type=refresh_token&refresh_token=${this.session.getRefreshToken()}&`
      + `scope=${this.settings!.oauth!.scope}&client_id=${this.settings!.oauth!.clientId}&client_secret=${encodeURIComponent(this.settings!.oauth!.clientSecret!)}`;
    return this.httpClient.post<any>(`${this.settings!.host}webauth/oauth/token`, body);
  }

  /**
   * Adds a ticket or source file to a sysHUB job object.
   * @param jobId The id of the job.
   * @param fileType The type of file to upload (*ticket* or *source*).
   * @param file The file object as provided by an Html input of type file.
   * @param fileName The name of the file.
   * @returns *true*; *MissingScopeError* or *StatusNotExpectedError* in case of an error.
   * @throws MissingScopeError In case that access to public Rest API has not been granted and throw errors has been enabled in settings.
   */
  public uploadFileToJob(jobId: number, fileType: 'ticket' | 'source', file: File, fileName: string): Observable<true | Error> {
    let subject: Subject<true | Error> = new Subject<true | Error>();
    if (!this.requirePublicScope(subject))
      return subject;
    let formdata = new FormData();
    formdata.append('filename', fileName);
    formdata.append('file', file, fileName);
    this.post(`jobs/${encodeURIComponent(jobId)}/uploadFile?type=${encodeURIComponent(fileType)}`, formdata).subscribe((response) => {
      if (response.status == HttpStatusCode.Created) {
        subject.next(true);
        subject.complete();
      } else {
        subject.next(response.status == HttpStatusCode.Unauthorized ? new UnauthorizedError() : response.status == 0 ? new NetworkError() : new StatusNotExpectedError(201, response));
        subject.complete();
      }
    });
    return subject;
  }

}

type DbStructResponse = {
  text: string;
  node: DbStructNodeResponse[]
}

type DbStructNodeResponse = {
  text: string;
}

export interface SearchTree {
  description?: string;
  name?: string;
  value?: string;
}

export interface SearchParams {
  /** Count of elements to retrieve from the given offset. MUST be used in conjunction with offset. */
  limit?: number;
  /** Index of the first element to retrieve. MUST be used in conjunction with limit. */
  offset?: number;
  /** Sorting order of the queried result */
  orderby?: string;
  /** 
   * RSQL filtering search criteria, see https://github.com/jirutka/rsql-parser for syntax 
   * @see https://github.com/jirutka/rsql-parser
   * */
  search?: string
}

export type JobResponse = {
  content: SyshubJob;
  header?: { [key: string]: string | null };
}

export type JobsResponse = {
  content: SyshubJob[];
  header?: { [key: string]: string | null };
}

export type Response = {
  content: any;
  etag?: string;
  header?: { [key: string]: string | null };
  status: HttpStatusCode | 0;
}

export type SyslogResponse = {
  content: SyshubSyslogEntry;
  header?: { [key: string]: string | null };
}

export type SyslogsResponse = {
  content: SyshubSyslogEntry[];
  header?: { [key: string]: string | null };
}

type SyslogHostnamesResponse = {
  queryTime: string;
  result: SyslogHostnamesResponseResult[]
}

type SyslogHostnamesResponseResult = {
  'col-1': string;
}

type SyshubAuthResponse = {
  access_token: string,
  expires_in: number,
  refresh_token: string,
  scope: string,
  token_type: string
}

export type UserlogResponse = {
  content: SyshubUserlogEntry;
  header?: { [key: string]: string | null };
}

export type UserlogsResponse = {
  content: SyshubUserlogEntry[];
  header?: { [key: string]: string | null };
}
