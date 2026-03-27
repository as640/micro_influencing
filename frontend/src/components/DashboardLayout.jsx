import { NavLink, Outlet, Navigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

// Base items for both roles
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

  // If still loading auth state, show nothing (avoid flash)
  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.influencer_profile?.instagram_handle
    || user.business_profile?.company_name
    || user.email;

  const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 font-sans animate-fade-in relative">
      
      {/* Global subtle background glows */}
      <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-2xl z-20">
        
        {/* Brand Area */}
        <div className="flex items-center gap-3 px-6 py-8">
          <BrandLogo className="h-10 w-auto animate-float" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white/90 font-display">MicroFluence</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">{roleDisplay}</p>
          </div>
        </div>

        {/* Navigation Map */}
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto overflow-x-hidden custom-scrollbar pb-6">
          <p className="px-3 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Menu</p>
          {getNavItems(user.role, user.is_superuser).map((item) => (
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

        {/* User Profile / Logout Banner */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-800 bg-slate-950/50 shadow-inner">
            <div className="h-10 w-10 shrink-0 rounded-full border border-slate-700 bg-slate-800 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{displayName}</p>
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

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl px-6 lg:px-10 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile menu icon placeholder if needed */}
            <div className="md:hidden">
              <BrandLogo className="h-8 w-auto" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200 hidden md:block capitalize font-display">
              {user.role} Dashboard
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
