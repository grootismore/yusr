import { getSupabase } from '@/lib/supabase/client';
import { createRowApi } from './api';

/** The app's RowApi, backed by the signed-in Supabase client. */
export const supabaseApi = createRowApi(getSupabase);
