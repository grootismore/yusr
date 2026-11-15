# Promotion codes for Kharadhu Plus

Two kinds, because the stores own discounts and we own free access.

## Free Plus ($0): our own codes

Run these in the Supabase SQL editor for the production project (they work only as the owner, never from the app).

Make a code. It is printed once and only its hash is stored, so copy it straight away.

```sql
-- label (for you), days of Plus (null = for good), how many people can use it, last day it can be typed (null = no end)
select public.create_promo('Launch, friends and family', 90, 25, null);
select public.create_promo('Review copy for Ahmed', null, 1, now() + interval '14 days');
```

See how each code is doing.

```sql
select label, grants_days, uses, max_uses, valid_until, disabled, created_at
from public.promo_codes order by created_at desc;
```

Switch a code off (people who already used it keep what they got).

```sql
update public.promo_codes set disabled = true where label = 'Launch, friends and family';
```

Take Plus away from one person (find them by email).

```sql
update public.entitlements set plan = 'free', expires_at = now()
where user_id = (select id from auth.users where email = 'someone@example.com');
```

How a person uses it: More, Kharadhu Plus, "Have a code?", type it, Use code. A code works once per person, ten wrong tries an hour are the limit, and a person who already subscribes through the store keeps that and the code is not used up. Extending: using a second code adds its days after the current end.

## Discounts on the price: the stores' own offer codes

A discount has to come from the store, because the store takes the payment.
- **App Store**: App Store Connect, the subscription, Offers, Offer Codes. Make a code with a free period or a lower price and give people the code or its link.
- **Google Play**: Play Console, Monetize, Promo codes (or a subscription offer with a discount).

People redeem them through the "I have an App Store or Google Play offer code" button on the Plus screen, which opens the store's own box. That button works once the purchase provider is set up (see `src/lib/purchases.ts`; `redeemStoreCode()` is the stub). The store then reports the subscription and the server gives Plus the same way as a normal purchase.
