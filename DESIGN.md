# Design system (as shipped)

Source of truth is `src/theme/tokens.ts` and `src/components/ui.tsx`.

- **Look:** "Ink and sky". A light page (`#F5F5F3`), white cards with a fine rim, text and icons in matte black (`#1E2023`), a matte-black figure panel (`#222428`) and one soft sky-blue (`#8EC5F0`) for progress, the Left tile and the active tab. Dark mode keeps the matte panel on a charcoal ground (`#141517`) and the buttons turn sky blue. Tab bar is a floating matte pill. Amber warns, coral means over budget; neither is ever colour alone. Every text pair is contrast-tested.
- **Type:** Thaana Noor for Dhivehi, Nunito Sans for English, numbers and amounts. Scale: display 32, title 24, heading 19, body 17, small 15. Thaana line height 1.75, Latin 1.4.
- **Space and shape:** 4 pt grid; radius 8/14/20 and pill; continuous corners.
- **Cards:** white surface with hairline and a soft lift in light mode; `hero` tone is the deep-green panel; warn/bad/good wash tones.
- **Components:** `ScreenTitle` (tab screens), `StackHeader` (pushed screens, back arrow mirrors in RTL), `ListRow` (icon tile, title, chevron), `Button` (primary, secondary, ghost, danger), `Chip`, `Field`, `ProgressBar` (animated, reduce-motion safe), `Money`.
- **Home:** teal hero with spent figure, progress, status pill; four shortcut tiles; debt, giving, top categories, recent.
- **Motion:** only the progress fill (450 ms ease-out); none under Reduce Motion.
