import { Share } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabaseApi } from '@/lib/query/supabaseApi';
import { consentsNeeded, LEGAL_VERSION, type ConsentKind } from './legal';

const deletionKey = (userId: string) => ['deletion-request', userId] as const;

/** ISO date the account will be erased, or null when no deletion is pending. */
export function useDeletionDate(): string | null {
  const userId = useAuth().session?.user.id ?? '';
  const { data } = useQuery({ queryKey: deletionKey(userId), queryFn: () => supabaseApi.fetchDeletionDate(), enabled: userId !== '' });
  return data ?? null;
}

/** Deleting or cancelling needs the server, so these fail straight away when offline. */
function useDeletionAction<R>(action: () => Promise<R>) {
  const userId = useAuth().session?.user.id ?? '';
  const client = useQueryClient();
  return useMutation<R, unknown, void>({
    networkMode: 'always',
    mutationFn: action,
    onSettled: () => client.invalidateQueries({ queryKey: deletionKey(userId) }),
  });
}

export const useRequestDeletion = () => useDeletionAction(() => supabaseApi.requestAccountDeletion());
export const useCancelDeletion = () => useDeletionAction(() => supabaseApi.cancelAccountDeletion());

/**
 * Hands the owner their data as JSON through the system share sheet, so it goes only where they choose.
 * ponytail: plain-text share; add a .json file via expo-file-system if testers ask for a file.
 */
export async function shareMyData(): Promise<void> {
  const data = await supabaseApi.exportMyData();
  await Share.share({ message: JSON.stringify(data, null, 2) });
}

const consentKey = (userId: string) => ['consents', userId] as const;

/**
 * Which consents the signed-in person still owes (a newer terms or privacy version). While the
 * answer is unknown, or when offline, nothing is asked: the gate only closes on a real answer.
 */
export function useConsentGate(): { checking: boolean; needed: ConsentKind[] } {
  const userId = useAuth().session?.user.id ?? '';
  const { data, isPending, fetchStatus } = useQuery({
    queryKey: consentKey(userId),
    queryFn: () => supabaseApi.fetchConsents(),
    enabled: userId !== '',
  });
  return { checking: userId !== '' && isPending && fetchStatus !== 'paused', needed: data ? consentsNeeded(data) : [] };
}

/** Records the consents given now; needs the server, so it fails straight away when offline. */
export function useRecordConsents() {
  const userId = useAuth().session?.user.id ?? '';
  const client = useQueryClient();
  return useMutation<void, unknown, readonly ConsentKind[]>({
    networkMode: 'always',
    mutationFn: (kinds) => supabaseApi.recordConsents(kinds, LEGAL_VERSION),
    onSettled: () => client.invalidateQueries({ queryKey: consentKey(userId) }),
  });
}
