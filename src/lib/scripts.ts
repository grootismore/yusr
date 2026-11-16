/**
 * Dhivehi screens often hold English words: a debt called "Areesh MIB - Cycle", a friend's name, a merchant. Thaana Noor draws
 * Latin letters badly (wide gaps, odd shapes), so Latin runs are set in the phone's own font. A run starts and ends on a letter
 * or digit and may hold spaces and the usual joining marks inside ("MIB - Cycle", "St. John's", "5,554"); the Thaana words
 * and the spaces around it stay as they are.
 */
export interface Run { latin: boolean; text: string }

const LATIN_RUN = /[A-Za-z0-9](?:[A-Za-z0-9 .,:;'’/&@()%+#_\-–]*[A-Za-z0-9)%])?/g;

export function splitScripts(text: string): Run[] {
  const out: Run[] = [];
  let at = 0;
  for (const m of text.matchAll(LATIN_RUN)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ latin: false, text: text.slice(at, i) });
    out.push({ latin: true, text: m[0] });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ latin: false, text: text.slice(at) });
  return out;
}

export const hasLatin = (text: string): boolean => /[A-Za-z0-9]/.test(text);
