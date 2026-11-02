# Asset and font licenses (launch checklist 19)

| Asset | Source | License | Status |
| --- | --- | --- | --- |
| Ionicons via `@expo/vector-icons` | Ionic / Expo | MIT | OK |
| Yusr logo: app icon, adaptive and monochrome Android icons, splash, favicon, sign-in and web-page logos (`assets/*.png`, source in `assets/brand/logo-source.png`) | Artwork supplied by the developer (Mohamed Areesh) for this project; the derived sizes were cut from it with a script. **Confirm the developer owns the rights to it** (for example, if it was made with an image generator, check that tool's terms for commercial use) | Owned by the developer | OK once the rights are confirmed |
| Nunito Sans (regular, semibold, bold, extra bold), bundled through `@expo-google-fonts/nunito-sans` (`src/lib/useAppFonts.ts`) | Google Fonts, Nunito Sans by Vernon Adams, Jacques Le Bailly, Manvel Shmavonyan and Alexei Vanyashin | SIL Open Font License 1.1 (free to bundle in an app; the licence text ships in the package at `LICENSE_FONT`). Used for English only | OK |
| Thaana (Dhivehi) text | Nunito Sans has no Thaana glyphs, so Dhivehi stays on the device's system Thaana font | OS-provided | **Verify on real iOS and Android devices.** If a font must be bundled, record its license here (for example an OFL-licensed Thaana font) |
| Stock images / photographs | None used | n/a | OK |
| Store screenshots | None yet | n/a | Create from the real app; add alt text |

JavaScript dependencies are all permissively licensed through Expo's tree; run `npx license-checker --production --summary` before submission and attach the output.
