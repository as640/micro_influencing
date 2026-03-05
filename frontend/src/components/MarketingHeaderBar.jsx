import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const topNavItems = [
  { label: 'Our Services', to: '/our-services' },
  { label: 'Who We Are', to: '/who-we-are' }
];

function MarketingHeaderBar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-700/80 bg-slate-900/95 shadow-lg shadow-slate-950/40 backdrop-blur animate-fade-in">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-4 text-slate-100 md:px-7">
        <Link to="/" className="flex items-center">
          <BrandLogo className="h-10 w-auto max-w-[180px] rounded-md border-white/10" />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-medium">
          {topNavItems.map((item) => (
            <Link key={item.to} to={item.to} className="transition hover:text-indigo-300">
              {item.label}
            </Link>
          ))}
          <Link to="/insights" className="inline-flex items-center gap-2 transition hover:text-indigo-300">
            <span>Insights</span>
            <span className="text-sm">▾</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default MarketingHeaderBar;
