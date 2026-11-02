# Asset and font licenses (launch checklist 19)

| Asset | Source | License | Status |
| --- | --- | --- | --- |
| Ionicons via `@expo/vector-icons` | Ionic / Expo | MIT | OK |
| Yusr logo: app icon, adaptive and monochrome Android icons, splash, favicon, sign-in and web-page logos (`assets/*.png`, source in `assets/brand/logo-source.png`) | Artwork supplied by the developer (Mohamed Areesh) for this project; the derived sizes were cut from it with a script. **Confirm the developer owns the rights to it** (for example, if it was made with an image generator, check that tool's terms for commercial use) | Owned by the developer | OK once the rights are confirmed |
| Nunito Sans (regular, semibold, bold, extra bold), bundled through `@expo-google-fonts/nunito-sans` (`src/lib/useAppFonts.ts`) | Google Fonts, Nunito Sans by Vernon Adams, Jacques Le Bailly, Manvel Shmavonyan and Alexei Vanyashin | SIL Open Font License 1.1 (free to bundle in an app; the licence text ships in the package at `LICENSE_FONT`). Used for English only | OK |
| MV Faseyha, Regular and Bold (`assets/fonts/MV_Faseyha_*.ttf`), the default Dhivehi font | Calligraphy and design Abdulla Waheed; management and editing Hassan Shujau and Hassan Hameed; digital remapping Ahmed Niyaz (credits as supplied by the developer). The font file's own copyright line reads "© Hassan Hameed". Obtained from the Thaana Font Gallery (https://www.thaanafontgallery.com/font/mv-faseyha) | Listed there as "Free for personal & commercial use" (checked 2026-11-02). The font files say "May be used for all legitimate purposes" (Regular) and "... under Maldivian Law" (Bold), and their embedding flag allows embedding. The gallery's terms (https://www.thaanafontgallery.com/terms/) defer to each font's own licence and do not mention bundling in an app | Credited in Settings > About (`app/(tabs)/more/about.tsx`). **Recommended:** a short written confirmation from the font's author (hassanhameed.com) that bundling it in an app is fine |
| Stock images / photographs | None used | n/a | OK |
| Store screenshots | None yet | n/a | Create from the real app; add alt text |

JavaScript dependencies are all permissively licensed through Expo's tree; run `npx license-checker --production --summary` before submission and attach the output.
