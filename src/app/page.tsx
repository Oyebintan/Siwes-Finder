import Link from 'next/link';
import { ArrowRight, GraduationCap, Building2, Briefcase, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 relative font-sans text-gray-900">
      
      {/* Light Glassy Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/70 border-b border-gray-200">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">SIWES Finder</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md hover:shadow-lg font-bold transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-40 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold text-sm mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          The Future of IT Placements in Nigeria
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">SIWES</span> Placement.
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          The smartest bridge between ambitious Nigerian students and leading organizations. Apply for jobs, track applications, and maintain your e-logbook all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Link href="/signup" className="group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 font-bold text-lg text-white shadow-lg shadow-blue-500/20 hover:-translate-y-1 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
            Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="px-8 py-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-50 transition-all w-full sm:w-auto text-center shadow-sm">
            Employer Portal
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
          {[
            { title: "One-Click Apply", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-100", desc: "Browse through hundreds of organizations and apply instantly with your digital profile." },
            { title: "Digital e-Logbook", icon: FileText, color: "text-cyan-600", bg: "bg-cyan-100", desc: "No more paper logbooks. Log your daily tasks online and get them approved by your supervisor." },
            { title: "Smart Matching", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-100", desc: "Employers can filter through students by university, course of study, and digital resumes." }
          ].map((feat, i) => (
            <div key={i} className="bg-white border border-gray-100 shadow-sm p-8 rounded-3xl text-left hover:shadow-md transition-all group animate-fade-in-up" style={{ animationDelay: `${400 + i * 100}ms` }}>
              <div className={`w-14 h-14 rounded-2xl ${feat.bg} ${feat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feat.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feat.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
