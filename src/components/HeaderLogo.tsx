import { Image } from 'react-native';

/** The app icon in the corner of each tab's navigation bar. Decorative, so screen readers skip it. */
export function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/icon.png')}
      accessible={false}
      accessibilityIgnoresInvertColors
      style={{ width: 32, height: 32, borderRadius: 8 }}
    />
  );
}
