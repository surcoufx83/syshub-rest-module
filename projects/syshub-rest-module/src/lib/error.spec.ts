import { HttpStatusCode } from '@angular/common/http';
import { ArgumentError, MissingScopeError, NetworkError, NotLoggedinError, StatusNotExpectedError, UnauthorizedError, UnexpectedContentError } from './error';

describe('ArgumentError', () => {

  it('should be created', () => {
    const errorInstance: ArgumentError = new ArgumentError('mock-message', 'mock-arg0', 'mock-value0');
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('mock-message.\r\nArgument: mock-arg0, Value: mock-value0');
    expect(errorInstance.name).toEqual('ArgumentError');
  });

});

describe('MissingScopeError', () => {

  it('should be created', () => {
    const errorInstance: MissingScopeError = new MissingScopeError('mock-scope');
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('The endpoint must not be called due to missing scope \'mock-scope\' in the environments configuration.');
    expect(errorInstance.name).toEqual('MissingScopeError');
  });

});

describe('NotLoggedinError', () => {

  it('should be created', () => {
    const errorInstance: NotLoggedinError = new NotLoggedinError();
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('The user is not loggedin therefore this endpoint must not be called.');
    expect(errorInstance.name).toEqual('NotLoggedinError');
  });

});

describe('NetworkError', () => {

  it('should be created', () => {
    const errorInstance: NetworkError = new NetworkError();
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('Unable to connect to the server. Check that the server is running and available.');
    expect(errorInstance.name).toEqual('NetworkError');
  });

});

describe('StatusNotExpectedError', () => {

  it('should be created', () => {
    const mockResponse = { content: '', status: HttpStatusCode.Accepted };
    const errorInstance: StatusNotExpectedError = new StatusNotExpectedError(202, mockResponse);
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('The server did not reply with the expected HTTP Statuscode 202.');
    expect(errorInstance.response).toEqual(mockResponse);
    expect(errorInstance.name).toEqual('StatusNotExpectedError');
  });

});

describe('UnexpectedContentError', () => {

  it('should be created', () => {
    const errorInstance: UnexpectedContentError = new UnexpectedContentError('mock-message');
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('The server did not reply with the expected datatype or content.');
    expect(errorInstance.response).toEqual('mock-message');
    expect(errorInstance.name).toEqual('UnexpectedContentError');
  });

});

describe('UnauthorizedError', () => {

  it('should be created', () => {
    const errorInstance: UnauthorizedError = new UnauthorizedError();
    expect(errorInstance).toBeTruthy();
    expect(errorInstance.message).toEqual('The server refused the current session. The session will automatically renewed or removed.');
    expect(errorInstance.name).toEqual('UnauthorizedError');
  });

});
