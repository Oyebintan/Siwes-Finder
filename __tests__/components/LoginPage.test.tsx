import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import Login from '@/app/login/page';

// Regression guard for a reported bug: tapping the email/password field on
// mobile did nothing -- no on-screen keyboard. Root cause was a
// readOnly-until-focus anti-autofill trick (readonly inputs never trigger a
// mobile keyboard, and toggling readOnly off in React's onFocus handler
// fires too late for iOS/Android to notice). Fixed with honeypot decoy
// fields instead, so the real inputs are never readOnly.
describe('Login page', () => {
  it('never marks the real email/password inputs readOnly', () => {
    render(<Login />);

    const email = screen.getByPlaceholderText('you@university.edu.ng') as HTMLInputElement;
    const password = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

    expect(email).not.toHaveAttribute('readonly');
    expect(password).not.toHaveAttribute('readonly');
  });

  it('accepts typed input immediately, with no unlock step', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const email = screen.getByPlaceholderText('you@university.edu.ng') as HTMLInputElement;
    const password = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

    await user.type(email, 'student@example.com');
    await user.type(password, 'secret123');

    expect(email).toHaveValue('student@example.com');
    expect(password).toHaveValue('secret123');
  });

  it('keeps decoy autofill fields out of tab order and assistive tech', () => {
    render(<Login />);

    // The honeypot inputs have no accessible label/placeholder by design,
    // so reach them by name -- both must be excluded from tab order.
    const decoyEmail = document.querySelector('input[name="email"]');
    const decoyPassword = document.querySelector('input[name="password"]');

    expect(decoyEmail).toHaveAttribute('tabindex', '-1');
    expect(decoyPassword).toHaveAttribute('tabindex', '-1');
  });
});
