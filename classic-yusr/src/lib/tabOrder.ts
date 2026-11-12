/**
 * The order to list the tabs in. The app mirrors its own layout for Dhivehi (right to left), but the
 * iPhone's native tab bar only mirrors when the phone's own language is right-to-left, so with an
 * English phone it keeps its left-to-right order and Home would end up on the wrong side. In that
 * one case the list is reversed so Home sits at the start (the right edge), as in the rest of the
 * app. Android's bar follows the app's direction by itself.
 */
export function tabOrder<T>(tabs: readonly T[], where: { ios: boolean; appRtl: boolean; systemRtl: boolean }): readonly T[] {
  return where.ios && where.appRtl && !where.systemRtl ? [...tabs].reverse() : tabs;
}
