# Design

The visual system for Yusr (iOS first; Android follows). Built from the app, 2026-11-02. Product truth lives in `PRODUCT.md`.

## Direction: lagoon chart
A nautical chart of the lagoon. Deep green fading to shallows, hairline contour texture, and money read like water depth: the one hero per screen is a *depth card* with the figure that matters and a column showing where the rest of the money sits. Everything around the hero stays native and quiet. The world lends colour, one signature move and a sense of calm; navigation, lists, sheets and controls are the platform's.

## Colour (tokens in `src/lib/theme.ts`)
| Role | Light | Dark |
| --- | --- | --- |
| background | `#EAF2EF` sea-glass | `#071A14` |
| surface | `#FFFFFF` | `#0E2A22` |
| surfaceMuted (tracks, unselected chips) | `#DCEAE4` | `#16372E` |
| text | `#0F2A23` | `#E6F2EC` |
| secondaryText | `#4B6A60` | `#9DBBB0` |
| separator | `#D2E1DA` | `#1F3F35` |
| tint (the logo's green; every interactive element) | `#0D4E3A` | `#6FCBA6` |
| positive (money in) | `#13705F` | `#6FCBA6` |
| gold (the logo's flame, as text) | `#8A5A0E` | `#E0B260` |
| danger (overdue, destructive) | `#B4412F` | `#FF8F7F` |

All text pairs are at least 4.5:1 (measured). The depth card is always deep green (`#0D4E3A` to `#13705F`) with white text (5.98:1 or better), in both appearances. Red is only for overdue and destructive things.

## Type
**Nunito Sans** is the default for English (regular 400, semibold 600, bold 700, extra bold 800): rounded terminals and open letterforms that match the calm, friendly tone and the logo's loops. Its digits are tabular, so amounts line up. Dhivehi stays on the system Thaana font, because Nunito Sans has no Thaana glyphs. Text follows Dynamic Type. Amounts always render left-to-right, even in right-to-left layouts. Hero figure 38 pt extra bold; section titles 14 pt bold in the tint colour; rows 17 pt.

Implementation: every `Text` and `TextInput` comes from `src/components/Text.tsx`, which maps the style's weight to the font family for the weight (React Native needs one family name per weight). Navigation titles and tab labels get the same family through the navigation theme and the tab bar's label style. The invite and legal web pages use the system font (no third-party font requests).

## Shape and depth
Cards 16 pt radius, buttons 14 pt, the hero 20 pt. Depth is declared once, as a hairline outline on grouped lists; the hero has no shadow. No nested cards.

## Signature: the depth card (`src/components/DepthCard.tsx`)
Lead line, the figure, an optional note, then a column of segments sized by amount with a legend of real values. Home: spent, debt payments, giving, bills, and what is safe to spend. Debts: paid so far against still owed. Hairline contour lines are texture only. In private mode the column folds everything that is not safe into one hidden part, so the giving share can never be read from it.

## Components
- Grouped lists (`Group`, `Row`), segmented control, chips, primary and destructive buttons in `src/components/ui.tsx`.
- Empty states: a deep-green tile carrying the screen's own icon.
- Sign-in: the logo on a deep-green panel.
- SF Symbols on iOS, native tab bar, system action sheets, native search bar; none are restyled.

## Do and don't
- Do keep one hero per screen and let the rest be quiet.
- Do keep the figures real: every number in a card is the user's.
- Don't use gold or red for decoration; they carry meaning.
- Don't add gradients, glass or contour lines anywhere else.
