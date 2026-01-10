/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveLocale, loadLocale, clearLocale } from '@/utils/locale-storage';

describe('locale-storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('saveLocale', () => {
    it('should save locale to localStorage', () => {
      saveLocale('de');
      expect(localStorage.getItem('travelblogs_locale')).toBe('de');
    });

    it('should overwrite existing locale', () => {
      saveLocale('en');
      expect(localStorage.getItem('travelblogs_locale')).toBe('en');
      saveLocale('de');
      expect(localStorage.getItem('travelblogs_locale')).toBe('de');
    });
  });

  describe('loadLocale', () => {
    it('should load saved locale from localStorage', () => {
      localStorage.setItem('travelblogs_locale', 'de');
      expect(loadLocale()).toBe('de');
    });

    it('should return null when no locale is saved', () => {
      expect(loadLocale()).toBeNull();
    });

    it('should return null when invalid locale is saved', () => {
      localStorage.setItem('travelblogs_locale', 'fr');
      expect(loadLocale()).toBeNull();
    });
  });

  describe('clearLocale', () => {
    it('should remove locale from localStorage', () => {
      localStorage.setItem('travelblogs_locale', 'de');
      clearLocale();
      expect(localStorage.getItem('travelblogs_locale')).toBeNull();
    });

    it('should not throw when clearing empty localStorage', () => {
      expect(() => clearLocale()).not.toThrow();
    });
  });
});
