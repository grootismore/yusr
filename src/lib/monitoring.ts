import * as Sentry from '@sentry/react-native';

// Crash and error reporting (Sentry). Kharadhu holds people's money and a private register, so this is deliberately narrow:
// errors and crashes only. No session recording, no screenshots, no user, IP, cookies or request data, no logs, no profiling,
// no console or network breadcrumbs. The address to send to comes from EXPO_PUBLIC_SENTRY_DSN; without it nothing is sent.

const stripQuery = (url: unknown): unknown => (typeof url === 'string' ? url.split('?')[0] : url);

export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableLogs: false,
    // Light tracing in production; everything locally so a test shows one.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.extra;
      delete event.contexts?.culture;
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'console') return null; // our own messages could hold anything
      if (crumb.data && 'url' in crumb.data) crumb.data = { ...crumb.data, url: stripQuery(crumb.data.url) }; // no filters or ids in web addresses
      return crumb;
    },
  });
}

/** Send an error that the app caught and showed on screen itself. */
export const reportError = (error: unknown): void => { Sentry.captureException(error); };
export const wrapRoot = Sentry.wrap;
