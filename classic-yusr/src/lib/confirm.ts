import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { warningHaptic } from './haptics';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive choices are red and go first (HIG: action sheets). */
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Asks before an intentional action. On iOS this is an action sheet, as the HIG asks for choices
 * about an action ("Use an action sheet, not an alert"); elsewhere a standard alert.
 */
export function confirmAction({ title, message, confirmLabel, cancelLabel, destructive = true, onConfirm }: ConfirmOptions): void {
  const go = () => {
    if (destructive) warningHaptic();
    onConfirm();
  };
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [confirmLabel, cancelLabel], cancelButtonIndex: 1, destructiveButtonIndex: destructive ? 0 : undefined },
      (index) => {
        if (index === 0) go();
      },
    );
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: go },
  ]);
}
