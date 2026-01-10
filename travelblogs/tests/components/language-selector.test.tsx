/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelector from '@/components/account/language-selector';
import { LocaleProvider } from '@/utils/locale-context';

// Mock the locale context hook
vi.mock('@/utils/use-translation', () => ({
  useTranslation: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string) => key,
    formatDate: (date: Date) => date.toLocaleDateString(),
    formatDateTime: (date: Date) => date.toLocaleString(),
  }),
}));

describe('LanguageSelector', () => {
  it('should render language options', () => {
    render(
      <LocaleProvider>
        <LanguageSelector />
      </LocaleProvider>
    );

    expect(screen.getByText(/EN/i)).toBeInTheDocument();
    expect(screen.getByText(/DE/i)).toBeInTheDocument();
  });

  it('should indicate current locale', () => {
    render(
      <LocaleProvider>
        <LanguageSelector />
      </LocaleProvider>
    );

    const enButton = screen.getByText(/EN/i).closest('button');
    expect(enButton).toHaveAttribute('aria-pressed', 'true');
  });
});
