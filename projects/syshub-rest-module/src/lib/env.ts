import { BasicRestSettings, OAuthRestSettings } from "./settings";

export type Env = {
    variant?: 'environment.ts' | 'environment.development.ts';
    syshub: BasicRestSettings | OAuthRestSettings;
}