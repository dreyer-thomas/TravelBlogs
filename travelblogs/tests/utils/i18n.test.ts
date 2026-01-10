import { describe, it, expect } from 'vitest';
import { getTranslation, formatDate, formatDateTime, type Locale } from '@/utils/i18n';

describe('i18n utilities', () => {
  describe('getTranslation', () => {
    it('should return English translation when locale is en', () => {
      const result = getTranslation('common.trips', 'en');
      expect(result).toBe('Trips');
    });

    it('should return German translation when locale is de', () => {
      const result = getTranslation('common.trips', 'de');
      expect(result).toBe('Reisen');
    });

    it('should return English fallback when translation key is missing', () => {
      const result = getTranslation('nonexistent.key', 'de');
      expect(result).toBe('nonexistent.key');
    });

    it('should handle nested translation keys', () => {
      const enResult = getTranslation('trips.create', 'en');
      const deResult = getTranslation('trips.create', 'de');
      expect(enResult).toBe('Create Trip');
      expect(deResult).toBe('Reise erstellen');
    });
  });

  describe('formatDate', () => {
    const createLocalDate = (year: number, month: number, day: number) =>
      new Date(year, month - 1, day);
    const testDate = createLocalDate(2024, 5, 16);

    it('should format date with en-US locale', () => {
      const result = formatDate(testDate, 'en');
      expect(result).toBe('May 16th, 2024');
    });

    it('should format date with de-DE locale', () => {
      const result = formatDate(testDate, 'de');
      expect(result).toBe('16. Mai 2024');
    });

    it('should apply ordinal suffixes for English dates', () => {
      const cases = [
        [createLocalDate(2024, 5, 1), 'May 1st, 2024'],
        [createLocalDate(2024, 5, 2), 'May 2nd, 2024'],
        [createLocalDate(2024, 5, 3), 'May 3rd, 2024'],
        [createLocalDate(2024, 5, 4), 'May 4th, 2024'],
        [createLocalDate(2024, 5, 11), 'May 11th, 2024'],
        [createLocalDate(2024, 5, 12), 'May 12th, 2024'],
        [createLocalDate(2024, 5, 13), 'May 13th, 2024'],
        [createLocalDate(2024, 5, 21), 'May 21st, 2024'],
        [createLocalDate(2024, 5, 22), 'May 22nd, 2024'],
        [createLocalDate(2024, 5, 23), 'May 23rd, 2024'],
        [createLocalDate(2024, 5, 31), 'May 31st, 2024'],
      ];

      for (const [value, expected] of cases) {
        const result = formatDate(value, 'en');
        expect(result).toBe(expected);
      }
    });
  });

  describe('formatDateTime', () => {
    const testDate = new Date(2024, 4, 16, 12, 30);

    it('should format datetime with en-US locale', () => {
      const result = formatDateTime(testDate, 'en');
      expect(result).toContain('5/16/2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
    });

    it('should format datetime with de-DE locale', () => {
      const result = formatDateTime(testDate, 'de');
      expect(result).toContain('16.5.2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
    });
  });
});
