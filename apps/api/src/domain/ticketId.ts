/**
 * Crockford's Base32 alphabet: 32 alphanumeric symbols excluding ambiguous letters 'I', 'L', 'O', and 'U'.
 */
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const TICKET_ID_REGEX = /^CR-[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * Generates an unguessable public tracking ticket identifier (e.g. `CR-7X2K9M4P`).
 *
 * ### Security & Privacy Design:
 * Ticket IDs are intentionally **non-sequential and non-guessable**, derived from injected random bytes.
 * This prevents malicious enumeration, scraping, or brute-force tracking of sensitive citizen complaints
 * on the public tracking portal.
 *
 * @param randomBytes - At least 5 bytes (40 bits) of injected randomness
 * @returns Formatted ticket tracking ID (e.g. "CR-7X2K9M4P")
 * @throws Error if randomBytes contains fewer than 5 bytes (programmer error)
 */
export function generateTicketId(randomBytes: Uint8Array): string {
  if (!randomBytes || randomBytes.length < 5) {
    throw new Error('generateTicketId requires at least 5 bytes of injected randomness.');
  }

  const b0 = randomBytes[0]!;
  const b1 = randomBytes[1]!;
  const b2 = randomBytes[2]!;
  const b3 = randomBytes[3]!;
  const b4 = randomBytes[4]!;

  // Unpack 40 bits into 8 5-bit indices
  const indices = [
    (b0 >> 3) & 0x1f,
    ((b0 & 0x07) << 2) | ((b1 >> 6) & 0x03),
    (b1 >> 1) & 0x1f,
    ((b1 & 0x01) << 4) | ((b2 >> 4) & 0x0f),
    ((b2 & 0x0f) << 1) | ((b3 >> 7) & 0x01),
    (b3 >> 2) & 0x1f,
    ((b3 & 0x03) << 3) | ((b4 >> 5) & 0x07),
    b4 & 0x1f,
  ];

  let code = '';
  for (const idx of indices) {
    code += CROCKFORD_ALPHABET.charAt(idx);
  }

  return `CR-${code}`;
}

/**
 * Validates whether a given string is a correctly formatted CivicResolve ticket ID.
 *
 * @param id - The ID string to validate
 * @returns True if id matches format `CR-XXXXXXXX` in Crockford Base32
 */
export function isValidTicketId(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  return TICKET_ID_REGEX.test(id);
}
