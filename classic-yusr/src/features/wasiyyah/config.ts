/**
 * Where the public invite-accept page is hosted (EXPO_PUBLIC_INVITE_URL). Empty until that page is
 * deployed; the app then explains that invites are not set up yet instead of making a dead link.
 */
export const inviteBaseUrl = (): string => process.env.EXPO_PUBLIC_INVITE_URL ?? '';
