// Metro config with Sentry's serializer, which gives every bundle a debug ID so crash stack traces can be read.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
