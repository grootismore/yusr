import { Platform } from 'react-native';

/**
 * The web build is not the app. It exists for people invited as trusted contacts (accept an invite, answer,
 * read a released list) and for deleting an account. The phone apps are the product. Set
 * EXPO_PUBLIC_FULL_WEB=1 only to look at every screen in a browser during development.
 */
export const WEB_LIMITED = Platform.OS === 'web' && process.env.EXPO_PUBLIC_FULL_WEB !== '1';
