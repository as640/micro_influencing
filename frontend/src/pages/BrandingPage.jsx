import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import MarketingHeaderBar from '../components/MarketingHeaderBar';

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.9 1.35a1.18 1.18 0 1 1 0 2.36 1.18 1.18 0 0 1 0-2.36ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
      </svg>
    )
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M6.94 8.5H3.56V21h3.38V8.5ZM5.25 3A2.08 2.08 0 1 0 5.3 7.16 2.08 2.08 0 0 0 5.25 3ZM21 13.83c0-3.76-2-5.5-4.67-5.5a4.05 4.05 0 0 0-3.64 2.01V8.5H9.31V21h3.38v-6.54c0-1.72.32-3.4 2.46-3.4 2.12 0 2.15 1.98 2.15 3.5V21H21v-7.17Z" />
      </svg>
    )
  },
  {
    label: 'Gmail',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.2.2v10.6h1.9v-8.1L12 13l4.9-3.8v8.1h1.9V6.7L12 11.9 5.2 6.7Z" />
      </svg>
    )
  }
];

function BrandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-10 text-slate-100">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

      <MarketingHeaderBar />

      <main className="animate-fade-in relative mx-auto mt-8 flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur md:p-10">
        <div className="w-full max-w-3xl animate-fade-up">
          <BrandLogo className="max-h-64 glow-hover" />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300 animate-fade-up">Grow Together</p>
        <h1 className="mt-3 text-center text-3xl font-bold text-white md:text-5xl animate-fade-up">The Influencer Marketplace for Real Growth</h1>
        <p className="mt-4 max-w-2xl text-center text-slate-300 md:text-lg animate-fade-up">
          Connect creators with brands, manage campaigns, and track payouts in one unified workspace.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row animate-fade-up">
          <Link
            to="/login"
            className="glow-hover flex-1 rounded-lg bg-indigo-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="glow-hover flex-1 rounded-lg border border-slate-600 bg-slate-800 px-6 py-3 text-center font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Sign Up
          </Link>
        </div>
      </main>

      <footer className="relative mx-auto mt-6 flex w-full max-w-5xl items-center justify-center gap-2 px-4 animate-fade-up">
        {socialLinks.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-label={item.label}
            className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-slate-300 transition hover:border-indigo-500 hover:text-white"
          >
            {item.icon}
          </a>
        ))}
      </footer>
    </div>
  );
}

export default BrandingPage;
