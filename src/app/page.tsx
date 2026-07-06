import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { Briefcase, GraduationCap, Search, Building2, CheckCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";

const SpiralBackground = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center opacity-30 dark:opacity-20 mix-blend-screen dark:mix-blend-lighten z-0">
    {Array.from({ length: 8 }).map((_, i) => (
      <div 
        key={i}
        className="absolute rounded-full border border-blue-500/40 dark:border-cyan-400/30"
        style={{
          width: `${(i + 1) * 15}max(vw, vh)`,
          height: `${(i + 1) * 15}max(vw, vh)`,
          borderStyle: i % 2 === 0 ? 'dashed' : 'dotted',
          borderWidth: i % 2 === 0 ? '2px' : '3px',
          animation: `spin ${30 + i * 10}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`,
        }}
      />
    ))}
  </div>
);

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col overflow-x-hidden">
      
      {/* Decorative glowing orbs (Fixed at top) */}
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-blue-600/20 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-cyan-400/20 rounded-full blur-[60px] md:blur-[100px] mix-blend-screen" />
      </div>

      {/* Navigation Bar */}
      <nav className="fixed top-4 left-0 right-0 mx-auto w-[95%] max-w-5xl z-50 flex items-center justify-between px-4 py-3 md:px-6 md:py-3 backdrop-blur-2xl bg-white/10 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300">
        <div className="flex items-center gap-2 md:gap-3 group cursor-pointer">
          <div className="relative overflow-hidden rounded-xl shadow-[0_0_15px_rgba(0,82,204,0.3)] group-hover:shadow-[0_0_25px_rgba(0,210,255,0.5)] transition-shadow duration-300">
            <Image
              src="/logo.png"
              alt="SIWES Finder Logo"
              width={32}
              height={32}
              className="transform group-hover:scale-110 transition-transform duration-500 w-8 h-8 md:w-10 md:h-10"
            />
          </div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-400 dark:from-blue-400 dark:to-cyan-200">
            SIWES Finder
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="text-sm font-semibold hover:text-blue-500 dark:hover:text-cyan-300 transition-colors hidden sm:block"
          >
            Log In
          </Link>
          <Link 
            href="/signup" 
            className="relative inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-2 text-xs md:text-sm font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full hover:shadow-[0_0_20px_rgba(0,100,255,0.4)] hover:-translate-y-0.5"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center p-4 md:p-6 text-center pt-28 pb-8 md:pt-32 md:pb-12">
        <SpiralBackground />
        
        <div className="relative z-10 w-full max-w-4xl p-6 md:p-8 lg:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center mt-2">
          <div className="mb-4 md:mb-6 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] md:text-xs font-bold tracking-wide uppercase text-blue-700 dark:text-cyan-400 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 dark:bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-cyan-500"></span>
            </span>
            Platform version 1.0 is live
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 md:mb-6 leading-tight mt-2">
            Your Bridge to <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 dark:from-blue-600 dark:via-cyan-400 dark:to-blue-500 animate-gradient-x pb-2">
              Industry Experience.
            </span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-2xl text-foreground/80 max-w-3xl leading-relaxed mb-8 md:mb-12 font-medium dark:font-light">
            Seamlessly connect with top organizations across Nigeria for your SIWES/IT placements. 
            Build a standout profile, discover relevant roles, and launch your career journey.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-5 w-full sm:w-auto">
            <Link 
              href="/signup?role=student" 
              className="group relative flex items-center justify-center px-6 py-3 md:px-8 md:py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl hover:shadow-[0_0_30px_rgba(0,100,255,0.5)] hover:-translate-y-1 overflow-hidden"
            >
              <span className="relative flex items-center gap-2 text-sm md:text-base">
                I am a Student <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            
            <Link 
              href="/signup?role=employer" 
              className="group flex items-center justify-center px-6 py-3 md:px-8 md:py-4 font-bold transition-all duration-300 bg-white/5 border-2 border-blue-500/30 hover:border-blue-500 dark:border-white/20 dark:hover:border-cyan-400 rounded-xl hover:bg-blue-500/10 hover:-translate-y-1"
            >
              <span className="flex items-center gap-2 text-foreground group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors text-sm md:text-base">
                I am an Employer <Building2 className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-12 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full mt-4">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-5xl font-bold mb-4">Why SIWES Finder?</h3>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">Everything you need to secure or offer the best industrial training experiences in one platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Search className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Smart Matching</h4>
            <p className="text-foreground/70 leading-relaxed">Our algorithm matches students with companies based on course of study, skills, and industry requirements.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Verified Organizations</h4>
            <p className="text-foreground/70 leading-relaxed">Every company on our platform is vetted to ensure a safe, standard, and highly educational training environment.</p>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Fast Placements</h4>
            <p className="text-foreground/70 leading-relaxed">Skip the endless physical letter submissions. Apply digitally and get responses directly through the platform.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 px-6 md:px-12 bg-black/5 dark:bg-white/5 border-y border-white/10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl md:text-5xl font-bold mb-8">How it works for Students</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">1</div>
                  <div>
                    <h5 className="text-xl font-bold mb-1">Create your profile</h5>
                    <p className="text-foreground/70">Sign up, add your university, course of study, and upload your resume/IT letter.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">2</div>
                  <div>
                    <h5 className="text-xl font-bold mb-1">Browse Opportunities</h5>
                    <p className="text-foreground/70">Search through hundreds of verified IT placement openings across various states.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">3</div>
                  <div>
                    <h5 className="text-xl font-bold mb-1">Apply & Get Accepted</h5>
                    <p className="text-foreground/70">Submit your application with one click and get notified when an employer accepts you.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative h-[400px] w-full rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
              <GraduationCap className="w-48 h-48 text-blue-500/50" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-6 md:px-12 max-w-7xl mx-auto w-full text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-foreground/10">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-cyan-400 mb-2">50+</span>
            <span className="text-foreground/70 font-medium">Universities</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-cyan-400 mb-2">500+</span>
            <span className="text-foreground/70 font-medium">Companies</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-cyan-400 mb-2">10k+</span>
            <span className="text-foreground/70 font-medium">Students Placed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-cyan-400 mb-2">100%</span>
            <span className="text-foreground/70 font-medium">Free for Students</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 md:px-12 text-center">
        <div className="absolute inset-0 bg-blue-600/5 dark:bg-cyan-400/5 z-0" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-5xl font-bold mb-6">Ready to start your journey?</h3>
          <p className="text-xl text-foreground/70 mb-10">Join thousands of students and companies connecting on SIWES Finder every day.</p>
          <Link 
            href="/signup" 
            className="inline-flex items-center justify-center px-10 py-5 font-bold text-white text-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full hover:shadow-[0_0_40px_rgba(0,200,255,0.4)] hover:-translate-y-1"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/10 text-foreground/50 text-sm">
        <p>&copy; {new Date().getFullYear()} SIWES Finder. All rights reserved.</p>
      </footer>
    </div>
  );
}

