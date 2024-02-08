import { RestSettings, SyshubVersion } from "./settings";

export type Env = {
    variant?: 'environment.ts' | 'environment.development.ts';
    syshub: RestSettings;
}