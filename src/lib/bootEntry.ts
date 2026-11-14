// Imported first from index.ts: before any other module of the app is evaluated.
import { markBoot } from './boot';
import { installCrashNote } from './crashNote';

installCrashNote();
markBoot('entry');
