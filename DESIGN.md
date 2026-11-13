# Design system (as shipped)

Source of truth is `src/theme/tokens.ts` and `src/components/ui.tsx`.

- **Look:** soft "Forest Night". Dark: green-black ground (`#0F1714`) with one pastel-mint accent (`#A9D9BA`). Light: pale sage ground (`#F2F6F1`) with a muted-pine accent. A pine `hero` panel carries the month's figure; pastel mint and lilac tiles hold numbers; the tab bar is a floating pine pill with a mint active icon. Cards are solid with a fine rim. Amber warns, coral means over budget; neither is ever colour alone. Every text pair is contrast-tested.
- **Type:** Thaana Noor for Dhivehi, Nunito Sans for English, numbers and amounts. Scale: display 32, title 24, heading 19, body 17, small 15. Thaana line height 1.75, Latin 1.4.
- **Space and shape:** 4 pt grid; radius 8/14/20 and pill; continuous corners.
- **Cards:** white surface with hairline and a soft lift in light mode; `hero` tone is the deep-green panel; warn/bad/good wash tones.
- **Components:** `ScreenTitle` (tab screens), `StackHeader` (pushed screens, back arrow mirrors in RTL), `ListRow` (icon tile, title, chevron), `Button` (primary, secondary, ghost, danger), `Chip`, `Field`, `ProgressBar` (animated, reduce-motion safe), `Money`.
- **Home:** teal hero with spent figure, progress, status pill; four shortcut tiles; debt, giving, top categories, recent.
- **Motion:** only the progress fill (450 ms ease-out); none under Reduce Motion.
