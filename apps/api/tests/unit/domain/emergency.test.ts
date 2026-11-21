import { describe, it, expect } from 'vitest';
import { detectImmediateDanger } from '../../../src/domain/emergency.js';

describe('detectImmediateDanger', () => {
  const table = [
    {
      desc: 'detects English hazard keyword "live wire"',
      text: 'There is a live wire hanging from the pole right over the street.',
      expected: true,
    },
    {
      desc: 'detects English hazard keyword "open manhole"',
      text: 'Deep open manhole on 5th cross, someone could fall inside.',
      expected: true,
    },
    {
      desc: 'detects English hazard keyword "gas leak"',
      text: 'Smell of gas leak near apartment pipeline.',
      expected: true,
    },
    {
      desc: 'detects English hazard keyword "sparking"',
      text: 'Electric transformer is sparking heavily.',
      expected: true,
    },
    {
      desc: 'detects Hindi keyword "bijli ka taar"',
      text: 'Bijli ka taar raste par toot kar gira hai.',
      expected: true,
    },
    {
      desc: 'detects Hindi/Hinglish keyword "khula manhole"',
      text: 'Sadak par khula manhole hai.',
      expected: true,
    },
    {
      desc: 'detects Marathi/Hindi keyword "aag"',
      text: 'Kachre ke dher me aag lag gayi hai.',
      expected: true,
    },
    {
      desc: 'detects Hindi "cylinder blast"',
      text: 'Risk of cylinder blast near tea stall.',
      expected: true,
    },
    {
      desc: 'detects "collapsed"',
      text: 'Boundary wall collapsed into drain.',
      expected: true,
    },
    {
      desc: 'returns false for routine pothole report without danger terms',
      text: 'Small pothole on the side of the road needs bitumen patch.',
      expected: false,
    },
    {
      desc: 'returns false for routine garbage report',
      text: 'Garbage not collected from residential bin today.',
      expected: false,
    },
    {
      desc: 'returns false for empty or whitespace text',
      text: '   ',
      expected: false,
    },
    {
      desc: 'avoids false positives on word fragments (word boundary check)',
      text: 'Firefly observed in botanical park during nocturnal study.',
      expected: false,
    },
    {
      desc: 'avoids false positive for financial/academic "current"',
      // "current" alone is in danger keywords, but words like "currently" should not trigger if boundary is enforced
      text: 'The municipality is currently reviewing our road petition.',
      expected: false,
    },
  ];

  for (const { desc, text, expected } of table) {
    it(desc, () => {
      expect(detectImmediateDanger(text)).toBe(expected);
    });
  }

  it('handles custom keyword lists containing empty strings gracefully', () => {
    expect(detectImmediateDanger('Some text', ['', 'live wire'])).toBe(false);
    expect(detectImmediateDanger('live wire here', ['', 'live wire'])).toBe(true);
  });

  it('documents and demonstrates known negation limitation', () => {
    // Negation is intentionally not parsed to err on safety
    const textWithNegation = 'Inspected the area and confirmed there is NO live wire.';
    expect(detectImmediateDanger(textWithNegation)).toBe(true);
  });
});
