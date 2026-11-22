# Kharadhu design system (MASTER)

Source of truth for how Kharadhu looks and behaves. The code of record is `src/theme/tokens.ts`; this file says what the tokens mean and the rules around them. When building a screen, read this first.

> The `ui-ux-pro-max` generator was run for "personal finance budgeting, trustworthy mobile fintech". Its output was a landing-page pattern, glassmorphism, a dark-first palette with a violet accent and IBM Plex Sans. None of that fits: it is a web marketing result, glass is not flat, violet is banned in this app, and IBM Plex has no Thaana. It was **not adopted**. Only the rules that were checked against this app are kept below.

## Identity: "Ink and sky"
A calm, flat, money-first look. A dusty blue-grey page, lighter flat cards with a hairline rim, a near-black figure panel for the month's number, one soft sky accent. Dhivehi (Thaana, right to left) is the default; every rule below must hold in both directions.

## Colour (semantic roles, light / dark in `tokens.ts`)
| Role | Light | Use |
|---|---|---|
| ground | #CBD2D9 | page |
| card / surface | #E4E9EE | cards, rows; never pure white |
| cardEdge / line | #B7BFC8 | hairline rims and dividers (1px) |
| field | #D9DFE5 | inputs, chips |
| ink / inkMuted | #1E2023 / #4A4E54 | text and icons (AA on ground and card) |
| control | #69717A | borders of inputs and buttons (3:1) |
| accent / onAccent | #1E2023 / #FFFFFF | primary action, selected state |
| hero / onHero | #222428 / #FFFFFF | the month's figure panel |
| sky | #8EC5F0 | progress, the Left tile, active tab |
| amber / amberDeep / amberWash | #E0A526 / #8A5A00 / #F1E5C6 | close to the limit, warnings (fill only; icons use amberDeep) |
| income | #0F5A35 (dark #6FD0A0) | money coming in: the amount and its + on rows in Activity, Income and the shared lists; always with the + sign and words, never colour alone |
| coral / coralWash | #A52D26 / #F1DDD9 | over budget, errors |

**One meaning for state, everywhere** (bars, icons, text, switches): sky or ink = fine, amber = close, red = over. On the dark panel "over" is the light red `#FF8A7A`. Colour is never the only cue: an icon or words always go with it. Every text pair and control border is contrast-tested in `src/__tests__/theme.test.ts` (4.5:1 text, 3:1 controls), light and dark.

**Not allowed:** violet or lavender, gradients behind text, glass or blur as decoration, pure-white page, raw hex in screens (use `useColors()`).

## Type
- Thaana Noor (Regular, Bold) for Dhivehi; the phone's rounded system font for English, numbers and Latin words inside Dhivehi.
- Roles in `type` (`largeTitle, display, title, heading, body, small, label`). Thaana uses `dvSize` and a 1.75 line height; Latin tracking is never applied to Thaana.
- **Figures are tabular** (`fontVariant: tabular-nums` on every Text) so amounts align in lists and totals. Money is always formatted through `Money` / `fmt`, in integer laari.
- Body 17, small 15, label 15 semibold. Dynamic Type is followed up to 1.6x; never truncate a money figure (shrink or wrap).

## Space, shape, depth
- 4-pt grid: `space` xs 4, sm 8, md 12, lg 16, xl 24, xxl 32. Screen gutter 16.
- `radius`: sm 8, md 14, lg 22, pill 999; continuous corners (`borderCurve: 'continuous'`).
- **Depth:** cards and tiles are flat with a 1px rim. The only shadow is `LIFT`, for things that float (tab bar, plus button and menu, toast, dialog). Never add another shadow value.

## Components and rules
- **Primary action:** the round plus (Add) floats above the tab bar on every tab screen; one primary button per screen, full width, `Button kind="primary"`. Secondary is the outlined pill. Edit and Set limit use the same outlined pill.
- **Touch:** every control at least 44 pt (`TOUCH`); 8 pt between targets; hit slop where the glyph is smaller.
- **Icons:** one family (Ionicons), outline for rest, filled for selected. Direction-sensitive icons (chevrons, back arrows) mirror themselves in Dhivehi inside `Icon`; screens name the left-to-right icon only.
- **Lists:** `ListRow` with an icon tile, title, optional second line, trailing chevron. Date-grouped history.
- **Forms:** visible labels, helper text, error below the field with words, numeric keypad for amounts, Thaana keyboard for Dhivehi text (always left to right inside).
- **Feedback:** deleting an expense, income, debt, IOU or group asks first ("Delete this expense?"), and the button shows "Deleting…" with a spinner while it works; lightweight removals (an IOU payment, a saved person) skip the question and offer Undo; saves confirm briefly; empty states say what to do next and give the action.
- **Motion:** short, interruptible, never blocks input; respect reduced motion.

## Direction (Dhivehi first)
The app mirrors itself with a root `direction` style (the phone stays left to right). Use `start`/`end`, never `left`/`right`; physical layouts (the keyboard, charts' time axis rules) opt out explicitly. Latin and numbers inside Dhivehi text are isolated left to right.

## Search findings kept (ux domain, verified against the app)
Empty states need a message and an action; never convey state by colour alone; use the right keyboard per input; format large numbers readably; keep tappable content out of the safe areas and system bars; back must be predictable.
