import { Platform } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';

function AndroidGuard() {
  usePreventScreenCapture();
  return null;
}

/** Blocks screenshots and screen recording on Android while this screen is shown (PRD §9). */
export function PreventCapture() {
  return Platform.OS === 'android' ? <AndroidGuard /> : null;
}
