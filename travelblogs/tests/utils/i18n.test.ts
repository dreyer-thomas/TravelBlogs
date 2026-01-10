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
    const testDate = new Date('2024-03-15T10:30:00Z');

    it('should format date with en-US locale', () => {
      const result = formatDate(testDate, 'en');
      expect(result).toMatch(/3\/15\/2024/); // US format: M/D/YYYY
    });

    it('should format date with de-DE locale', () => {
      const result = formatDate(testDate, 'de');
      expect(result).toMatch(/15\.3\.2024/); // German format: D.M.YYYY
    });
  });

  describe('formatDateTime', () => {
    const testDate = new Date('2024-03-15T10:30:00Z');

    it('should format datetime with en-US locale', () => {
      const result = formatDateTime(testDate, 'en');
      expect(result).toContain('3/15/2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
    });

    it('should format datetime with de-DE locale', () => {
      const result = formatDateTime(testDate, 'de');
      expect(result).toContain('15.3.2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
    });
  });
});
