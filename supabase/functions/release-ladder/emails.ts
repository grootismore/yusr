// Email copy for the check-in ladder. Calm, short, no pressure, no amounts, no names beyond the one the
// owner chose to show. English first, then a Dhivehi DRAFT that needs native-speaker review.
export interface Email { to: string; subject: string; text: string; html: string; key: string }

const stripTags = (s: string) => s.replace(/<a href="([^"]+)">([^<]*)<\/a>/g, '$2 ($1)').replace(/<[^>]+>/g, '');
const wrap = (en: string[], dv: string[]) => ({
  text: `${en.map(stripTags).join('\n\n')}\n\n---\n\n${dv.map(stripTags).join('\n\n')}\n\n(Dhivehi text is a draft pending review.)`,
  html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#15211F;max-width:520px">${en.map((p) => `<p>${p}</p>`).join('')}<hr style="border:none;border-top:1px solid #D8D1BF"><div dir="rtl" lang="dv">${dv.map((p) => `<p>${p}</p>`).join('')}</div></div>`,
});
const link = (url: string, label: string) => `<a href="${url}">${label}</a>`;

/** First or second check-in to the owner. Nothing is shared with anyone at these steps. */
export function ownerCheckin(step: 'first' | 'second', to: string, appUrl: string, userId: string): Email {
  const first = step === 'first';
  const { text, html } = wrap(
    [first ? "We haven't seen you in Kharadhu for a while." : 'A gentle second check-in from Kharadhu.',
     first ? `Please open the app to let us know you're okay: ${link(appUrl, 'open Kharadhu')}. If you're travelling or away, you can turn on away mode in the app.`
           : `If we don't hear from you in a week, we'll ask the people you trust to check on you. Open the app any time to stop that: ${link(appUrl, 'open Kharadhu')}.`,
     'Nothing has been shared with anyone.'],
    [first ? 'ގިނަ ދުވަސްވަންދެން ޚަރަދު ގައި ތިޔަބޭފުޅުން ފެނިފައެއް ނުވޭ.' : 'ޚަރަދު އިން ދެވަނަ ފަހަރަށް ހަމަޖެހިފައިވޭތޯ ބެލުން.',
     first ? `އެޕް ހުޅުވާލައްވާ، ހަމަޖެހިފައިވާކަން އަންގަވާ: ${link(appUrl, 'ޚަރަދު')}. ދަތުރުފުޅެއްގައިނަމަ އެޕްގައި "ދުރުގައި" މޯޑު ހުޅުވޭނެ.`
           : `ހަފްތާއެއްގެ ތެރޭ ޖަވާބެއް ނުލިބިއްޖެނަމަ ތިޔަބޭފުޅުން އިތުބާރުކުރާ މީހުންގެ ކިބައިން ބަލާލުމަށް އެދޭނަން. އެޕް ހުޅުވާލައްވައިގެން އެކަން ހުއްޓުވޭނެ: ${link(appUrl, 'ޚަރަދު')}.`,
     'އެއްވެސް މީހަކާ އެއްޗެއް ހިއްސާކުރެވިފައެއް ނުވޭ.'],
  );
  return { to, subject: first ? 'A quiet hello from Kharadhu' : 'A gentle second check-in', text, html, key: `ladder-${step}-${userId}` };
}

/** Ask a trusted contact to check on the person. Nothing is opened by this email. */
export function contactAsked(c: { id: string; email: string; inviter_name: string | null }, appUrl: string, userId: string): Email {
  const who = c.inviter_name ?? 'someone who trusts you';
  const { text, html } = wrap(
    [`${who} asked you to be one of the people they trust. We haven't been able to reach them for some time.`,
     `Please check on them if you can. Then ${link(`${appUrl}/contact`, 'tell us here')} that they are fine, or, only if you know that they have passed away, tell us that.`,
     "Nothing is shared with anyone because of this email. If they are well, one tap from you stops this."],
    [`${who} ތިޔަބޭފުޅުން އިތުބާރުކުރާ މީހެއްގެ ގޮތުގައި ހިމަނާފައިވޭ. ގިނަ ދުވަސްވަންދެން އެމީހަކާ ގުޅެވިފައެއް ނުވޭ.`,
     `ކުރެވެންޏާ އެމީހާގެ ހާލު ބަލާލައްވާ. ދެން ${link(`${appUrl}/contact`, 'މިތަނުން')} އެމީހާ ރަނގަޅުކަމަށް އަންގަވާ، ނުވަތަ ވަފާތުވެފައިވާކަން ޔަޤީންނަމަ އެކަން އަންގަވާ.`,
     'މި އީމެއިލްގެ ސަބަބުން އެއްވެސް މީހަކާ އެއްޗެއް ހިއްސާނުކުރެވޭ.'],
  );
  return { to: c.email, subject: 'Please check on someone who trusts you', text, html, key: `ladder-asked-${userId}-${c.id}` };
}

/** Straight away to the owner when a contact says they have passed away: they may be alive and can cancel. */
export function ownerPassedClaim(to: string, appUrl: string, key: string): Email {
  const { text, html } = wrap(
    ['A person you trust has told Kharadhu that you may have passed away.',
     `If you are well, please ${link(appUrl, 'open Kharadhu')} now. Opening the app cancels the process.`],
    ['ތިޔަބޭފުޅުން އިތުބާރުކުރާ މީހަކު ޚަރަދަށް އަންގާފައިވަނީ ތިޔަބޭފުޅުން ވަފާތުވެފައިވާނެ ކަމަށް.',
     `ތިޔަބޭފުޅުން ރަނގަޅުނަމަ މިހާރު ${link(appUrl, 'ޚަރަދު')} ހުޅުވާލައްވާ. އެޕް ހުޅުވުމުން މި މަސައްކަތް ހުއްޓޭ.`],
  );
  return { to, subject: 'Someone says you may have passed away', text, html, key };
}

/** After release: tell the contacts it is open, and the owner (in case this was a mistake). */
export function released(to: string, role: 'contact' | 'owner', inviterName: string | null, appUrl: string, userId: string, contactId = 'owner'): Email {
  const who = inviterName ?? 'the person who trusted you';
  const c = role === 'contact';
  const { text, html } = wrap(
    c ? [`Our condolences. ${who}'s list of debts and wishes is now available to you.`, `${link(`${appUrl}/contact`, 'Sign in to read it')} with this email address.`]
      : ['Your register has been opened to the people you trust.', 'If this is a mistake, please contact us straight away.'],
    c ? [`ތިޔަބޭފުޅުންގެ ހިތްހަމަޖެހުން ބޭނުންވޭ. ${who} ގެ ދަރަނި އަދި ވަސިއްޔަތުގެ ލިސްޓް މިހާރު ބަލާލެވޭނެ.`, `މި އީމެއިލް އެޑްރެހުން ${link(`${appUrl}/contact`, 'ސައިން އިން ވެ')} ބަލާލައްވާ.`]
      : ['ތިޔަބޭފުޅުންގެ ރެޖިސްޓަރު އިތުބާރުކުރާ މީހުންނަށް ހުޅުވިއްޖެ.', 'މިއީ ގޯހެއްނަމަ ވަގުތުން އަޅުގަނޑުމެންނާ ގުޅުއްވާ.'],
  );
  return { to, subject: c ? 'A list has been opened to you' : 'Your register has been opened', text, html, key: `ladder-released-${userId}-${contactId}` };
}
