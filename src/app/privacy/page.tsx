import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity="0.4" />
      <path d="M28 36 L38 28" className="stroke-primary-500 dark:stroke-primary-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display font-bold text-[18px] tracking-[-0.01em]">{title}</h2>
      <div className="text-[14.5px] text-muted leading-[1.7] space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-surface-border px-6 sm:px-10 lg:px-14 py-5">
        <div className="max-w-[760px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display font-extrabold text-[16px] tracking-tight">SIWES Finder</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 sm:px-10 lg:px-14 py-12 space-y-8">
        <div>
          <h1 className="font-display font-extrabold text-[30px] tracking-[-0.02em] mb-2">Privacy Policy</h1>
          <p className="text-[13.5px] text-muted">Last updated: 11 July 2026</p>
        </div>

        <Section title="Who we are">
          <p>
            SIWES Finder connects Nigerian students seeking SIWES (Students Industrial Work Experience Scheme)
            placements with verified employers, and gives their schools visibility into the process. This policy
            covers the SIWES Finder website and the SIWES Finder mobile app, which share the same account and the
            same data.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>What we collect depends on your role:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Every account:</strong> name, email address, and password (stored as a salted hash — we never store or can see your actual password), or your Google account info if you sign in with Google.</li>
            <li><strong>Students:</strong> university, faculty, course of study, level, skills, phone number, your resume (PDF), a profile photo, SIWES placement dates, preferred state, saved/bookmarked jobs, your job applications, and any e-Logbook entries you write (activity descriptions, hours, week/day).</li>
            <li><strong>Employers:</strong> company name, industry, a company description, a company logo, and CAC (Corporate Affairs Commission) registration details and a verification document, submitted so we can confirm you&apos;re a real registered business before your listings go live.</li>
            <li><strong>Schools:</strong> institution name and accreditation details, submitted for the same verification purpose.</li>
            <li><strong>Mobile app only:</strong> an Expo push notification token, so we can notify you about things like an application decision or a logbook approval. You can deny notification permission at any time and the app still works.</li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To create and secure your account, and to show you the right dashboard for your role.</li>
            <li>To match students with relevant opportunities, and to let employers review applicants.</li>
            <li>To let schools see their own students&apos; placement and logbook status — a student is only visible to a school when the university on their profile matches that school&apos;s name.</li>
            <li>To verify employer and school accounts before their listings or data access go live (CAC/accreditation review, done manually by our admin team).</li>
            <li>To send password-reset codes and (on mobile) push notifications about your applications and logbook.</li>
            <li>We do not sell your personal information, and we do not use it for advertising.</li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p>We use a small number of infrastructure providers to run the platform. They process data on our behalf and don&apos;t use it for their own purposes:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>MongoDB Atlas</strong> — hosts our database.</li>
            <li><strong>Vercel</strong> — hosts the website and, when connected, file uploads (resumes, avatars, verification documents) via Vercel Blob.</li>
            <li><strong>Resend</strong> — sends password-reset emails.</li>
            <li><strong>Google</strong> — if you choose to sign in with Google.</li>
            <li><strong>Expo</strong> — delivers push notifications to the mobile app.</li>
          </ul>
          <p>
            Employers only ever see application and (if you write logbook entries against their placement) logbook
            data for students who applied to or are placed with them — never your full profile browsing or other
            applications. Schools only see students matching their institution name, and cannot see other schools&apos;
            students.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You can update most of your profile at any time from your account settings.</li>
            <li>You can remove your resume, avatar, or saved jobs at any time.</li>
            <li>You can ask us to delete your account and associated data by emailing us (see below); we&apos;ll do so unless we&apos;re required to keep something (e.g. for fraud prevention) for a limited period.</li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            Passwords are hashed, never stored in plain text. Uploaded files are verified server-side (not just by
            filename or claimed type) before being stored. Every API route independently checks that you&apos;re
            allowed to see the data it returns, not just that you&apos;re logged in.
          </p>
        </Section>

        <Section title="Children">
          <p>SIWES Finder is intended for university/polytechnic students, employers, and schools, and is not directed at children under 13.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>If we make material changes to this policy, we&apos;ll update the date at the top of this page.</p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Reach us via the contact details on our website, or through
            the account you signed up with.
          </p>
        </Section>
      </main>

      <footer className="border-t border-surface-border py-8 px-6 sm:px-10 lg:px-14">
        <div className="max-w-[760px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={20} />
            <span className="font-display font-extrabold text-[14px]">SIWES Finder</span>
          </div>
          <div className="text-[13px] text-muted">© 2026 SIWES Finder. Built for Nigerian students.</div>
        </div>
      </footer>
    </div>
  );
}
