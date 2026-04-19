import { Link } from 'react-router-dom';

const brandLinks = [
  { to: '/dashboard/home', label: 'Home' },
  { to: '/dashboard/account', label: 'Account Info' },
  { to: '/dashboard/orders', label: 'Orders & Earnings' },
  { to: '/dashboard/pending-orders', label: 'Pending Orders' },
  { to: '/dashboard/messages', label: 'Messages' }
];

const quickLinks = [
  { to: '/', label: 'Branding' },
  { to: '/login', label: 'Log In' },
  { to: '/signup', label: 'Sign Up' }
];

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

function HomeFooter() {
  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-900/90 px-6 py-10 text-slate-300 animate-fade-up">
      <div className="grid gap-10 md:grid-cols-4">
        <div>
          <p className="text-xl font-semibold text-white">MicroFluence</p>
          <p className="mt-2 text-sm text-slate-400">Grow together with smarter creator-brand collaborations.</p>
          <div className="mt-4 flex items-center gap-2">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition hover:border-indigo-500 hover:text-white"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-2xl font-semibold text-white">About Us</p>
          <div className="mt-4 space-y-3 text-lg">
            {brandLinks.map((item) => (
              <Link key={item.to} to={item.to} className="block transition hover:text-indigo-300">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-2xl font-semibold text-white">Resources</p>
          <div className="mt-4 space-y-3 text-lg">
            <p className="transition hover:text-indigo-300">Insights</p>
            <p className="transition hover:text-indigo-300">Careers</p>
            <p className="text-indigo-300 transition hover:text-indigo-200">Our Services</p>
          </div>
        </div>

        <div>
          <p className="text-2xl font-semibold text-white">Get In Touch</p>
          <div className="mt-4 space-y-3 text-lg">
            <p className="transition hover:text-indigo-300">Contact Us</p>
            {quickLinks.map((item) => (
              <Link key={item.to} to={item.to} className="block transition hover:text-indigo-300">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
