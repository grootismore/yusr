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

/**
 * Header options that put the logo in the top-left corner. On iOS 26 every bar item is drawn inside a
 * Liquid Glass capsule by the system; the logo is a picture, not a button, so its glass is switched
 * off (hidesSharedBackground). Android has no such capsule and uses the plain `headerLeft`.
 */
export const logoHeaderOptions = {
  headerLeft: () => <HeaderLogo />,
  unstable_headerLeftItems: () => [{ type: 'custom' as const, element: <HeaderLogo />, hidesSharedBackground: true }],
};
