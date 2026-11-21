import { describe, it, expect } from 'vitest';

/**
 * Calculates WCAG 2.x relative luminance for an sRGB hexadecimal color code.
 * Follows exact W3C specification with sRGB linearisation (IEC 61966-2-1).
 * Reference: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number): number => {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates WCAG 2.x contrast ratio between two hexadecimal colors.
 * Contrast ratio is defined as (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter luminance.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

describe('Design System Contrast Ratios (WCAG 2.x Precision & Reference Validation)', () => {
  describe('Mathematical Reference Assertions', () => {
    it('verifies black on white produces an exact 21:1 ratio', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBe(21.0);
    });

    it('verifies #767676 on white produces the standard ~4.54:1 ratio', () => {
      const ratio = getContrastRatio('#767676', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeLessThanOrEqual(4.56);
    });

    it('verifies white on white produces an exact 1:1 ratio', () => {
      expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBe(1.0);
    });
  });

  const pairs = [
    // Core brand and body text (WCAG AA >= 4.5:1)
    { name: 'Ink text on Surface (white)', text: '#0F172A', bg: '#FFFFFF', minRatio: 4.5 },
    { name: 'Ink text on Page background', text: '#0F172A', bg: '#F6F7F9', minRatio: 4.5 },
    { name: 'White text on Primary Civic Blue', text: '#FFFFFF', bg: '#1D4ED8', minRatio: 4.5 },
    { name: 'White text on Accent Teal', text: '#FFFFFF', bg: '#0F766E', minRatio: 4.5 },
    { name: 'Secondary text (slate-600) on white', text: '#475569', bg: '#FFFFFF', minRatio: 4.5 },
    { name: 'Secondary text (slate-600) on page background', text: '#475569', bg: '#F6F7F9', minRatio: 4.5 },
    { name: 'Placeholder text (slate-500) on white', text: '#64748B', bg: '#FFFFFF', minRatio: 4.5 },
    { name: 'Link text (Primary blue) on white', text: '#1D4ED8', bg: '#FFFFFF', minRatio: 4.5 },
    { name: 'Teal accent text on white', text: '#0F766E', bg: '#FFFFFF', minRatio: 4.5 },

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

    // Authority dashboard UI pairs
    { name: 'Selected table row text on tinted bg', text: '#0F172A', bg: '#EFF6FF', minRatio: 4.5 },
    { name: 'Overdue tag text on tinted orange bg', text: '#C2410C', bg: '#FFF7ED', minRatio: 4.5 },
    { name: 'Change marker automatic text on blue tint', text: '#1D4ED8', bg: '#EFF6FF', minRatio: 4.5 },
    { name: 'Change marker staff text on teal tint', text: '#0F766E', bg: '#F0FDFA', minRatio: 4.5 },

    // UI interactive controls & borders (WCAG 1.4.11 Non-text contrast >= 3.0:1)
    { name: 'Focus ring on white surface', text: '#1D4ED8', bg: '#FFFFFF', minRatio: 3.0 },
    { name: 'Focus ring on page background', text: '#1D4ED8', bg: '#F6F7F9', minRatio: 3.0 },
    { name: 'Form control border (slate-500) on white surface', text: '#64748B', bg: '#FFFFFF', minRatio: 3.0 },
    { name: 'Form control border (slate-500) on page background', text: '#64748B', bg: '#F6F7F9', minRatio: 3.0 },
    { name: 'KPI Critical accent bar on white card', text: '#B91C1C', bg: '#FFFFFF', minRatio: 3.0 },
    { name: 'KPI Overdue accent bar on white card', text: '#C2410C', bg: '#FFFFFF', minRatio: 3.0 },
    { name: 'Table selected row left accent bar on white', text: '#1D4ED8', bg: '#FFFFFF', minRatio: 3.0 },
  ];

  for (const pair of pairs) {
    it(`guarantees ${pair.name} (${pair.text} on ${pair.bg}) meets WCAG AA (ratio >= ${pair.minRatio}:1)`, () => {
      const ratio = getContrastRatio(pair.text, pair.bg);
      expect(ratio).toBeGreaterThanOrEqual(pair.minRatio);
    });
  }
});
