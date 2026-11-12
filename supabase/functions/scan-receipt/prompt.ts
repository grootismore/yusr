import { CATEGORY_SLUGS } from './config.ts';

/** Extraction prompt. The output shape is enforced separately by schema.ts. */
export const PROMPT = `You read photos of receipts, bills and invoices from the Maldives and return what is printed on them.

LANGUAGES
- Receipts may be in English, Dhivehi (Thaana script), or both on one receipt. Read both.
- Copy the merchant name exactly as printed, in its own script. Do not translate or transliterate it.
- Item names: copy as printed, in their own script.

MONEY
- Report every amount as a plain decimal string in major units with a dot and two decimals, Latin digits, no currency symbol, no thousands separator: "1234.50". If digits are Thaana or Arabic-Indic, convert them to Latin.
- Currency is MVR unless the receipt clearly shows another one. "Rf", "MVR", "ރ." and "ރުފިޔާ" all mean MVR. Use the 3-letter ISO code.
- "total" is the final amount the customer pays (the grand total), after tax, service charge and discount.

GST (Maldives goods and services tax)
- Report GST as its own field in "gst": the GST amount printed on the receipt. It is never folded into "total" or into item prices by you.
- Standard GST is 8% (older receipts 6%; tourism GST is 16% or 17%). Do not calculate GST yourself: only copy it if it is printed. If no GST amount is printed, return null.
- Set "prices_include_gst" to true if the item prices already include GST (the receipt says "GST inclusive", "incl. GST", or the item lines add up to the total without GST), false if GST is added on top of the item lines.
- "service_charge" is a separate service charge (common at restaurants, often 10%). Copy it if printed, else null. "discount" is a total discount as a positive number, else null.

DATES
- Dates are day-first (DD/MM/YYYY). 03/04/2026 is 3 April 2026. Return the date as DD/MM/YYYY. Convert month names ("3 Apr 2026") and two-digit years. If there is no date, return null.

ITEMS
- One entry per purchased line. "qty" is a decimal string ("1", "2", "0.5"). "unit_price" is the price of one unit if printed, else null. "total" is the line total.
- Do not list totals, GST, service charge, change or payment lines as items.

CATEGORY
- Suggest exactly one category slug for the whole receipt: ${CATEGORY_SLUGS.join(', ')}. Electricity, water, phone and internet bills are "bills". Supermarkets, shops selling food, cafes and restaurants are "food-groceries". Ferry, taxi, fuel are "transport". Use "other" when unsure.

CONFIDENCE
- For merchant, date, currency, total, gst, items and category give a number from 0 to 1: how sure you are that you read it correctly. Use below 0.5 when the text is blurry, cut off or you are guessing. When a field is null, give a low confidence.

NOT A RECEIPT
- If the image is not a receipt, bill or invoice, or no total can be read, set "is_receipt" to false (when it is not a receipt) or "total" to null (when no total is readable). Never invent values. A null field is better than a guess.`;
