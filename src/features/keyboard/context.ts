import { createContext } from 'react';

/** What the on-screen keyboard can do to the text field that is being typed into. */
export interface KbTarget {
  id: string;
  press(char: string): void;
  backspace(): void;
  /** The return key: a new line in a multi-line field, otherwise done. */
  enter(): void;
  hide(): void;
  /** Hand this field to the phone's own keyboard (for English words). */
  system(): void;
  /** Where the field's bottom edge is on the screen, so the page can scroll it above the keyboard. */
  bottom(): Promise<number>;
}

/** A screen provides this so its fields can ask for the keyboard that sits at the bottom of that screen. */
export interface KbApi { activate(target: KbTarget): void; deactivate(id: string): void }
export const KbCtx = createContext<KbApi | null>(null);
