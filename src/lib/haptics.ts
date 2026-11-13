import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Haptics are punctuation: one per user action, never the only feedback, never on scroll.
const on = Platform.OS !== 'web';
export const tick = () => { if (on) void Haptics.selectionAsync(); };
export const success = () => { if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };
export const warn = () => { if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); };
