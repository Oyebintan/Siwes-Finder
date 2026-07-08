import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import LogoutButton from '@/components/LogoutButton';
import { signOut } from 'next-auth/react';

describe('LogoutButton', () => {
  it('signs the user out and returns them to the homepage', async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByTitle('Logout'));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});
