# Asset and font licenses (launch checklist 19)

| Asset | Source | License | Status |
| --- | --- | --- | --- |
| Ionicons via `@expo/vector-icons` | Ionic / Expo | MIT | OK |
| Yusr logo: app icon, adaptive and monochrome Android icons, splash, favicon, sign-in and web-page logos (`assets/*.png`, source in `assets/brand/logo-source.png`) | Artwork supplied by the developer (Mohamed Areesh) for this project; the derived sizes were cut from it with a script. **Confirm the developer owns the rights to it** (for example, if it was made with an image generator, check that tool's terms for commercial use) | Owned by the developer | OK once the rights are confirmed |
| Thaana (Dhivehi) text | No font is bundled; the device's system Thaana font is used | OS-provided | **Verify on real iOS and Android devices.** If a font must be bundled, record its license here (for example an OFL-licensed Thaana font) |
| Stock images / photographs | None used | n/a | OK |
| Store screenshots | None yet | n/a | Create from the real app; add alt text |

JavaScript dependencies are all permissively licensed through Expo's tree; run `npx license-checker --production --summary` before submission and attach the output.
