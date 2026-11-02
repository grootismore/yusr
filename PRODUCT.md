# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users
Maldivian Muslim adults, 22 to 55, salaried or self-employed, using MVR, banking with BML, MCB, SDFC or Maldives Islamic Bank, comfortable in Dhivehi or English. They open the app for small daily jobs: log an expense, see what is safe to spend, check a debt, record a gift, and (rarely, with care) prepare what their family would need to know.

## Product Purpose
One iOS and Android app to manage income, expenses, debts and giving in an Islamic way, and to leave a secure record for the family. Debts and trusts (amanah) sit in one place so nothing is left hidden. Motivating case: a friend of the author died owing about MVR 200,000 to banks nobody knew about. Success: users log transactions in week one, add their debts, and name a trusted contact.

## Positioning
Budget apps ignore zakat, sadaqah and riba and the family's duty to settle a deceased person's debts first. Yusr treats those as first-class: derived balances, a debt-first payoff view, giving commitments on the Hijri calendar, and a Wasiyyah register shared only with people the owner chooses.

## Operating Context
Used one-handed, in short sessions, often on poor connectivity (offline-first with a queue). Full Dhivehi (Thaana, right-to-left) and English from day one. Light and dark appearance. Amounts are integer laari (MVR). Zakat and inheritance screens are guidance only and show their assumptions.

## Capabilities and Constraints
Native iOS conventions (HIG), VoiceOver, Dynamic Type, 44 pt targets. Expo / React Native, Expo Router, native tab bar and native stacks with large titles. Android follows the iOS-first design with standard components. No amounts, lenders or notes in analytics. The automated release flow is not built; the owner shares the register manually.

## Brand Commitments
Name: Yusr (Arabic for "ease"). Logo (`assets/brand/logo-source.png`): a cream looping mark with a gold flame on deep green `#0D4E3A`; the developer's own artwork. Voice: calm and respectful, never guilt, streaks or gamified giving.

## Evidence on Hand
Real app on device (screen recording, 2026-11-02), the PRD (`docs/PRD.md`), the logo above. No user testimonials, metrics or store ratings exist yet; none must be invented.

## Product Principles
1. Privacy first: financial data and giving are sensitive; amounts can be hidden.
2. Guidance, not fatwa: show assumptions, never claim a ruling.
3. Calm and respectful: dignity over delight; no pressure mechanics.
4. Works anywhere: offline-tolerant, logging an expense is fast.
5. Dhivehi is a first-class language, not a translation.

## Accessibility & Inclusion
WCAG AA contrast in light and dark, including Thaana text; Dynamic Type; VoiceOver labels; right-to-left layouts that mirror correctly. Design must not rely on colour alone.

## Design Constraints (confirmed by the owner, 2026-11-02)
The redesign should avoid: too playful or flashy, too bank-like or corporate, and anything that makes Dhivehi hard to read. First pass covers all screens; the owner wants the UI to feel less like a generic placeholder Apple prototype.
