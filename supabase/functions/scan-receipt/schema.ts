import { CATEGORY_SLUGS } from './config.ts';

const str = { type: 'STRING' };
const nullableStr = { type: 'STRING', nullable: true };
const num = { type: 'NUMBER' };

/** Gemini responseSchema. Amounts are strings on purpose: they are parsed to integer laari in logic.ts, never as floats. */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_receipt: { type: 'BOOLEAN' },
    merchant: nullableStr,
    date: nullableStr,
    currency: nullableStr,
    total: nullableStr,
    gst: nullableStr,
    service_charge: nullableStr,
    discount: nullableStr,
    prices_include_gst: { type: 'BOOLEAN', nullable: true },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: str, qty: nullableStr, unit_price: nullableStr, total: str },
        required: ['name', 'total'],
        propertyOrdering: ['name', 'qty', 'unit_price', 'total'],
      },
    },
    category: { type: 'STRING', enum: [...CATEGORY_SLUGS] },
    confidence: {
      type: 'OBJECT',
      properties: { merchant: num, date: num, currency: num, total: num, gst: num, items: num, category: num },
      required: ['merchant', 'date', 'currency', 'total', 'gst', 'items', 'category'],
    },
  },
  required: ['is_receipt', 'merchant', 'date', 'currency', 'total', 'gst', 'items', 'category', 'confidence'],
  propertyOrdering: [
    'is_receipt', 'merchant', 'date', 'currency', 'total', 'gst', 'service_charge', 'discount',
    'prices_include_gst', 'items', 'category', 'confidence',
  ],
};
