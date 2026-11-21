import { describe, it, expect } from 'vitest';
import { looksLikeSpam, classifyByKeywords } from '../../../src/domain/fallback.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('Fallback Classifier & Spam Detection (fallback.ts)', () => {
  describe('looksLikeSpam', () => {
    it('detects text shorter than 5 characters as spam', () => {
      expect(looksLikeSpam('')).toBe(true);
      expect(looksLikeSpam('   ')).toBe(true);
      expect(looksLikeSpam('hi')).toBe(true);
      expect(looksLikeSpam('road')).toBe(true);
    });

    it('detects repeated characters as spam', () => {
      expect(looksLikeSpam('aaaaaa pothole')).toBe(true);
      expect(looksLikeSpam('1111111')).toBe(true);
      expect(looksLikeSpam('hellooooooo')).toBe(true);
    });

    it('detects emoji-only content as spam', () => {
      expect(looksLikeSpam('⚠️🚨🛑')).toBe(true);
      expect(looksLikeSpam('🔥🔥🔥')).toBe(true);
      expect(looksLikeSpam('   😀 😃 😄   ')).toBe(true);
    });

    it('detects link-stuffed promotional content as spam', () => {
      expect(
        looksLikeSpam('Buy crypto now at http://spam.crypto and http://promo.xyz for rewards')
      ).toBe(true);
      expect(
        looksLikeSpam('Visit www.casino.com or www.bets.net right now')
      ).toBe(true);
    });

    it('allows legitimate civic complaints through without false spam flagging', () => {
      expect(
        looksLikeSpam('Deep pothole on MG Road causing traffic jam near metro pillar 124.')
      ).toBe(false);
      expect(
        looksLikeSpam('Garbage bin overflowing with waste on 4th cross road.')
      ).toBe(false);
      expect(
        looksLikeSpam('Streetlight pole broken and completely dark at night.')
      ).toBe(false);
    });
  });

  describe('classifyByKeywords', () => {
    it('classifies pothole in English', () => {
      const res = classifyByKeywords('Big pothole on the asphalt road near the signal.');
      expect(res.category).toBe(Category.POTHOLE);
      expect(res.is_civic_issue).toBe(true);
      expect(res.urgency).toBe(Urgency.MEDIUM);
      expect(res.confidence).toBe(0.4);
    });

    it('classifies pothole in Hindi/Hinglish (gaddha, sadak)', () => {
      const res = classifyByKeywords('Sadak par bahut bada gaddha ho gaya hai.');
      expect(res.category).toBe(Category.POTHOLE);
      expect(res.is_civic_issue).toBe(true);
    });

    it('classifies garbage in Marathi (kachra, dhig)', () => {
      const res = classifyByKeywords('Rastyavar kachra padla aahe durghandhi yet aahe.');
      expect(res.category).toBe(Category.GARBAGE);
      expect(res.is_civic_issue).toBe(true);
    });

    it('classifies streetlight issues (batti, andhera, light)', () => {
      const res = classifyByKeywords('Streetlight band hai pura andhera hai lane me.');
      expect(res.category).toBe(Category.STREETLIGHT);
      expect(res.is_civic_issue).toBe(true);
    });

    it('classifies water leakage (paani, pipe leak)', () => {
      const res = classifyByKeywords('Drinking water pipeline broken, paani beh raha hai raste par.');
      expect(res.category).toBe(Category.WATER_LEAKAGE);
      expect(res.is_civic_issue).toBe(true);
    });

    it('classifies sewer overflow (gutter, sewage, nali)', () => {
      const res = classifyByKeywords('Sewer overflow and choked gutter spreading bad smell.');
      expect(res.category).toBe(Category.SEWER_OVERFLOW);
      expect(res.is_civic_issue).toBe(true);
    });

    it('classifies fallen tree (ped gir gaya, branch)', () => {
      const res = classifyByKeywords('Heavy tree branch fell down, ped gir gaya blocking lane.');
      expect(res.category).toBe(Category.FALLEN_TREE);
      expect(res.is_civic_issue).toBe(true);
    });

    it('elevates urgency to High and sets safety_critical when danger keyword is present', () => {
      const res = classifyByKeywords('Road broken with live wire sparking on ground!');
      expect(res.safety_critical).toBe(true);
      expect(res.urgency).toBe(Urgency.HIGH);
    });

    it('classifies as public_hazard when danger is detected with zero category matches', () => {
      const res = classifyByKeywords('Exposed sparking cable!');
      expect(res.category).toBe(Category.PUBLIC_HAZARD);
      expect(res.safety_critical).toBe(true);
      expect(res.urgency).toBe(Urgency.HIGH);
    });

    it('maps spam to not_civic and is_civic_issue=false', () => {
      const res = classifyByKeywords('http://spam.link and http://scam.link');
      expect(res.is_civic_issue).toBe(false);
      expect(res.category).toBe(Category.NOT_CIVIC);
      expect(res.urgency).toBe(Urgency.LOW);
    });
  });
});
