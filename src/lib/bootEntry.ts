// Imported first from index.ts: before any other module of the app is evaluated.
import { markBoot } from './boot';
import { installCrashNote, reportFatalTo } from './crashNote';
import { initMonitoring, reportError } from './monitoring';

// Monitoring first, so errors while the other modules load are caught; the crash note wraps it.
initMonitoring();
reportFatalTo(reportError);
installCrashNote();
markBoot('entry');
