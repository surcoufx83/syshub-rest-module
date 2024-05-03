# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.0] - Unreleased

### Added

- The module now allows the use of basic authentication without predefined access data. In this case, the `login()` method must be executed before the first request to the Rest API ([#15](https://github.com/surcoufx83/syshub-rest-module/issues/15)).
- It is now possible to use the sysHUB 2024 API keys to communicate with the Rest API ([#19](https://github.com/surcoufx83/syshub-rest-module/issues/19)).

### Modified

- The option of basic authentication without predefined access data means that an `Error` is no longer raised if the user name and password are both empty (`""`).
- With basic authentication, the scope is now also checked in the Rest module, even if it is ignored by the sysHUB Rest API ([#21](https://github.com/surcoufx83/syshub-rest-module/issues/21)).

## [5.1.0] - 2024-04-24

### Added

- The module has been changed to allow temporary sessions. This means, that if the `login()` method is called with the third parameter `keepLoggedin` = `false`, the token and session information will be stored in the browsers sessionStorage instead of the localStorage. After an user closes the browser window, the sessionStorage is cleared and though the session automatically removed. This closes the issue https://github.com/surcoufx83/syshub-rest-module/issues/2.

### Modified

- Methods that are called while the OAuth token is being refreshed are postponed for a short period of time (usually less than half a second) (closes https://github.com/surcoufx83/syshub-rest-module/issues/16).
- The `logout()` method now revokes the token also in the sysHUB server by calling the `webauth/oauth/revoke_token` endpoint (closes https://github.com/surcoufx83/syshub-rest-module/issues/3).

## [5.0.1] ... [5.0.2] - 2024-04-15

### Modified

- Documentation and Changelog have been updated

## [5.0.0] - 2024-04-15

### Modified

- **Breaking Change**: The Etag mechanism of the sysHUB Rest API has been enabled and added to each `get...()` method. An internal dictionary keeps track of the GET requests and the returned Etags. For each new request to previously called endpoints, the latest Etag is sent along. If the sysHUB server recognizes that no change has been made, it returns the HTTP status code 304/Not modified. This code is then passed on as the response. The Rest module does not transmit the cached content of the previous request, but only the code 304. It is therefore up to the application to save the data itself.
The Etag functionality can be prevented per function call or globally so that the sysHUB server actually delivers the requested data.

## [4.0.0] - 2024-02-26

### Modified

- **Breaking Change**: The type definitions for connection settings have been improved. Now, you can configure either basic authentication or OAuth, but not both simultaneously. This change will break existing code, necessitating modifications to settings objects.

### Added

- Automated tests have been implemented for classes and services to improve reliability and maintainability. All future changes must pass these tests prior to being included in a new release, ensuring high-quality updates.

## [3.3.2] - 2024-02-15

### Added

- Allow `agent` for workflow call or cElement to be `null` or `string`

## [3.3.1] - 2024-02-14

### Added

- Missing readme entry for `getWorkflowModel(uuid: string)`
- `'JobType'` as possible value of `SyshubWorkflowReference.type`

## [3.3.0] - 2024-02-13

### Added

- Added the new method `getWorkflowModel(uuid: string)` to retrieve a workflows graph model as defined by the workflow designer including the data types for the included chart entities

### Fixed

- Fixed a bug where session key in localstorage is undefined

## [3.2.2] - 2024-02-09

### Fixed

- Fixed bug that prevented login with some special characters like `&` that break parameters in urls

## [3.2.1] - 2024-02-08

### Fixed

- Removed debug code

## [3.2.0] - 2024-02-08

### Changed

- Improved error handling: In case that the server does not respond at all the Rest API returns a new error `NetworkError`. This informs the caller that the server is not available and enables it to handle this special case.

## [3.1.0] - 2024-02-06

### Changed

- Improved error handling: In the previous behavior, the Rest API was called even if the configured scope did not match the requirements for the endpoint and `throwErrors` was not set. Now an error object is returned.
  If `throwErrors` is set, the error is still thrown.
- Improved generalization: Repetitive code blocks have been moved to more generalized methods and reused.

## [3.0.3] - 2024-01-29

### Changed

- Changed `modifiedtime` property to type `string | number | null` for `SyshubConfigItem` and `SyshubPSetItem` as Rest API returns ISO string as of sysHUB 2023

## [3.0.2] - 2024-01-25

### Added

- Added methods `getJobType(uuid: string)` and `getJobTypes()`

## [3.0.1] - 2023-12-08

### Changed

- Add a token refresh after 401/Unauthorized response. If it fails, user will be logged out.
- In this case, Rest functions will return an `UnauthorizedError`. You may not show an error message in this case and wait for the refreshed toekn (or logout).

## [3.0.0] - 2023-12-07

### Changed

- Fixed issue with permanent token refresh.
- Update peer dependencies to Angular 17.

## [2.4.1] - 2023-08-08

### Changed
- Fixed `SyshubInterceptor`: In the case of FormData objects as payload, the interceptor no longer sets a Content-Type header, as this would destroy the standard browser header.
- Removed `postFile()` method: Since no header is needed, the method is no longer necessary and has been removed.

### Added
- Method `uploadFileToJob(jobId: number, fileType: 'ticket' | 'source', file: File, fileName: string)` to upload a file for a sysHUB job

## [2.3.1] - 2023-07-31

### Changed
- Fixed url for custom endpoints that are missing the `webapi` before the `custom`

## [2.3.0] - 2023-07-26

### Added
- Method `deletec()` to call a **custom** HTTP DELETE endpoint.
- Method `getc()` to call a **custom** HTTP GET endpoint.
- Method `head()` to call a HTTP HEAD endpoint.
- Method `headc()` to call a **custom** HTTP HEAD endpoint.
- Method `options()` to call a HTTP OPTIONS endpoint.
- Method `optionsc()` to call a **custom** HTTP OPTIONS endpoint.
- Method `patchc()` to call a **custom** HTTP PATCH endpoint.
- Method `postc()` to call a **custom** HTTP POST endpoint.
- Method `putc()` to call a **custom** HTTP PUT endpoint.

## [2.2.0] - 2023-07-25

### Added
- Method `getCurrentUsersPermissions()` to get a list of permission names of the current user.
- Method `getCurrentUsersRoles()` to get a list of role names of the current user.
- Method `getDevices(withImg: boolean = false)` to get the IPP devices.
- Method `getPermissions()` to get a list of permissions.
- Method `getPermissionSets()` to get a list of permissionsets.
- Method `getRoles()` to get a list of roles.
- Method `getUsers()` to get a list of users.
- Method `getWorkflows(params: SearchParams)` to get a filtered and sorted list of workflows.
- Method `getWorkflowReferences(uuid: string)` to get a list of workflow references.
- Method `getWorkflowStartpoints(uuid: string)` to get the start point names of a workflow.
- Method `getWorkflowVersions(uuid: string)` to get a list of workflow versions.

## [2.1.0] - 2023-07-24

### Added
- Method `createCategory(category: SyshubCategory)` to create a category.
- Method `createSyslogEntry(entry: SyshubSyslogEntryToCreate)` to create a syslog entry.
- Method `createUserlogEntry(entry: SyshubUserlogEntryToCreate)` to create a syslog entry.
- Method `deleteCategory(uuid: string)` to delete a category.
- Method `deleteConfigItem(uuid: string)` to delete a config item and all its children.
- Method `deletePSetItem(uuid: string)` to delete a parameterset item and all its children.
- Method `getCategories()` to retrieve a list of all categories.
- Method `getCategory(uuid: string)` to retrieve a category.
- Method `getCategoryRefs(uuid: string, type?: 'Decision' | 'Process' | 'Jobtype' | 'Workflow' | undefined)` to retrieve a category.
- Method `getClusterStatus()` to get the cluster status.
- Method `getConfigChildren(uuid: string, maxDeep: number = 0)` to get all children of a config item.
- Method `getConfigItem(uuid: string)` to get one item from the config tree.
- Method `getConfigPath(uuid: string)` to get the path of an item from the config tree.
- Method `getConnectedClients(all: boolean = true)` to get a list of connected clients.
- Method `getJndiConnectionNames()` to get a list of JNDI connections.
- Method `getJndiDatabaseStructure(jndi: string = 'System', native: boolean = true)` to get the structure of a JNDI connected database.
- Method `getJobDir(id?: number | undefined)` to get the jobdir.
- Method `getNamedSystemsForConfigPath()` to get a list of named systems for a path in the config tree.
- Method `getPsetChildren(uuid: string, maxDeep: number = 0)` to get all children of a parameterset item.
- Method `getPsetItem(uuid: string)` to get one item from the parameterset tree.
- Method `getPsetPath(uuid: string)` to get the path of an item from the parameterset tree.
- Method `getSyslogEntries(params?: SearchParams)` to retrieve a filterable and sortable list of syslog entries from the server.
- Method `getSyslogEntry(id: number)` to retrieve one syslog entry from the server.
- Method `getSyslogHostnames()` to retrieve a list of all hostnames used in syslog.
- Method `getUserlogEntries(params?: SearchParams)` to retrieve a filterable and sortable list of userlog entries from the server.
- Method `getUserlogEntry(id: number)` to retrieve one userlog entry from the server.
- Method `searchConfig(search: SearchTree)` to search inside the config tree.
- Method `searchPSet(search: SearchTree)` to search inside the config tree.

## [2.0.0] - 2023-07-21
**This is a breaking change if you upgrade from Version 1.1 or older. The methods `delete()`, `get()`, `patch()`, `post()`, `postFile()`, `put()` returns a new kind of object.**

### Added
- Provide interface `Env` in the module to provide typechecking for apps that make use of this module.
- Methods `delete()`, `get()`, `patch()`, `post()`, `postFile()`, `put()` will throw an `NotLoggedinError` if user is not loggedin via OAuth. In case of basic auth user counts as always logged in.
- Rest API calls like `getServerInformation()` throw an `MissingScopeError` if the scope configuration in the envionment is missing the correct scope.
- A new configuration switch `throwErrors` has been added to the environment configuration. If set to false (default) the previous stated errors will not be thrown.
- Method `backupSyshub(backupName: string, backupDescription: string, folderpath: string, includeOptions: string[])` to create a new backup.
- Method `createJob(job: SyshubJob)` to create a new job.
- Method `deleteJob(id: number)` to delete one job from the server.
- Method `getBackupMetadata(folder: string)` to retrieve information for a created backup.
- Method `getCertStoreItems()` to retrieve cert store information.
- Method `getJob(id: number)` to retrieve one job from the server.
- Method `getJobs(params?: SearchParams)` to retrieve a filterable and sortable list of jobs from the server.
- Method `getServerInformation()` to retrieve server information like license, system and grid node name, version.
- Method `getServerProperties()` to retrieve items from `server.properties` file.
- Method `getWorkflowExecution(uuid: string)` to retrieve one running workflow executions.
- Method `getWorkflowExecutions()` to retrieve running workflow executions.
- Method `replaceJob(id: number, job: SyshubJobToPatch)` to replace a job on the server.
- Method `restoreSyshub(folderpath: string, includeOptions: string[])` to restore from a backup.
- Method `runConsoleCommand(cmd: string, params: string[] = [])` to execute a console command.
- Method `runConsoleCommandHelp()` to execute the console command HELP and convert the server response into a list of key-value strings where key is the command and value the description of the command.
- Method `runConsoleCommandMem()` to execute the console command MEM and convert the server response into a usable object instead of string-array.
- Method `runConsoleCommandP()` to execute the console command P and convert the server response into a usable object instead of string-array.
- Method `runWorkflow(uuid: string, async: boolean = true, jobId?: number)` to start a workflow execution.
- Method `runWorkflowAlias(alias: string, payload: any | undefined, method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'POST')` to start a workflow based on it's alias name.

### Changes
- Upgrade to Angular 16
- Changed default syHUB version to 2023
- **Breaking Change**: Now every Rest API call (using the methods `delete()`, `get()`, `patch()`, `post()`, `postFile()`, `put()`) will return an object of type `Response` in case of success. This object contains three objects:
  - `content`: Contains the response body (normally a string)
  - `header`: The headers from the response
  - `status`: The HTTP Status code of the response

## [1.1.0] - 2023-03-02
### Added
- Support for sysHUB 2021 by adding a new property `version` to `environment.syshub`. This version switch uses the enum `SyshubVersion` which is content of this module. If the version switch is not provided default will be sysHUB 2022.

## [1.0.0] - 2023-02-13
Initial npm release
