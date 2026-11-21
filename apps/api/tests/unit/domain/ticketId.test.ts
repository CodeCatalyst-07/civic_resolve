import { describe, it, expect } from 'vitest';
import { generateTicketId, isValidTicketId } from '../../../src/domain/ticketId.js';

describe('Public Ticket Identifier Generation & Validation (ticketId.ts)', () => {
  it('generates a valid Crockford Base32 ticket ID with "CR-" prefix', () => {
    const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]);
    const id = generateTicketId(bytes);

    expect(id).toMatch(/^CR-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(isValidTicketId(id)).toBe(true);
  });

  it('is completely deterministic given fixed random bytes', () => {
    const bytesA = new Uint8Array([0xfe, 0xdc, 0xba, 0x98, 0x76]);
    const bytesB = new Uint8Array([0xfe, 0xdc, 0xba, 0x98, 0x76]);

    const idA = generateTicketId(bytesA);
    const idB = generateTicketId(bytesB);

    expect(idA).toBe(idB);
  });

  it('never outputs ambiguous Crockford characters (I, L, O, U)', () => {
    // Test a wide variety of byte values across the 0-255 spectrum
    for (let i = 0; i < 50; i++) {
      const bytes = new Uint8Array([i * 5, i * 7, i * 11, i * 13, i * 17]);
      const id = generateTicketId(bytes);
      const codePart = id.slice(3);

      expect(codePart).not.toMatch(/[ILOUilou]/);
      expect(isValidTicketId(id)).toBe(true);
    }
  });

  it('throws programmer error if fewer than 5 bytes are provided', () => {
    expect(() => generateTicketId(new Uint8Array([]))).toThrow(/at least 5 bytes/);
    expect(() => generateTicketId(new Uint8Array([1, 2, 3, 4]))).toThrow(/at least 5 bytes/);
  });

  it('isValidTicketId correctly identifies valid and invalid IDs', () => {
    expect(isValidTicketId('CR-01234567')).toBe(true);
    expect(isValidTicketId('CR-ABCDEFGH')).toBe(true);
    expect(isValidTicketId('CR-7X2K9M4P')).toBe(true);

    // Invalid format, length, or prefix
    expect(isValidTicketId('CR-123')).toBe(false);
    expect(isValidTicketId('12345678')).toBe(false);
    expect(isValidTicketId('TK-01234567')).toBe(false);
    expect(isValidTicketId('CR-0123456789')).toBe(false);

    // Ambiguous characters rejected
    expect(isValidTicketId('CR-0123456I')).toBe(false); // 'I' rejected
    expect(isValidTicketId('CR-0123456L')).toBe(false); // 'L' rejected
    expect(isValidTicketId('CR-0123456O')).toBe(false); // 'O' rejected
    expect(isValidTicketId('CR-0123456U')).toBe(false); // 'U' rejected

    // Non-string arguments rejected
    expect(isValidTicketId(null as unknown as string)).toBe(false);
    expect(isValidTicketId(undefined as unknown as string)).toBe(false);
    expect(isValidTicketId(12345 as unknown as string)).toBe(false);
  });
});
