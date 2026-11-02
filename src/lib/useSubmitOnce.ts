import { useRef } from 'react';

/**
 * Guards a form's Save against a second tap. The screen takes a moment to close, and every extra
 * tap used to create another record (five "Nanns" accounts). Call `claim()` once the form has
 * passed validation: it returns true the first time and false afterwards, so an invalid form can
 * still be corrected and saved.
 */
export function useSubmitOnce(): () => boolean {
  const done = useRef(false);
  return () => {
    if (done.current) return false;
    done.current = true;
    return true;
  };
}
