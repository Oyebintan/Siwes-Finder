import Link from 'next/link';
import { ArrowRight, Building2, Briefcase, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen relative font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">

      <nav className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-gray-200/60 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-800 to-accent-400 shadow-md shadow-accent-900/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">SIWES Finder</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-accent-600 dark:hover:text-accent-300 font-bold transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="px-5 py-2 rounded-full text-sm bg-gradient-to-r from-accent-800 to-accent-400 text-white shadow-md shadow-accent-900/20 hover:shadow-lg hover:brightness-110 font-bold transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-40 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-bold text-sm mb-8 animate-fade-in-up border border-accent-200 dark:border-accent-800/50">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
          </span>
          The Future of IT Placements in Nigeria
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-fade-in-up text-gray-900 dark:text-white" style={{ animationDelay: '100ms' }}>
          Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-800 via-accent-500 to-accent-300">SIWES</span> Placement.
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          The smartest bridge between ambitious Nigerian students and leading organizations. Apply for jobs, track applications, and maintain your e-logbook all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Link href="/signup" className="group px-8 py-4 rounded-xl bg-gradient-to-r from-accent-800 to-accent-400 font-bold text-lg text-white shadow-lg shadow-accent-900/25 hover:-translate-y-1 hover:brightness-110 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
            Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="px-8 py-4 rounded-xl bg-surface-1 border border-surface-border text-gray-700 dark:text-gray-300 font-bold text-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-all w-full sm:w-auto text-center shadow-sm">
            Employer Portal
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
          {[
            { title: "One-Click Apply", icon: Briefcase, desc: "Browse through hundreds of organizations and apply instantly with your digital profile." },
            { title: "Digital e-Logbook", icon: FileText, desc: "No more paper logbooks. Log your daily tasks online and get them approved by your supervisor." },
            { title: "Smart Matching", icon: Building2, desc: "Employers can filter through students by university, course of study, and digital resumes." }
          ].map((feat, i) => (
            <div key={i} className="bg-surface-1 border border-surface-border shadow-sm p-8 rounded-3xl text-left hover:shadow-md hover:border-accent-400/40 transition-all group animate-fade-in-up" style={{ animationDelay: `${400 + i * 100}ms` }}>
              <div className="w-14 h-14 rounded-2xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-300 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feat.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feat.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
