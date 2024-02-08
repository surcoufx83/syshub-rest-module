import { Response } from "./svc/rest.service";

export class ArgumentError extends Error {
    constructor(message: string, argument: string, value: any) {
        super(`${message}.\r\nArgument: ${argument}, Value: ${value}`);
        this.name = 'ArgumentError';
    }
}

export class MissingScopeError extends Error {
    constructor(requiredScope: string) {
        super(`The endpoint must not be called due to missing scope '${requiredScope}' in the environments configuration.`);
        this.name = 'MissingScopeError';
    }
}

export class NotLoggedinError extends Error {
    constructor() {
        super(`The user is not loggedin therefore this endpoint must not be called.`);
        this.name = 'NotLoggedinError';
    }
}

export class NetworkError extends Error {
    constructor() {
        super(`Unable to connect to the server. Check that the server is running and available.`);
        this.name = 'NetworkError';
    }
}

export class StatusNotExpectedError extends Error {
    public response: Response;
    constructor(expectedCode: number, response: Response) {
        super(`The server did not reply with the expected HTTP Statuscode ${expectedCode}.`);
        this.name = 'StatusNotExpectedError';
        this.response = response;
    }
}

export class UnexpectedContentError extends Error {
    public response: any;
    constructor(response: any) {
        super(`The server did not reply with the expected datatype or content.`);
        this.name = 'UnexpectedContentError';
        this.response = response;
    }
}

export class UnauthorizedError extends Error {
    constructor() {
        super(`The server refused the current session. The session will automatically renewed or removed.`);
        this.name = 'UnauthorizedError';
    }
}
