import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

import ApplyButton from '@/components/ApplyButton';

describe('ApplyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders a mailto link for the email application method', () => {
    render(
      <ApplyButton
        jobId="job1"
        applicationMethod="email"
        applicationEmail="hr@company.com"
        jobTitle="Frontend Intern"
      />
    );

    const link = screen.getByRole('link', { name: /apply via email/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:hr@company.com'));
    expect(link.getAttribute('href')).toContain(encodeURIComponent('Frontend Intern'));
  });

  it('renders an external link for the external application method', () => {
    render(
      <ApplyButton jobId="job1" applicationMethod="external" applicationUrl="https://company.com/careers" />
    );

    const link = screen.getByRole('link', { name: /apply on company site/i });
    expect(link).toHaveAttribute('href', 'https://company.com/careers');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('submits a platform application and shows the success state', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();

    render(<ApplyButton jobId="job1" />);
    await user.click(screen.getByRole('button', { name: /apply now/i }));

    expect(await screen.findByText(/application submitted/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ jobId: 'job1' }),
      })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the server error message when the application fails', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'You have already applied for this placement' }),
    });
    const user = userEvent.setup();

    render(<ApplyButton jobId="job1" />);
    await user.click(screen.getByRole('button', { name: /apply now/i }));

    expect(await screen.findByText(/already applied for this placement/i)).toBeInTheDocument();
  });
});
