export interface DeleteDeps {
  getUserId(authHeader: string | null): Promise<string | null>;
  /** Remove every receipt photo under the user's folder. */
  removeFiles(userId: string): Promise<void>;
  /** Delete the auth user; the database cascades to every row they own (migrations 001-007). */
  deleteUser(userId: string): Promise<void>;
}

/**
 * The person asks to delete their own account. Only their own: the id comes from the verified token,
 * never from the request. Files first, then the account, so a failure part-way leaves nothing orphaned
 * that the person cannot retry.
 */
export async function handleDelete(req: { method: string; authHeader: string | null; body: unknown }, d: DeleteDeps): Promise<{ status: number; json: Record<string, unknown> }> {
  if (req.method !== 'POST') return { status: 405, json: { error: 'method_not_allowed' } };
  const userId = await d.getUserId(req.authHeader);
  if (!userId) return { status: 401, json: { error: 'unauthorized' } };
  // An explicit confirmation, so a stray request cannot delete anything.
  if ((req.body as { confirm?: unknown } | null)?.confirm !== 'delete') return { status: 400, json: { error: 'confirmation_required' } };
  try {
    await d.removeFiles(userId);
    await d.deleteUser(userId);
    return { status: 200, json: { ok: true } };
  } catch {
    return { status: 500, json: { error: 'delete_failed' } };
  }
}
