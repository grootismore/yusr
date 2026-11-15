import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useReceipt, useReceiptPhoto } from '@/data/hooks';
import { space, radius, useColors } from '@/theme/tokens';
import { Money } from './Money';
import { Text } from './Text';
import { Card, Icon, Row } from './ui';

/** The details of a scanned receipt: what was bought, GST and the total, and the photo if it was kept. */
export function ReceiptDetails({ receiptId, totalLaari }: { receiptId: string; totalLaari: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  const receipt = useReceipt(receiptId).data;
  const photo = useReceiptPhoto(receipt?.image_path).data;
  if (!receipt) return null;
  const itemsSum = receipt.items.reduce((s, i) => s + i.total_laari, 0);
  return (
    <Card>
      <Row>
        <Icon name="receipt-outline" color={colors.accent} />
        <Text variant="heading" style={{ flex: 1 }}>{t('receipt.title')}</Text>
      </Row>
      {receipt.status === 'needs_review' ? (
        <Row>
          <Icon name="warning" size={18} color={colors.amberDeep} />
          <Text variant="small" style={{ flex: 1 }}>{t('receipt.needsReview')}</Text>
        </Row>
      ) : null}
      {receipt.items.length === 0 ? <Text color={colors.inkMuted}>{t('receipt.noItems')}</Text> : receipt.items.map((i) => (
        <Row key={i.id} style={{ minHeight: 40 }}>
          <Text style={{ flex: 1 }}>{i.name}{i.qty !== 1 ? ` × ${i.qty}` : ''}</Text>
          <Money laari={i.total_laari} />
        </Row>
      ))}
      <View style={{ height: 1, backgroundColor: colors.line }} />
      {receipt.items.length > 0 ? <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('receipt.subtotal')}</Text><Money laari={itemsSum} /></Row> : null}
      {receipt.service_charge_laari ? <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('confirm.serviceCharge')}</Text><Money laari={receipt.service_charge_laari} /></Row> : null}
      {receipt.discount_laari ? <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('receipt.discount')}</Text><Money laari={receipt.discount_laari} prefix={'−'} /></Row> : null}
      {receipt.gst_laari ? <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('confirm.gst')}</Text><Money laari={receipt.gst_laari} /></Row> : null}
      <Row><Text variant="label" style={{ flex: 1 }}>{t('confirm.total')}</Text><Money laari={totalLaari} variant="heading" /></Row>
      {photo ? <Image accessibilityLabel={t('receipt.photo')} source={{ uri: photo }} resizeMode="contain" style={{ width: '100%', aspectRatio: 0.6, borderRadius: radius.md, marginTop: space.sm }} /> : null}
    </Card>
  );
}
