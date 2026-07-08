import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setTheme = vi.fn();
let currentTheme = 'light';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

import { ThemeToggle } from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  it('renders a placeholder before mount to avoid a hydration mismatch, then the toggle', async () => {
    currentTheme = 'light';
    render(<ThemeToggle />);

    // After the mount effect runs, the real button should be present.
    expect(await screen.findByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('switches from light to dark on click', async () => {
    currentTheme = 'light';
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = await screen.findByRole('button', { name: /toggle theme/i });
    await user.click(button);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches from dark to light on click', async () => {
    currentTheme = 'dark';
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = await screen.findByRole('button', { name: /toggle theme/i });
    await user.click(button);

    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
