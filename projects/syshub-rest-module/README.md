[![Node.js CI](https://github.com/surcoufx83/syshub-rest-module/actions/workflows/node.js.yml/badge.svg)](https://github.com/surcoufx83/syshub-rest-module/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/surcoufx83/syshub-rest-module/graph/badge.svg?token=Y1R57GV3ZD)](https://codecov.io/gh/surcoufx83/syshub-rest-module)

# Syshub Rest Module

The **syshub-rest-module** is designed to facilitate communication between an Angular single-page application (SPA) and an NT-Ware uniFLOW sysHUB server. It leverages the sysHUB server's REST interface, which supports OAuth2 authentication and, optionally, basic authentication.

This module includes a *RestService* that provides generic methods for HTTP operations, including GET, POST, DELETE, PATCH, and PUT. It also offers type-safe methods, such as `getCurrentUser()`, to enhance usability. Once a user successfully logs in using OAuth, the module automatically handles the renewal of the session token shortly before its expiration.

To integrate the module into your Angular application, follow the installation instructions provided below.

## Install

To add the **syshub-rest-module** to your project as a dependency, execute the following command in the root directory of your Angular 17 project:

```sh
npm i syshub-rest-module
```

For projects using older versions of Angular, please refer to the table below to find the appropriate version of the **syshub-rest-module** and the corresponding installation command.

| Angular version | Syshub Rest Module version | install cmd                   |
| :-------------- | :------------------------- | :---------------------------- |
| 17.x            | 4.x (or 3.x)               | `npm i syshub-rest-module@^4` |
| 16.x            | 2.x                        | `npm i syshub-rest-module@^2` |

### Configuration

After installing the module, you need to set up your credentials. This is typically done in your `environment.ts` file. If you don't have an `environment.ts` file yet, refer to [this StackOverflow article](https://stackoverflow.com/a/74558518) for guidance.

Ensure that your configuration includes at least one element that implements either the `BasicRestSettings` or `OAuthRestSettings` type. These types specify the requirements for establishing a connection to a sysHUB Server.

Type hints (comments) are provided for each type and property, serving as documentation. You can also find these comments in the [source code](https://github.com/surcoufx83/syshub-rest-module/blob/307f58f9ca9e696e37458eba658dc8a9deea9f79/projects/syshub-rest-module/src/lib/settings.ts#L154).


#### Example configuration - Basic auth

The following code is an example to setup your environment for basic authentication.

```ts
import { BasicRestSettings } from "syshub-rest-module";

export type MyEnvironment = {
    syshub: BasicRestSettings
}

export const environment: MyEnvironment = {
    syshub: {
        host: "/",
        basic: {
            enabled: true,
            username: "<basic username>",
            password: "<basic password>",
            provider: "<basic api provider>",
        },
        throwErrors: false
    }
};
```

#### Example configuration - OAuth

The following code is an example to setup your environment for OAuth2 authentication.

```ts
import { OAuthRestSettings } from "syshub-rest-module";

export type MyEnvironment = {
    syshub: OAuthRestSettings
}

export const environment: MyEnvironment = {
    syshub: {
        host: "/",
        oauth: {
            enabled: true,
            clientId: "<oauth client id>",
            clientSecret: "<oauth client secret>",
            scope: "public"
        },
        throwErrors: false
    }
};
```

#### Server Versions

The REST API of sysHUB has undergone significant changes from version 2021 to 2022, and minor updates from 2022 to 2023. It is now accessible via `/webapi/` instead of the previous `/cosmos-webapi/`. Consequently, this module introduces a version switch in its configuration to accommodate these changes. If this switch is not explicitly set, the module defaults to the latest version, which is currently 2023. To configure the module for use with sysHUB server versions 2021 or 2022, adjust the version setting as necessary.

Below is a code example demonstrating how to configure the REST module for a sysHUB server version 2021:

```ts
import { BasicRestSettings, SyshubVersion } from "syshub-rest-module";

export type MyEnvironment = {
    syshub: BasicRestSettings
}

export const environment: MyEnvironment = {
    syshub: {
        host: "/",
        version: SyshubVersion.sysHUB_2021,
        basic: {
            enabled: true,
            username: "<basic username>",
            password: "<basic password>",
            provider: "<basic api provider>",
        },
        throwErrors: false
    }
};
```

### Link module in your app.module.ts

In your `app.module.ts` make sure that the `HttpClientModule` is imported and add the three providers `Settings`, `RestService` and `HTTP_INTERCEPTORS`. The minimal configuration looks something like this:

```ts
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RestService, RestSettings, Settings, SyshubInterceptor } from 'syshub-rest-module';

@NgModule({
  imports: [
    HttpClientModule,
  ],
  providers: [
    { provide: Settings, multi: false, useValue: new Settings(<RestSettings>(environment.syshub)) },
    { provide: RestService, multi: false, deps: [Settings, HttpClient] },
    { provide: HTTP_INTERCEPTORS, multi: true, useClass: SyshubInterceptor, deps: [Settings, RestService] },
  ],
})
export class AppModule { }
```

The `Settings` provider requires an initialised object of the class `Settings`, whose constructor in turn expects an object corresponding to the type `RestSettings`. For an example, see object `environment.syshub` in the [Install/Setup configuration chapter](#setup-configuration).

## Usage

In each component that needs access to the sysHUB Rest API, the `RestService` must be imported and injected in the constructor of the component. Minimal example:

```ts
import { RestService } from 'syshub-rest-module';

@Component({})
export class FooComponent {
  constructor(private restService: RestService) {}
}
```

### Userlogin example

The user login is programmed with a few lines of code. In the following example, the `onSubmitBtnClicked()` method is called by clicking a button in the HTML and the contents of the variables `username` and `password` are sent to the sysHUB server via the `login()` method of the *RestService*. The response is then either `true` in case of success or an error containing further information. In case of success, the Rest Service saves the received token and takes care of its renewal.

```ts
import { Component } from '@angular/core';
import { RestService } from 'syshub-rest-module';

@Component({
  selector: 'app-login-min',
  templateUrl: './login-min.component.html',
  styleUrls: ['./login-min.component.scss']
})
export class LoginMinComponent {

  username: string = 'foo';
  password: string = '<foobar!>';

  constructor(private restService: RestService) { }

  onSubmitBtnClicked(): void {
    this.restService.login(this.username, this.password).subscribe((response) => {
      if (response === null) // Initial status, not yet any response from server
        return;
      if (response === true) // Login successfull
        console.log(`User ${this.username} logged in`);
      else // Error while logging in, see details in response
        console.log(response);
    });
  }

}
```

### Check login state before sending request

Before sending a request to the server's Rest API, it should be ensured that a user is logged in. For this, either the method `getIsLoggedIn()` of the *RestService* can be queried or subscribed to `isLoggedIn`. `isLoggedIn` reports every change of the login status and so it is also possible to react on successful logout and login.

In the following example code (which supplements the code from the previous section [Userlogin example](#userlogin-example)), the properties `loggedIn` and `sub` have been added. In the constructor, `RestService.isLoggedIn` is subscribed to and any status change is stored in `loggedIn`. The subscription itself is stored in `sub` and terminated when the component is exited.

```ts
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RestService } from 'syshub-rest-module';

@Component({
  selector: 'app-login-min',
  templateUrl: './login-min.component.html',
  styleUrls: ['./login-min.component.scss']
})
export class LoginMinComponent implements OnDestroy {

  username: string = 'foo';
  password: string = '<foobar!>';

  loggedIn: boolean = false;
  sub?: Subscription;

  constructor(private restService: RestService) {
    this.sub = this.restService.isLoggedIn.subscribe((state) => this.loggedIn = state);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSubmitBtnClicked(): void {
    this.restService.login(this.username, this.password).subscribe((response) => {
      if (response === null) // Initial status, not yet any response from server
        return;
      if (response === true) // Login successfull
        console.log(`User ${this.username} logged in`);
      else // Error while logging in, see details in response
        console.log(response);
    });
  }

}
```

### Calling Rest API endpoints

Calling Rest API endpoints is quite simple with the *RestService*. Call one of the generic methods `get()`, `post()`, `delete()`, `patch()` or `put()` of the *RestService* to reach any endpoint. For `post()`, `patch()` and `put()` a payload is required in addition to the endpoint. The content of the payload can be seen in the Swagger definition.
**Important**: The actual call to the sysHUB server only takes place when the result is subscribed to, nothing happens before that.

#### HTTP GET

```ts
this.restService.get('currentUser').subscribe((response) => {
  if (response.status == HttpStatusCode.Ok) {
    // Ok response
    /**
     * The sysHUB server may return a status code other than 200/OK.
     * The specification for this can be found in Swagger.
     */
  } else {
    //Failed response 
  }
});
```

#### HTTP POST

```ts
this.restService.post('jobs', {...}).subscribe((response) => {
  if (response.status == HttpStatusCode.Ok) {
    // Ok response
    /**
     * The sysHUB server may return a status code other than 200/OK.
     * The specification for this can be found in Swagger.
     */
  } else {
    //Failed response 
  }
});
```

##### Upload files

To upload files to a sysHUB server, the ContentType must be set as *multipart/form-data*. This is done automatically by the *RestService* if the object to be sent is of the type *FormData*. The following example shows the upload of a file as a ticket file for an existing sysHUB job:

```ts
onUploadFile(jobid: number, file: File, filename: string) {
  let formdata = new FormData();
  formdata.append('filename', filename);
  formdata.append('file', file, filename); 
  const urlpart = `jobs/${jobid}/uploadFile?type=ticket`; 
  this.restService.post(urlpart, formdata).subscribe((response) => {
    if (response.status == HttpStatusCode.Created) {
      // Ok response
      /**
       * The sysHUB server may return a status code other than 200/OK.
       * The specification for this can be found in Swagger.
       */
    } else {
      //Failed response 
    }
  });
}
```

### HTTP DELETE, PATCH and PUT

The sysHUB Rest API also expects the HTTP methods Delete, Head, Patch or Put depending on the endpoint. Accordingly, the *RestService* also provides these methods.
Since they work almost identically to the `get()` and `post()` methods, there are no separate instructions for their use here. Just replace `RestService.get()` with `RestService.delete()` to call a delete endpoint. Replace `RestService.post()` with `RestService.patch()` or `RestService.put()` to call the patch and put endpoints. The latter also expect an object to be sent to the web server.

### HTTP HEAD, OPTIONS

To use the head or options HTTP methods, simply call those *RestService* methods: `RestService.head()`, `RestService.options()`.

### Custom endpoints

Since version 2023, the sysHUB server supports custom Rest API endpoints. These are called via `/custom/...` instead of `/webapi/v3/...`. The *Restservice* also supports these endpoints and provides the methods `deletec()`, `getc()`, `headc()`, `optionsc()`, `patchc()`, `postc()` and `putc()` for them. The `c` at the end of the method name stands for *custom*. The methods function identically to the non-custom variants, except that the url is adapted.

### Typesafe methods

As of version 2.0, this module also includes specialised, type-safe methods to call endpoints specifically and not use the generic way of e.g. `get()`. These methods are programmed so that both the parameters for the rest of the API call are typed, as are the return values from the sysHUB server. To do this, the method interposes itself between your calling code and the underlying generic method, typing all variables.

As an example, consider the method `getCurrentUser()`: This method calls the endpoint `currentUser` via HTTP GET and types the return value from the sysHUB server as type `SyshubUserAccount`. This data type is also included in the module and contains all the properties that the sysHUB server is guaranteed to deliver. Your calling code will then receive either this object or an object of type `Error` as a response, for example because no user is logged in.

#### List of typesafe methods

The following list is sorted by topic (like Swagger) and method name.

| Method                                                                                                      | Return type                                                                          | Scope   | Verb     | Endpoint                                        |
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- | :------ | :------- | :---------------------------------------------- |
| **Backup and Restore operations**                                                                           |                                                                                      |         |          |                                                 |  |
| `backupSyshub(backupName: string, backupDescription: string, folderpath: string, includeOptions: string[])` | `SyshubResponseSimple`                                                               | public  | `POST`   | `/webapi/v3/backuprestore/backup?folder=...`    |
| `getBackupMetadata(folderpath: string)`                                                                     | `SyshubBackupMeta`                                                                   | public  | `GET`    | `/webapi/v3/backuprestore/metadata?folder=...`  |
| `restoreSyshub(folderpath: string, includeOptions: string[])`                                               | `SyshubResponseSimple`                                                               | public  | `POST`   | `/webapi/v3/backuprestore/restore?folder=...`   |
| **Category operations**                                                                                     |                                                                                      |         |          |                                                 |  |
| `createCategory(category: SyshubCategory)`                                                                  | `SyshubCategory[]`                                                                   | private | `PUT`    | `/webapi/v3/category/list`                      |
| `deleteCategory(uuid: string)`                                                                              | `SyshubResponseSimple`                                                               | private | `DELETE` | `/webapi/v3/category/...`                       |
| `getCategories()`                                                                                           | `SyshubCategory[]`                                                                   | private | `GET`    | `/webapi/v3/category/list`                      |
| `getCategory(uuid: string)`                                                                                 | `SyshubCategory`                                                                     | private | `GET`    | `/webapi/v3/category/...`                       |
| `getCategoryRefs(uuid: string, type?: string)`                                                              | `SyshubCategoryReference[]`                                                          | private | `GET`    | `/webapi/v3/category/references/...`            |
| **Certificate operations**                                                                                  |                                                                                      |         |          |                                                 |
| `getCertStoreItems(store: string)`                                                                          | `SyshubCertStoreItem`                                                                | public  | `GET`    | `/webapi/v3/certificate/list/...`               |
| **Config operations**                                                                                       |                                                                                      |         |          |                                                 |
| `deleteConfigItem(uuid: string)`                                                                            | `SyshubResponseSimple`                                                               | private | `DELETE` | `/webapi/v3/config/...`                         |
| `getConfigChildren(uuid: string, maxDeep: number = 0)`                                                      | `SyshubConfigItem[]`                                                                 | private | `GET`    | `/webapi/v3/config/children`                    |
| `getConfigItem(uuid: string)`                                                                               | `SyshubConfigItem`                                                                   | private | `GET`    | `/webapi/v3/config/...`                         |
| `getConfigPath(uuid: string)`                                                                               | `string`                                                                             | private | `GET`    | `/webapi/v3/config/path/...`                    |
| `getNamedSystemsForConfigPath(path: string)`                                                                | `string[]`                                                                           | private | `GET`    | `/webapi/v3/server/configuredSystems`           |
| `searchConfig(search: SearchTree)`                                                                          | `SyshubConfigItem[]`                                                                 | private | `GET`    | `/webapi/v3/config`                             |
| **Console operations**                                                                                      |                                                                                      |         |          |                                                 |
| `runConsoleCommand(cmd: string, params: string[] = [])`                                                     | `string[]`                                                                           | public  | `POST`   | `/webapi/v3/consolecommands/execute/...`        |
| `runConsoleCommandHelp()`                                                                                   | `{ [key: string]: string }`<br />(key = command, value = description of the command) | public  | `POST`   | `/webapi/v3/consolecommands/execute/HELP`       |
| `runConsoleCommandMem()`                                                                                    | `SyshubMemCommandResult`                                                             | public  | `POST`   | `/webapi/v3/consolecommands/execute/MEM`        |
| `runConsoleCommandP()`                                                                                      | `SyshubPCommandLine[]`                                                               | public  | `POST`   | `/webapi/v3/consolecommands/execute/P`          |
| **IPP Adapter operations**                                                                                  |                                                                                      |         |          |                                                 |
| `getDevices(withImg: boolean = false)`                                                                      | `SyshubIppDevice[]`                                                                  | private | `GET`    | `/webapi/v3/server/list/devices`                |
| **Job operations**                                                                                          |                                                                                      |         |          |                                                 |
| `createJob(job: SyshubJob)`                                                                                 | `JobResponse \| SyshubJob`                                                           | public  | `POST`   | `/webapi/v3/jobs`                               |
| `deleteJob(id: number)`                                                                                     | `true`                                                                               | public  | `DELETE` | `/webapi/v3/jobs/...`                           |
| `getJob(id: number)`                                                                                        | `SyshubJob`                                                                          | public  | `GET`    | `/webapi/v3/jobs/...`                           |
| `getJobDir(id?: number)`                                                                                    | `string`                                                                             | private | `GET`    | `/webapi/v3/server/jobsDir`                     |
| `getJobs(params?: SearchParams)`                                                                            | `JobsResponse \| SyshubJob[]`                                                        | public  | `GET`    | `/webapi/v3/jobs`                               |
| `patchJob(id: number, job: SyshubJobToPatch)`                                                               | `SyshubJob`                                                                          | public  | `PATCH`  | `/webapi/v3/jobs/...`                           |
| `replaceJob(id: number, job: SyshubJobToPatch)`                                                             | `SyshubJob`                                                                          | public  | `PUT`    | `/webapi/v3/jobs/...`                           |
| `uploadFileToJob(jobId: number, fileType: 'ticket' \| 'source', file: File, fileName: string)`              | `true`                                                                               | public  | `POST`   | `/webapi/v3/jobs/.../uploadFile?type=...`       |
| **Job type operations**                                                                                     |                                                                                      |         |          |                                                 |
| `getJobType(uuid: string)`                                                                                  | `SyshubJobType`                                                                      | private | `GET`    | `/webapi/v3/jobtype/{uuid}`                     |
| `getJobTypes()`                                                                                             | `SyshubJobType[]`                                                                    | private | `GET`    | `/webapi/v3/jobtype/list`                       |
| **Parameterset operations**                                                                                 |                                                                                      |         |          |                                                 |
| `deletePSetItem(uuid: string)`                                                                              | `SyshubResponseSimple`                                                               | private | `DELETE` | `/webapi/v3/parameterset/...`                   |
| `getPsetChildren(uuid: string, maxDeep: number = 0)`                                                        | `SyshubPSetItem[]`                                                                   | private | `GET`    | `/webapi/v3/parameterset/children`              |
| `getPsetItem(uuid: string)`                                                                                 | `SyshubPSetItem`                                                                     | private | `GET`    | `/webapi/v3/parameterset/...`                   |
| `getPsetPath(uuid: string)`                                                                                 | `string`                                                                             | private | `GET`    | `/webapi/v3/parameterset/path/...`              |
| `searchPSet(search: SearchTree)`                                                                            | `SyshubPSetItem[]`                                                                   | private | `GET`    | `/webapi/v3/parameterset`                       |
| **Server operations**                                                                                       |                                                                                      |         |          |                                                 |
| `getClusterStatus()`                                                                                        | `SyshubResponseSimple`                                                               | private | `GET`    | `/webapi/v3/server/cluster`                     |
| `getConnectedClients(all: boolean = true)`                                                                  | `SyshubClientConnection[]`                                                           | private | `GET`    | `/webapi/v3/server/list/clientInformation`      |
| `getJndiConnectionNames()`                                                                                  | `string[]`                                                                           | private | `GET`    | `/webapi/v3/server/db/listJNDI`                 |
| `getJndiDatabaseStructure(jndi: string = 'System', native: boolean = true)`                                 | `SyshubJndiTable[]`                                                                  | private | `GET`    | `/webapi/v3/server/db/listAttributes/...`       |
| `getServerInformation()`                                                                                    | `SyshubServerInformation`                                                            | public  | `GET`    | `/webapi/v3/list/information`                   |
| `getServerProperties()`                                                                                     | `{ [key: string]: string }`                                                          | private | `GET`    | `/webapi/v3/server/properties`                  |
| **System log operations**                                                                                   |                                                                                      |         |          |                                                 |
| `createSyslogEntry(entry: SyshubSyslogEntryToCreate)`                                                       | `SyslogResponse \| SyshubSyslogEntry`                                                | public  | `POST`   | `/webapi/v3/syslogs`                            |
| `getSyslogEntries(params: SearchParams)`                                                                    | `SyslogsResponse \| SyshubSyslogEntry[]`                                             | public  | `GET`    | `/webapi/v3/syslogs`                            |
| `getSyslogEntry(id: number)`                                                                                | `SyshubSyslogEntry`                                                                  | public  | `GET`    | `/webapi/v3/syslogs/...`                        |
| `getSyslogHostnames()`                                                                                      | `string[]`                                                                           | public  | `GET`    | `/webapi/v3/syslogs/hostNames`                  |
| **User log operations**                                                                                     |                                                                                      |         |          |                                                 |
| `createUserlogEntry(entry: SyshubUserlogEntryToCreate)`                                                     | `UserlogResponse \| SyshubUserlogEntry`                                              | public  | `POST`   | `/webapi/v3/userlogs`                           |
| `getUserlogEntries(params?: SearchParams)`                                                                  | `UserlogsResponse \| SyshubUserlogEntry[]`                                           | public  | `GET`    | `/webapi/v3/userlogs`                           |
| `getUserlogEntry(id: number)`                                                                               | `SyshubUserlogEntry`                                                                 | public  | `GET`    | `/webapi/v3/userlogs/...`                       |
| **User operations**                                                                                         |                                                                                      |         |          |                                                 |
| `getCurrentUser()`                                                                                          | `SyshubUserAccount`                                                                  | public  | `GET`    | `/webapi/v3/currentUser`                        |
| `getCurrentUsersPermissions()`                                                                              | `string[]`                                                                           | private | `GET`    | `/webapi/v3/users/currentUser/permissions`      |
| `getCurrentUsersRoles()`                                                                                    | `string[]`                                                                           | private | `GET`    | `/webapi/v3/users/currentUser/roles`            |
| `getUsers()`                                                                                                | `SyshubUserAccount[]`                                                                | private | `GET`    | `/webapi/v3/users`                              |
| **Workflow operations**                                                                                     |                                                                                      |         |          |                                                 |
| `getWorkflowExecution(uuid: string)`                                                                        | `SyshubWorkflowExecution`                                                            | public  | `GET`    | `/webapi/v3/workflows/execute/...`              |
| `getWorkflowExecutions()`                                                                                   | `SyshubWorkflowExecution[]`                                                          | public  | `GET`    | `/webapi/v3/workflows/execute`                  |
| `getWorkflowReferences(uuid: string)`                                                                       | `SyshubWorkflowReference[]`                                                          | private | `GET`    | `/webapi/v3/workflows/checkReferences?uuid=...` |
| `getWorkflows(params: SearchParams)`                                                                        | `SyshubWorkflow[]`                                                                   | private | `GET`    | `/webapi/v3/workflows`                          |
| `getWorkflowStartpoints(uuid: string)`                                                                      | `SyshubWorkflowVersion[]`                                                            | private | `GET`    | `/webapi/v3/server/startPoint/list/...`         |
| `getWorkflowVersions(uuid: string)`                                                                         | `SyshubWorkflowVersion[]`                                                            | private | `GET`    | `/webapi/v3/workflows/.../versions`             |
| `runWorkflow(uuid: string, async: boolean = true, jobId?: number)`                                          | `[string, number]`<br />(string = Status Url, number = HTTP Status)                  | public  | `POST`   | `/webapi/v3/workflows/execute`                  |
| `runWorkflowAlias(alias: string, payload: any, method: string = 'POST')`                                    | `any`                                                                                | public  | variable | `/webapi/v3/workflows/execute/alias/...`        |
| **Undocumented endpoints**                                                                                  |                                                                                      |         |          |                                                 |
| `getPermissions()`                                                                                          | `SyshubPermission[]`                                                                 | private | `GET`    | `/webapi/v3/permissions`                        |
| `getPermissionSets()`                                                                                       | `SyshubPermissionSet[]`                                                              | private | `GET`    | `/webapi/v3/permissionsets`                     |
| `getRoles()`                                                                                                | `SyshubRole[]`                                                                       | private | `GET`    | `/webapi/v3/roles`                              |
| `getWorkflowModel(uuid: string)`                                                                            | `SyshubWorkflowModel`                                                                | private | `GET`    | `/webapi/v3/workflow/...`                       |

## Credits

This README documentation is for the **syshub-rest-module**, which facilitates communication with the NT-Ware uniFLOW sysHUB server. While this module is independently developed, it is designed to work with sysHUB, a product of NT-Ware. For more information about NT-Ware and their innovative sysHUB solution, visit their official website:

[NT-Ware uniFLOW sysHUB Official Website](https://www.syshub.global/)
