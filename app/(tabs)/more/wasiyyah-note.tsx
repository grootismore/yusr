import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { HeaderTextButton, Screen } from '@/components/ui';
import { useSaveWasiyyahNote, useWasiyyahNote } from '@/features/transactions/hooks';
import { useColors } from '@/lib/theme';

const MAX = 5000;

export default function WasiyyahNoteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const stored = useWasiyyahNote();
  const save = useSaveWasiyyahNote();
  // Only written if the user actually edits it, so a note that has not loaded yet is never overwritten with a blank.
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? stored ?? '';

  return (
    <Screen>
      <PreventCapture />
      <Stack.Screen
        options={{
          title: t('wasiyyah.noteTitle'),
          headerRight: () => (
            <HeaderTextButton
              label={t('common.save')}
              onPress={() => {
                if (edited !== null) save(edited);
                router.back();
              }}
            />
          ),
        }}
      />
      <Text style={{ fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.noteHint')}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, minHeight: 220 }}>
        <TextInput
          accessibilityLabel={t('wasiyyah.noteTitle')}
          multiline
          maxLength={MAX}
          value={value}
          onChangeText={setEdited}
          textAlignVertical="top"
          style={{ minHeight: 188, fontSize: 17, color: colors.text }}
        />
      </View>
    </Screen>
  );
}
