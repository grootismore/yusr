# Asset and font licenses (launch checklist 19)

| Asset | Source | License | Status |
| --- | --- | --- | --- |
| Ionicons via `@expo/vector-icons` | Ionic / Expo | MIT | OK |
| App icon, adaptive icon, splash, favicon (`assets/*.png`) | Original mark (a "Y" of three strokes) drawn as SVG and rendered to PNG during Phase 5; no third-party artwork | Owned by the developer | OK. A designer can replace it later |
| Thaana (Dhivehi) text | No font is bundled; the device's system Thaana font is used | OS-provided | **Verify on real iOS and Android devices.** If a font must be bundled, record its license here (for example an OFL-licensed Thaana font) |
| Stock images / photographs | None used | n/a | OK |
| Store screenshots | None yet | n/a | Create from the real app; add alt text |

JavaScript dependencies are all permissively licensed through Expo's tree; run `npx license-checker --production --summary` before submission and attach the output.
