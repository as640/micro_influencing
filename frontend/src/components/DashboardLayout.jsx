import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import ProfileCompletionRing from './ProfileCompletionRing';
import { useAuth } from '../context/AuthContext';

function calcPct(profile) {
  if (!profile) return 0;
  const checks = [
    !!profile.instagram_handle,
    !!profile.category,
    !!profile.locality,
    !!profile.bio,
    profile.price_min != null && profile.price_max != null,
    !!profile.is_verified,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

const getNavItems = (role, isSuperUser) => {
  const items = [
    { to: '/dashboard/home', label: 'Home', icon: '🏠' },
  ];

  if (role === 'business') {
    items.push({ to: '/dashboard/businesses', label: 'My Businesses', icon: '🏢' });
    items.push({ to: '/dashboard/find-influencers', label: 'Find Influencers', icon: '🔍' });
    items.push({ to: '/dashboard/my-campaigns', label: 'My Campaigns', icon: '📢' });
  } else {
    items.push({ to: '/dashboard/find-campaigns', label: 'Find Campaigns', icon: '🎯' });
  }

  items.push(
    { to: '/dashboard/account', label: 'Account Info', icon: '👤' },
    { to: '/dashboard/pending-orders', label: 'Contracts', icon: '📄' },
    { to: '/dashboard/orders', label: 'Earnings', icon: '💰' },
    { to: '/dashboard/messages', label: 'Messages', icon: '💬' }
  );

  if (isSuperUser) {
    items.push({ to: '/dashboard/superadmin', label: 'Superadmin', icon: '👑' });
  }

  return items;
};

function DashboardLayout() {
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isInfluencer = user.role === 'influencer';
  const profile = user.influencer_profile;
  const pct = isInfluencer ? calcPct(profile) : null;
  const isVerified = profile?.is_verified;

  const displayName = profile?.instagram_handle
    || user.business_profiles?.[0]?.company_name
    || user.email;

  const navItems = getNavItems(user.role, user.is_superuser);

  // Bottom bar shows top 5 items for quick access
  const bottomBarItems = navItems.slice(0, 5);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 font-sans animate-fade-in relative">
      
      <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-2xl z-20">
        
        <div className="flex items-center gap-3 px-6 py-6">
          <BrandLogo className="h-12 w-auto animate-float" />
        </div>

        {/* Profile completion banner for influencers */}
        {isInfluencer && pct < 100 && (
          <div className="mx-4 mb-4 rounded-xl border border-amber-500/20 bg-amber-900/10 px-3 py-3">
            <div className="flex items-center gap-3">
              <ProfileCompletionRing percentage={pct} size={40} strokeWidth={4} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-300">Profile {pct}% complete</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5 truncate">Complete to apply to campaigns</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto overflow-x-hidden custom-scrollbar pb-6">
          <p className="px-3 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Menu</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <span className="text-lg opacity-80 mix-blend-luminosity grayscale group-hover:grayscale-0 group-[.active]:grayscale-0 transition-all">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-800 bg-slate-950/50 shadow-inner">
            <div className="relative h-10 w-10 shrink-0 rounded-full border border-slate-700 bg-slate-800 overflow-hidden">
              <img src={user.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="h-full w-full object-cover bg-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-slate-200">
                  {isInfluencer ? `@${displayName}` : displayName}
                </p>
                {isVerified && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 focus:outline-none transition-colors rounded-lg hover:bg-red-400/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile slide-out menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <BrandLogo className="h-10 w-auto" />
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:bg-slate-800 border border-transparent'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {/* Logout at bottom */}
            <div className="p-4 border-t border-slate-800">
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-400/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="md:hidden">
              <BrandLogo className="h-8 w-auto" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isInfluencer && pct < 100 && (
              <NavLink to="/dashboard/account" className="flex items-center gap-2 rounded-xl bg-amber-900/20 border border-amber-500/20 px-2 sm:px-3 py-1.5 hover:bg-amber-900/30 transition-all">
                <ProfileCompletionRing percentage={pct} size={24} strokeWidth={3} showLabel={false} />
                <span className="text-xs font-bold text-amber-300 hidden sm:inline">{pct}% complete</span>
              </NavLink>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 lg:p-10 pb-20 md:pb-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {bottomBarItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-center transition-all min-w-0 flex-1 ${
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-500'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] font-semibold truncate w-full">{item.label.split(' ').slice(0,2).join(' ')}</span>
            </NavLink>
          ))}
          {/* More menu item */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-center text-slate-500 min-w-0 flex-1"
          >
            <span className="text-lg leading-none">☰</span>
            <span className="text-[9px] font-semibold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default DashboardLayout;
