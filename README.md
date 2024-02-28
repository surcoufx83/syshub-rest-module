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

### Type-Safe Methods

From version 2.0 onwards, our module introduces type-safe methods for more reliable endpoint communication, enhancing the previously generic approach like `get()`. These methods ensure strong typing for both input parameters and return values from REST API calls to the sysHUB server, providing enhanced type safety for your variables.

For a detailed list of these methods, please refer to the [README_methods.md](README_methods.md) file.

#### Example

Consider the `getCurrentUser()` method, which specifically targets the `currentUser` endpoint through an HTTP GET request. The return type is `SyshubUserAccount`, a data type that includes all properties guaranteed by the sysHUB server. Thus, responses are either a `SyshubUserAccount` object or an `Error` object (indicating issues like unauthenticated access). Here's an example usage:

```ts
this.restService.getCurrentUser().subscribe((response) => {
  if (response instanceof Error) {
    // Handle failed response
  } else {
    // Handle successful response
    // Guaranteed to be a SyshubUserAccount typed object, not an Error.
  }
});
```

## Credits

This README documentation is for the **syshub-rest-module**, which facilitates communication with the NT-Ware uniFLOW sysHUB server. While this module is independently developed, it is designed to work with sysHUB, a product of NT-Ware. For more information about NT-Ware and their innovative sysHUB solution, visit their official website:

[NT-Ware uniFLOW sysHUB Official Website](https://www.syshub.global/)
