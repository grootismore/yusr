# Asset and font licenses (launch checklist 19)

| Asset | Source | License | Status |
| --- | --- | --- | --- |
| Ionicons via `@expo/vector-icons` | Ionic / Expo | MIT | OK |
| Yusr logo: app icon, adaptive and monochrome Android icons, Android notification icon, splash, favicon, sign-in and web-page logos (`assets/*.png`, source in `assets/brand/logo-source.png`) | The developer's own artwork (Mohamed Areesh, confirmed 2026-11-02); the derived sizes were cut from it with a script | Owned by the developer | OK |
| Nunito Sans (regular, semibold, bold, extra bold), font files kept in the repo (`assets/fonts/NunitoSans_*.ttf`, licence text in `assets/fonts/OFL-NunitoSans.txt`) and bundled in the app (`src/lib/useAppFonts.ts`); nothing is downloaded | Google Fonts, Nunito Sans by Vernon Adams, Jacques Le Bailly, Manvel Shmavonyan and Alexei Vanyashin | SIL Open Font License 1.1 (free to bundle in an app; the licence text ships in the package at `LICENSE_FONT`). Used for English only | OK |
| MV Faseyha, Regular and Bold (`assets/fonts/MV_Faseyha_*.ttf`), the default Dhivehi font | Calligraphy and design Abdulla Waheed; management and editing Hassan Shujau and Hassan Hameed; digital remapping Ahmed Niyaz (credits as supplied by the developer). The font file's own copyright line reads "© Hassan Hameed". Obtained from the Thaana Font Gallery (https://www.thaanafontgallery.com/font/mv-faseyha) | Listed there as "Free for personal & commercial use" (checked 2026-11-02). The font files say "May be used for all legitimate purposes" (Regular) and "... under Maldivian Law" (Bold), and their embedding flag allows embedding. The gallery's terms (https://www.thaanafontgallery.com/terms/) defer to each font's own licence and do not mention bundling in an app | Credited in Settings > About (`app/(tabs)/more/about.tsx`). The owner's decision (2026-11-02): no further confirmation needed, because the font is listed as free for personal and commercial use |
| Stock images / photographs | None used | n/a | OK |
| Store screenshots | None yet | n/a | Create from the real app; add alt text |

JavaScript dependencies are all permissively licensed through Expo's tree; run `npx license-checker --production --summary` before submission and attach the output.
