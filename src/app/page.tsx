import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRightCircle, ArrowUpRight, CheckCircle2, Download, Smartphone, Users } from 'lucide-react';

// Set once a build exists (see MOBILE_APP.md Phase 4) -- a direct link to
// the built .apk, e.g. a GitHub Release asset URL. Unset by default so the
// button never points at a 404; the banner still renders with a
// "Coming soon" state either way, so it's not a mystery why it's missing.
const ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

const companies = ['Paystack', 'Flutterwave', 'Andela', 'MTN Nigeria', 'Interswitch', 'Nigerian Breweries'];

const featured = [
  { logo: 'PS', tint: 'primary', title: 'Frontend Engineering Intern', meta: 'Paystack · Lagos · 6 months', tags: ['React', 'Fintech'] },
  { logo: 'FW', tint: 'secondary', title: 'Data Analytics Intern', meta: 'Flutterwave · Lagos · 6 months', tags: ['SQL', 'Fintech'] },
  { logo: 'MTN', tint: 'accent', title: 'Network Engineering Intern', meta: 'MTN Nigeria · Abuja · 6 months', tags: ['Telecoms', 'Networking'] },
];

const testimonials = [
  { quote: 'I found a verified fintech placement in three days instead of three months.', name: 'Amara O.', role: 'Computer Science, UNILAG' },
  { quote: 'No more chasing referrals. Everything I need is in one dashboard.', name: 'Tunde A.', role: 'Electrical Engineering, OAU' },
  { quote: 'As an HR lead, I hired four strong interns in a week — all pre-verified.', name: 'Ifeoma N.', role: 'HR Lead, Interswitch' },
];

const faqs = [
  { q: 'Is SIWES Finder free for students?', a: 'Yes — creating a profile and applying to opportunities is always free.' },
  { q: 'How are companies verified?', a: 'Every company submits CAC registration and HR contact details, reviewed by our admin team before listings go live.' },
  { q: 'Which schools are supported?', a: 'All accredited Nigerian universities and polytechnics — search for yours during signup.' },
];

const stats = [
  { value: '2,400+', label: 'Students placed', accent: false },
  { value: '180+', label: 'Verified companies', accent: true },
  { value: '36', label: 'States covered', accent: false },
  { value: '72hrs', label: 'Avg. time to first offer', accent: true },
];

const tintMap: Record<string, string> = {
  primary: 'bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400',
  secondary: 'bg-secondary-500/10 dark:bg-secondary-300/15 text-secondary-500 dark:text-secondary-300',
  accent: 'bg-accent-500/10 dark:bg-accent-400/15 text-accent-500 dark:text-accent-400',
};

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity="0.4" />
      <path d="M28 36 L38 28" className="stroke-primary-500 dark:stroke-primary-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const VerifiedBadge = () => (
  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-bg text-success whitespace-nowrap">● Verified</span>
);

export default function Home() {
  return (
    <div className="relative overflow-x-clip font-sans text-foreground bg-background bg-grid-lines">
      {/* NAV */}
      <header className="sticky top-0 z-50 glass-surface border-b border-surface-border">
        <div className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display font-extrabold text-[18px] tracking-tight">SIWES Finder</span>
          </Link>
          <nav className="hidden md:flex items-center gap-9">
            <a href="#how-it-works" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">How it works</a>
            <a href="#opportunities" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">Opportunities</a>
            <a href="#faq" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              aria-label="Sign in"
              className="flex items-center justify-center gap-1.5 p-2.5 sm:px-5 sm:py-2.5 rounded-full sm:rounded-[9px] bg-primary-500 dark:bg-primary-400 text-white text-sm font-bold shadow-lg shadow-primary-900/20 hover:brightness-110 transition-all"
            >
              <ArrowRightCircle className="w-[18px] h-[18px] sm:hidden" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8 pb-6 sm:pb-8">
        <div className="pointer-events-none absolute -top-36 -right-40 w-[520px] h-[520px] rounded-full blur-md animate-blob" style={{ background: 'radial-gradient(circle, var(--color-primary-500), transparent 70%)', opacity: 0.13 }} />
        <div className="pointer-events-none absolute top-20 right-28 w-[340px] h-[340px] rounded-full blur-md animate-blob [animation-direction:reverse]" style={{ background: 'radial-gradient(circle, var(--color-secondary-500), transparent 70%)', opacity: 0.12 }} />

        <div className="relative grid gap-8 items-center [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 px-3.5 py-1.5 rounded-full font-mono text-[11.5px] font-bold tracking-wide mb-5 uppercase">For Nigerian University Students</div>
            <h1 className="font-display font-extrabold text-[clamp(34px,5.4vw,54px)] leading-[1.04] tracking-[-0.035em] mb-5">
              Find <span className="italic font-medium">verified</span><br />
              SIWES placements<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-primary-400 dark:to-secondary-300">faster.</span>
            </h1>
            <p className="text-[16.5px] leading-[1.6] text-muted mb-7 max-w-[460px]">Skip the WhatsApp groups and cold calls. Browse verified companies, apply in minutes, and track every placement in one place.</p>
            <div className="flex gap-3.5 flex-wrap">
              <Link href="/signup" className="bg-foreground text-background px-6 py-3.5 rounded-[9px] text-[15px] font-bold hover:brightness-110 transition-all">Register as a Student</Link>
              <Link href="/signup" className="px-6 py-3.5 rounded-[9px] text-[15px] font-bold border-[1.5px] border-surface-border hover:border-primary-500 transition-colors">Register as a Company</Link>
            </div>
          </div>

          {/* Floating cards */}
          <div className="relative h-[380px] min-w-[280px] animate-fade-in-up [animation-delay:100ms]">
            <Link href="/signup" className="floating-card group absolute top-0 right-0 w-[260px] bg-surface-1 border border-surface-border rounded-[18px] p-[22px] animate-float-card transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-extrabold text-primary-500 dark:text-primary-400 text-[13px] shrink-0">PS</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold">Frontend Intern</div>
                  <div className="text-[11.5px] text-muted">Paystack · Lagos</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center shrink-0 group-hover:bg-primary-500 dark:group-hover:bg-primary-400 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] text-muted">MATCH</span>
                <span className="font-mono text-[16px] font-bold text-success">92%</span>
              </div>
              <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-bg text-success">● Verified company</span>
            </Link>

            <Link href="/signup" className="floating-card group absolute top-[165px] left-1 w-[168px] bg-surface-1 border border-surface-border rounded-[16px] p-4 animate-float-card [animation-delay:-1.5s] transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-500/10 dark:bg-secondary-300/15 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-secondary-500 dark:text-secondary-300" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-[15px] leading-none">2,400+</div>
                  <div className="text-[10.5px] text-muted mt-1">Students placed</div>
                </div>
              </div>
            </Link>

            <Link href="/signup" className="floating-card group absolute bottom-0 right-2 w-[240px] bg-surface-1 border border-surface-border rounded-[18px] p-5 animate-float-card [animation-delay:-3s] transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10.5px] text-muted tracking-wide">APPLICATION STATUS</span>
                <div className="w-6 h-6 rounded-full bg-success-bg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-[13.5px] font-semibold">Accepted at MTN Nigeria</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="pt-1 pb-6">
        <div className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14">
          <div className="text-center font-mono text-[11.5px] font-bold text-muted tracking-widest uppercase mb-3">Verified companies hiring on SIWES Finder</div>
          <div className="relative overflow-hidden rounded-2xl bg-surface-1 border border-surface-border py-4">
            <div className="flex w-max animate-marquee">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex gap-16 pr-16" aria-hidden={dup === 1}>
                  {companies.map((c) => (
                    <span key={c} className="font-display font-extrabold text-[20px] text-muted whitespace-nowrap">{c}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE APP */}
      <section className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 pb-6 sm:pb-8">
        <div className="rounded-2xl bg-surface-1 border border-surface-border px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[12px] bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            </div>
            <div>
              <div className="font-display font-bold text-[15px]">SIWES Finder is also on Android</div>
              <div className="text-[13px] text-muted">Browse, apply, and log your SIWES hours from your phone.</div>
            </div>
          </div>
          {ANDROID_APK_URL ? (
            <a
              href={ANDROID_APK_URL}
              className="inline-flex items-center gap-2 bg-primary-500 dark:bg-primary-400 text-white px-5 py-2.5 rounded-[9px] text-[14px] font-bold hover:brightness-110 transition-all shrink-0"
            >
              <Download className="w-4 h-4" /> Download for Android
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 bg-surface-2 text-muted px-5 py-2.5 rounded-[9px] text-[14px] font-bold shrink-0 cursor-default">
              <Download className="w-4 h-4" /> Coming soon
            </span>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-y border-surface-border bg-surface-1">
        <div className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
          <div className="mb-[52px]">
            <div className="font-mono font-bold text-[11.5px] tracking-widest text-primary-500 dark:text-primary-400 uppercase mb-3.5">01 / How it works</div>
            <h2 className="font-display font-extrabold text-[38px] tracking-[-0.025em] max-w-[520px]">Two journeys, one platform.</h2>
          </div>
          <div className="grid gap-14 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            <Journey
              label="FOR STUDENTS" labelClass="text-secondary-500 dark:text-secondary-300" numClass="bg-primary-500 dark:bg-primary-400"
              steps={[['Build your profile', 'Course, school, skills, preferred state.'], ['Get matched', 'See opportunities ranked by fit.'], ['Apply & track', 'One click apply, real-time status.']]}
            />
            <Journey
              label="FOR COMPANIES" labelClass="text-primary-500 dark:text-primary-400" numClass="bg-secondary-500 dark:bg-secondary-300"
              steps={[['Get verified', 'Submit company details for review.'], ['Post opportunities', 'Multi-step listing in minutes.'], ['Review applicants', 'Filter, shortlist, and respond fast.']]}
            />
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section id="opportunities" className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-9 gap-4">
          <div>
            <div className="font-mono font-bold text-[11.5px] tracking-widest text-primary-500 dark:text-primary-400 uppercase mb-3.5">02 / Featured</div>
            <h2 className="font-display font-extrabold text-[32px] tracking-[-0.02em]">Opportunities open now</h2>
          </div>
          <Link href="/signup" className="text-[14.5px] font-bold text-primary-500 dark:text-primary-400 whitespace-nowrap">Browse all →</Link>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {featured.map((o) => (
            <Link key={o.title} href="/login" className="group block bg-surface-1 rounded-2xl p-6 border border-surface-border transition-all duration-250 hover:-translate-y-1 hover:border-primary-500 hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2.5 mb-[18px]">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center font-display font-extrabold text-[13px] ${tintMap[o.tint]}`}>{o.logo}</div>
                <span className="ml-auto"><VerifiedBadge /></span>
              </div>
              <div className="font-display font-bold text-[16.5px] mb-1.5">{o.title}</div>
              <div className="text-[13px] text-muted mb-[18px]">{o.meta}</div>
              <div className="flex gap-2 flex-wrap">
                {o.tags.map((t) => (
                  <span key={t} className="text-[11.5px] px-2.5 py-1 rounded-full bg-background text-muted border border-surface-border">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#0B1220] dark:bg-black py-14 sm:py-16 px-6 sm:px-10 lg:px-14">
        <div className="max-w-[1220px] mx-auto grid gap-4 text-center [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl px-4 py-6 bg-white/[0.045] border border-white/[0.09] backdrop-blur-md">
              <div className={`font-mono font-bold text-[38px] ${s.accent ? 'text-accent-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-[13.5px] text-[#9A9AA6] mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
        <h2 className="font-display font-extrabold text-[32px] tracking-[-0.02em] mb-9 text-center">Students trust SIWES Finder</h2>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-surface-1 rounded-2xl p-[26px] border border-surface-border">
              <div className="font-display italic text-[15.5px] leading-[1.6] mb-[18px]">&ldquo;{t.quote}&rdquo;</div>
              <div className="text-[13px] font-bold">{t.name}</div>
              <div className="text-[12px] text-muted">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-surface-border bg-surface-1">
        <div className="max-w-[800px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
          <h2 className="font-display font-extrabold text-[32px] tracking-[-0.02em] mb-9 text-center">Frequently asked questions</h2>
          <div className="flex flex-col gap-px bg-surface-border rounded-2xl overflow-hidden">
            {faqs.map((f) => (
              <div key={f.q} className="bg-surface-1 px-[26px] py-[22px]">
                <div className="font-bold text-[15px] mb-1.5">{f.q}</div>
                <div className="text-[14px] text-muted leading-[1.6]">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="border-t border-surface-border bg-surface-1">
        <div className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-6">
            <Users className="w-7 h-7 text-primary-500 dark:text-primary-400" />
          </div>
          <h2 className="font-display font-extrabold text-[32px] tracking-[-0.02em] max-w-[560px] mb-4">You don&apos;t get to do SIWES alone.</h2>
          <p className="text-[15.5px] text-muted max-w-[480px] mb-8">You&apos;ll move with people that are doing the same as you — see who&apos;s placed where, swap notes, and stay connected the whole way through.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-primary-500 dark:bg-primary-400 text-white px-6 py-3.5 rounded-[9px] text-[15px] font-bold hover:brightness-110 transition-all">
            <Users className="w-4 h-4" /> Join the community
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-[1220px] mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
        <div className="rounded-[26px] p-[clamp(28px,5vw,56px)] text-center bg-gradient-to-br from-primary-500 to-[#17307A] dark:from-primary-500 dark:via-secondary-600 dark:to-secondary-900">
          <h2 className="font-display font-extrabold text-[30px] text-white mb-4 tracking-[-0.02em]">Your SIWES placement is one search away.</h2>
          <Link href="/signup" className="inline-block bg-white text-primary-600 px-6 py-3 rounded-[9px] text-sm font-bold mt-2 hover:brightness-95 transition-all">Create your free profile</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-surface-border py-12 px-6 sm:px-10 lg:px-14">
        <div className="max-w-[1220px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-display font-extrabold text-[15px]">SIWES Finder</span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-muted">
            <span>© 2026 SIWES Finder. Built for Nigerian students.</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Journey({ label, labelClass, numClass, steps }: { label: string; labelClass: string; numClass: string; steps: [string, string][] }) {
  return (
    <div>
      <div className={`font-mono text-[12px] font-bold mb-5 tracking-wide ${labelClass}`}>{label}</div>
      <div className="flex flex-col gap-6">
        {steps.map(([title, desc], i) => (
          <div key={title} className="flex gap-[18px]">
            <div className={`w-9 h-9 rounded-[10px] text-white font-display font-extrabold text-[14px] flex items-center justify-center shrink-0 ${numClass}`}>{i + 1}</div>
            <div>
              <div className="font-bold text-[16px] mb-1">{title}</div>
              <div className="text-[14px] text-muted leading-[1.55]">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
