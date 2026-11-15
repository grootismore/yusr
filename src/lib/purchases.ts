/**
 * Buying Kharadhu Plus. The store products and the purchase provider (RevenueCat) are not set up yet, so every call
 * answers 'unavailable' and the Plus screen says subscriptions are opening soon. When they exist, only this file changes:
 * configure the provider with the public key, fetch the offering for the price, buy, and restore. The plan itself is
 * read from the server (entitlements), which the store webhook writes; the app never decides it alone.
 */
export type PurchaseResult = 'unavailable' | 'cancelled' | 'purchased' | 'failed';

export const purchasesReady = (): boolean => false;
export async function buyPlus(): Promise<PurchaseResult> { return 'unavailable'; }
export async function restorePurchases(): Promise<PurchaseResult> { return 'unavailable'; }
