import { Text } from '@/components/Text';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { EmptyState, Group, Row, Screen } from '@/components/ui';
import { useFormatDate } from '@/features/transactions/format';
import { useAuditLog, useContacts } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function AuditLogScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const formatDate = useFormatDate();
  const entries = useAuditLog();
  const contacts = useContacts().all;
  const nameOf = (id?: string) => contacts.find((c) => c.id === id)?.name ?? t('wasiyyah.aContact');

  if (entries.length === 0) {
    return (
      <Screen>
        <PreventCapture />
        <EmptyState icon="time-outline" title={t('wasiyyah.activityEmpty')} body={t('wasiyyah.activityHint')} />
      </Screen>
    );
  }
  return (
    <Screen>
      <PreventCapture />
      <Text style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.activityHint')}</Text>
      <Group>
        {entries.map((e) => {
          const when = new Date(e.created_at);
          const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
          const sections = (e.meta.sections ?? []).map((s) => t(`wasiyyah.sections.${s}`)).join(', ');
          return (
            <Row
              key={e.id}
              label={t(`wasiyyah.events.${e.event}`, { name: nameOf(e.meta.contact_id), sections })}
              value={`${formatDate(toISODate(when))} ${time}`}
            />
          );
        })}
      </Group>
    </Screen>
  );
}
