import { describe, it, expect } from 'vitest';

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB hexadecimal color code.
 * Reference: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number): number => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hexadecimal colors.
 * Contrast ratio is defined as (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter luminance.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

describe('Design System Contrast Ratios (WCAG 2.1 AA Compliance)', () => {
  const pairs = [
    // Core brand and body text
    { name: 'Ink text on Surface (white)', text: '#0F172A', bg: '#FFFFFF', minRatio: 4.5 },
    { name: 'Ink text on Page background', text: '#0F172A', bg: '#F6F7F9', minRatio: 4.5 },
    { name: 'White text on Primary Civic Blue', text: '#FFFFFF', bg: '#1D4ED8', minRatio: 4.5 },
    { name: 'White text on Accent Teal', text: '#FFFFFF', bg: '#0F766E', minRatio: 4.5 },

    // Urgency badges (text on tinted ~8% background)
    { name: 'Urgency Critical on tinted bg', text: '#B91C1C', bg: '#FEF2F2', minRatio: 4.5 },
    { name: 'Urgency High on tinted bg', text: '#C2410C', bg: '#FFF7ED', minRatio: 4.5 },
    { name: 'Urgency Medium on tinted bg', text: '#A16207', bg: '#FEFCE8', minRatio: 4.5 },
    { name: 'Urgency Low on tinted bg', text: '#475569', bg: '#F1F5F9', minRatio: 4.5 },

    // Status pills (text on tinted ~8% background)
    { name: 'Status Submitted on tinted bg', text: '#1D4ED8', bg: '#EFF6FF', minRatio: 4.5 },
    { name: 'Status Under Review on tinted bg', text: '#6D28D9', bg: '#F5F3FF', minRatio: 4.5 },
    { name: 'Status Assigned on tinted bg', text: '#0369A1', bg: '#F0F9FF', minRatio: 4.5 },
    { name: 'Status In Progress on tinted bg', text: '#115E59', bg: '#F0FDFA', minRatio: 4.5 },
    { name: 'Status Resolved on tinted bg', text: '#166534', bg: '#F0FDF4', minRatio: 4.5 },
    { name: 'Status Closed on tinted bg', text: '#475569', bg: '#F8FAFC', minRatio: 4.5 },
    { name: 'Status Rejected on tinted bg', text: '#991B1B', bg: '#FEF2F2', minRatio: 4.5 },
    { name: 'Status Reopened on tinted bg', text: '#C2410C', bg: '#FFF7ED', minRatio: 4.5 },

    // UI interactive components (min 3:1 ratio)
    { name: 'Focus ring on white surface', text: '#1D4ED8', bg: '#FFFFFF', minRatio: 3.0 },
    { name: 'Focus ring on page background', text: '#1D4ED8', bg: '#F6F7F9', minRatio: 3.0 },
  ];

  for (const pair of pairs) {
    it(`guarantees ${pair.name} (${pair.text} on ${pair.bg}) meets WCAG AA (ratio >= ${pair.minRatio}:1)`, () => {
      const ratio = getContrastRatio(pair.text, pair.bg);
      expect(ratio).toBeGreaterThanOrEqual(pair.minRatio);
    });
  }
});
