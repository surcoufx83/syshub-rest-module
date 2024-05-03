import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Settings } from '../settings';
import { RestService } from './rest.service';

@Injectable()
export class SyshubInterceptor implements HttpInterceptor {

  private basictoken = '';

  constructor(
    private settings: Settings,
    private restService: RestService
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.settings.useBasicAuth)
      this.basictoken = window.btoa(`${this.settings.basic!.username}:${this.settings.basic!.password}`);

    /**
     * Check 1: Endpoint for OAuth login is called
     *   Force content type application/x-www-form-urlencoded
     */
    if (request.url.endsWith('webauth/oauth/token')) {
      const clonedRequest = request.clone({
        headers: request.headers
          .set('Content-Type', 'application/x-www-form-urlencoded')
      });
      return next.handle(clonedRequest);
    }

    /**
     * Check 2: If FormData to be sent to the server handle it with method interceptFormdata().
     */
    if (request.body instanceof FormData)
      return this.interceptFormdata(request, next);

    /**
     * Check 3: User already logged in via OAuth
     *   Add Bearer token as authorization header
     *   Content type is set to json if not yet defined
     */
    if (this.restService.getIsLoggedIn() && this.settings.useOAuth) {
      const clonedRequest = request.clone({
        headers: request.headers
          .set('Authorization', `Bearer ${this.restService.getAccessToken()}`)
          .set('Content-Type', 'application/json')
      });
      return next.handle(clonedRequest);
    }

    /**
     * Check 4: Basic auth is enabled
     *   Set Basic authorization header and provider
     *   Content type is set to json if not yet defined
     */
    if (this.settings.useBasicAuth) {
      const clonedRequest = request.clone({
        headers: request.headers
          .set('Authorization', 'Basic ' + this.basictoken)
          .set('AuthProvider', this.settings.basic!.provider)
          .set('Content-Type', 'application/json')
      });
      return next.handle(clonedRequest);
    }

    /**
     * Anything else: Send request as already configured
     *   Set Content type to json
     */
    const clonedRequest = request.clone({
      headers: request.headers
        .set('Content-Type', 'application/json')
    });
    return next.handle(clonedRequest);
  }

  interceptFormdata(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    /**
     * Check 3: User already logged in via OAuth
     *   Add Bearer token as authorization header
     *   Content type is set to json if not yet defined
     */
    if (this.restService.getIsLoggedIn() && this.settings.useOAuth) {
      const clonedRequest = request.clone({
        headers: request.headers
          .set('Authorization', `Bearer ${this.restService.getAccessToken()}`)
      });
      return next.handle(clonedRequest);
    }

    /**
     * Check 4: Basic auth is enabled
     *   Set Basic authorization header and provider
     *   Content type is set to json if not yet defined
     */
    if (this.settings.useBasicAuth) {
      const clonedRequest = request.clone({
        headers: request.headers
          .set('Authorization', 'Basic ' + this.basictoken)
          .set('AuthProvider', this.settings.basic!.provider)
      });
      return next.handle(clonedRequest);
    }

    /**
     * Anything else: Send request as already configured
     */
    return next.handle(request);
  }
}
