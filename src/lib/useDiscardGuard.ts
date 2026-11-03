import { useRef } from 'react';
import { usePreventRemove } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirmAction } from './confirm';

/**
 * Asks before a form is thrown away: the back button, Cancel, a swipe down on a sheet and the
 * Android back key all count (HIG: modality, "save or discard"). Pass the form's field values;
 * the form is "changed" once they differ from what they were when it opened.
 * Returns `leave`: call it just before closing on purpose (after Save, Archive or Delete), so the
 * form closes without asking.
 */
export function useDiscardGuard(values: readonly unknown[]): () => void {
  const { t } = useTranslation();
  const initial = useRef(JSON.stringify(values));
  const changed = JSON.stringify(values) !== initial.current;
  const leave = usePreventRemove(changed, ({ repeat }) =>
    confirmAction({
      title: t('common.discardTitle'),
      confirmLabel: t('common.discard'),
      cancelLabel: t('common.keepEditing'),
      onConfirm: () => {
        leave();
        repeat();
      },
    }),
  );
  return leave;
}
