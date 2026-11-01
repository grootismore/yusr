# Yusr legal drafts for review

Prepared 2026-11-01 for **Mohamed Areesh**, sole developer (not a registered business). Contact: mohamedareesh@proton.me. Postal address: **still needed**.

## How to use this document

**For the Maldivian lawyer** - please check, and mark up directly:

- Whether the terms and the guidance-only disclaimers hold under Maldivian law, and the liability and governing-law wording (flagged in the Terms).
- Whether the privacy policy meets Maldivian data-protection and consumer rules, and whether a sole developer must register or appoint anyone.
- The claim that a wasiyyah register is an aid and not a will, and the manual-share model for trusted contacts.
- How long backups may keep data after deletion (the policy says they expire on the provider's schedule).
- Anything that should be added: complaints process, minimum age, governing court.

**For the Dhivehi reader** - the full text is English; each page has a short Dhivehi summary in a quoted box. Please check meaning, tone and Thaana spelling, and say whether a full Dhivehi translation is needed (the store listings and the checklist ask for English and Dhivehi).

**Not legal advice.** These are drafts prepared by the developer's assistant, to be corrected by the reviewers.

---

## Privacy Policy

This policy explains what Yusr ("the app", "we") collects, why, who handles it, and the choices you have. It is written to be read, not skimmed past. Mohamed Areesh (sole developer, not a registered business) is responsible for your data. You must be 18 or older to use Yusr.

### What we collect

  - **Account:** your email address and a password (stored as a hash by our authentication provider, never readable by us), and the language and display preferences you choose.
  - **What you enter:** accounts, transactions, categories, debts and what is owed to you, giving commitments, recurring bills and income. Debt reference numbers, debt notes and your Wasiyyah instruction note are stored encrypted.
  - **Trusted contacts:** the name and email address (and optional phone number) of each person you invite, and whether they accepted. We collect this only when you invite someone, with your specific consent.
  - **Records about your use:** when you accepted the terms, privacy policy and age confirmation; an audit log of register events (for example an invite, a revoke or a share). The audit log holds no amounts, names or note text.
  - **Abuse protection:** when someone opens an invite link we keep a one-way hash of their network address for an hour-long attempt counter. We cannot recover the address from it.

### What we do not collect

Bank passwords, PINs, card numbers and national ID numbers. Please do not type them into notes. No advertising, analytics or crash-reporting service is used: we do not track you across apps or websites, and amounts, lenders and notes are never sent to such services.

### How we use it

Only to run the app for you: sign you in, show and sync your data across your devices, send you reminders on your device, and let you share your register with people you choose. We do not sell your data or use it for advertising.

### Who handles it

  - **Supabase** hosts our database, sign-in and server functions. Your data is stored there, encrypted at rest.
  - **Netlify** hosts this website and the invite page. Standard web-server logs apply. The secret in an invite link is placed after a # so it is not sent to the server.
  - We do not currently use an email-delivery, push-notification or crash-reporting service. Reminders are scheduled on your device. If this changes, we will update this policy first.

### Your Wasiyyah register and trusted contacts

Nothing is released to your trusted contacts automatically. For now, you decide when to share your register, and each share is written to your audit log. If we later add automatic release, it will need confirmation from your trusted contacts, will be off unless you turn it on, and this policy will be updated first. Yusr does not give inheritance rulings or work out shares.

### An honest limit

Encrypted fields are protected from other users and from outsiders, but the people who operate the Yusr database could technically decrypt them. We plan end-to-end encryption in a later release. Until then, do not store anything in Yusr you would not be comfortable with that limit.

### How long we keep it

Until you delete your account. When you ask to delete, we wait 7 days (you can cancel at any time), then permanently erase your data, contacts, register and records. Copies in database backups are removed as backups expire on our provider's schedule. Data you already shared outside Yusr cannot be recalled by us.

### Your choices

  - **Export** a copy of your data from Settings → Your data.
  - **Delete** your account from Settings → Your data, or see how to request deletion (/delete-account/).
  - **Correct** anything you entered, at any time in the app.
  - **Withdraw** a trusted contact's invitation at any time.
  - Questions or complaints: mohamedareesh@proton.me (mailto:mohamedareesh@proton.me).

### Changes

If we change this policy in a way that matters, we will tell you in the app before it applies, and you will be asked to accept the new version.

> **Dhivehi summary (DV reader: please check wording and Thaana)**
>

  
### ޚުލާޞާ (ދިވެހި)

  ޔުސްރުން އެއްކުރާނީ ތިބޭފުޅުންގެ އީމެއިލާއި ތިބޭފުޅުން ޖަމާކުރާ ފައިސާއާބެހޭ މަޢުލޫމާތު ކަމުގައި ވާނެ. ބޭންކް ޕާސްވޯޑް، ކާޑް ނަންބަރު، އައިޑީ ނަންބަރު އެއްކުރެއް ނުވޭ. އިޝްތިހާރު ނުވަތަ ޓްރެކިންގ ޚިދުމަތެއް ބޭނުން ނުކުރޭ. ސިއްރު ފީލްޑްތައް އެންކްރިޕްޓް ކުރެވިފައި ހުރި ނަމަވެސް، ޑޭޓާބޭސް ހިންގާ ފަރާތަކަށް ކެރިދާނެ. އެކައުންޓް ފޮހެލުމަށް އެދެވިދާނެ؛ 7 ދުވަސް ފަހުން ހުރިހާ ޑޭޓާ ފުހެވޭ.

---

## Terms of Service

These terms are between you and Mohamed Areesh (sole developer, not a registered business) ("we") for the Yusr app. By creating an account you agree to them. If you do not, please do not use Yusr.

### Who can use Yusr

You must be 18 or older. Yusr is not for children and is not marketed to them.

### Guidance only

Yusr helps you keep track of money and prepare information for your family. It is **not** financial, legal, tax or religious advice, and nothing in it is a fatwa. Zakat figures, debt plans and similar screens show their assumptions so you can check them. For rulings on zakat, inheritance or the wasiyyah, ask a qualified scholar; for legal matters, a lawyer. Your wasiyyah register in Yusr is an aid to your family; it is not a will and does not replace a legally valid one.

### Your account and content

Keep your sign-in secure. You are responsible for what you enter and for the people you invite as trusted contacts; only invite people you trust and who agree to be invited. Do not use Yusr for anything unlawful, to harass anyone, or to store other people's private information without their permission. Do not store bank passwords, PINs, card numbers or ID numbers.

### Trusted contacts and sharing

Inviting a contact shares their name and email address with our systems so the invitation works. Contacts can see your register only if you share it with them or, in a future version, if a release you have switched on is confirmed by them. We cannot promise that any person will act as you wish. We cannot recall what you have already shared.

### Availability

We work to keep Yusr running, but it may be unavailable at times and may contain mistakes. Keep your own records of anything important. You can export your data at any time.

### Cost

Yusr is free. See the Refund Policy (/refunds/).

### Ending your use

You can delete your account at any time (how (/delete-account/)). We may suspend accounts that break these terms or put others at risk.

### Liability

Yusr is provided as is. To the extent the law allows, we are not liable for losses from your reliance on figures, plans or reminders in the app, from data you chose to share, or from service interruptions. Nothing here limits rights you cannot lawfully give up. **[Lawyer to confirm the wording and the governing law of the Maldives.]**

### Changes and contact

If we change these terms in a way that matters, you will be asked to accept the new version in the app. Questions: mohamedareesh@proton.me (mailto:mohamedareesh@proton.me).

> **Dhivehi summary (DV reader: please check wording and Thaana)**
>

  
### ޚުލާޞާ (ދިވެހި)

  ޔުސްރު ބޭނުންކުރެވޭނީ އަހަރު 18 ފުރިފައިވާ ބަޔަކަށް. މި އެޕަކީ ރަނގަޅު މަޢުލޫމާތު ދިނުމަށް އެހީތެރިވާ އެއްޗެއް؛ މާލީ، ގާނޫނީ، ޝަރުޢީ ފަތުވާއެއް ނޫން. ޒަކާތާއި ވާރުތަވެރިކަމާއި ވަޞިއްޔަތާބެހޭ ޙުކުމްތަކަށް ޢިލްމުވެރިއަކާ ސުވާލުކުރައްވާ. މި އެޕް ހުރިހާ ދުވަހަކު ހުންނާނެ ކަމުގެ ޔަޤީންކަން ނުދެވޭ. އެކައުންޓް ދުވަހަކުވެސް ފޮހެލެވޭނެ. އެޕް ހިލޭ.

---

## Cookie Policy

The Yusr app itself uses no cookies. This website and the invite page use **no cookies and no browser storage at all** (no localStorage, sessionStorage or similar), no analytics and no advertising tools. Because nothing optional is used, there is no cookie banner to accept or reject.

### What your browser does send

  - Our web host (Netlify) receives the usual technical request details (such as your network address and browser type) in its server logs when a page is loaded.
  - On the invite page, the secret in your invitation link comes after a # and is not sent to the web host. The page sends it only to our server function to check or answer your invitation.

If we ever add anything optional, it will be off until you choose to turn it on, with equally clear Accept and Reject buttons, and we will list it here first.

> **Dhivehi summary (DV reader: please check wording and Thaana)**
>

  
### ޚުލާޞާ (ދިވެހި)

  މި ވެބްސައިޓާއި ދައުވަތު ސަފްޙާއިން ކުކީސް ނުވަތަ ބްރައުޒަރ ސްޓޯރޭޖް ބޭނުން ނުކުރޭ. އެނަލިޓިކްސް ނުވަތަ އިޝްތިހާރު ޓޫލްސްވެސް ނެތް.

---

## Refund Policy

Yusr is free. There is nothing to buy, so there is nothing to refund, and we never charge you for using it.
If we ever add a paid option, its price will be shown before you commit, and purchases would be handled by the Apple App Store or Google Play, whose refund rules apply: Apple (https://support.apple.com/en-us/118223) · Google Play (https://support.google.com/googleplay/answer/2479637). We would update this page first.

> **Dhivehi summary (DV reader: please check wording and Thaana)**
>

  
### ޚުލާޞާ (ދިވެހި)

  ޔުސްރު ހިލޭ. ފައިސާ ދައްކަން ނުޖެހޭ، އެހެންކަމުން ރިފަންޑް ކުރާކަށްވެސް ނެތް.

---

## Account deletion page

This page is for the Yusr app published by Mohamed Areesh (sole developer, not a registered business). You can delete your account and everything in it.

### In the app (fastest)

  - Open Yusr and sign in.
  - Go to **More → Settings → Your data → Delete account**.
  - Read what will be deleted, type your email address to confirm, and tap **Delete my account**.

### If you cannot open the app

Email mohamedareesh@proton.me (mailto:mohamedareesh@proton.me?subject=Delete%20my%20Yusr%20account) from the email address used for your Yusr account, with the subject "Delete my Yusr account". We will reply to that address to confirm it is you before we start. Please do not send passwords or other private details.

### What is deleted, and when

  - Your accounts, transactions, categories and budgets.
  - Your debts and amounts owed to you, including encrypted reference numbers and notes.
  - Your giving commitments and recurring items.
  - Your Wasiyyah note and register, your trusted contacts and any invitations.
  - Your audit log, consent records, profile and sign-in.

Everything is permanently erased **7 days after you confirm**. Until then you can open the app and tap **Keep my account** to cancel. Copies in database backups disappear as the backups expire. Anything you already shared outside Yusr stays with the people you sent it to.

> **Dhivehi summary (DV reader: please check wording and Thaana)**
>

  
### ޚުލާޞާ (ދިވެހި)

  އެޕްގައި: ސެޓިންގްސް ← ތިބޭފުޅުންގެ ޑޭޓާ ← އެކައުންޓް ފޮހެލާ. ކަށަވަރު ކުރުމަށް އީމެއިލް ޓައިޕް ކުރައްވާ. 7 ދުވަސް ފަހުން ހުރިހާ ޑޭޓާ ދާއިމީކޮށް ފުހެވޭ؛ އެއަށްވުރެ ކުރިން "އެކައުންޓް ބަހައްޓާ" އަށް ފިތާލުމުން ކެންސަލް ކުރެވޭ.

---
