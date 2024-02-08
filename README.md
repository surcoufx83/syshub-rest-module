# SyshubRestModule

This project contains sysHUB Rest API module within the subfolder `projects/syshub-rest-module`.

## Build

Run `pnpm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Deploy to npm

Before deploying make sure to create a new version number in `package.json` inside the projects-folder (not in this root folder) and build it again.
Run `cd dist\syshub-rest-module` and `pnpm publish` to upload a new version.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
