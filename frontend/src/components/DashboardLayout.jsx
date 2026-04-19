import { NavLink, Outlet, Navigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

// Base items for both roles
const getNavItems = (role, isSuperUser) => {
  const items = [
    { to: '/dashboard/home', label: '🏠  Home' },
  ];

  if (role === 'business') {
    items.push({ to: '/dashboard/businesses', label: '🏢  My Businesses' });
    items.push({ to: '/dashboard/find-influencers', label: '🔍  Find Influencers' });
    items.push({ to: '/dashboard/my-campaigns', label: '📢  My Campaigns' });
  } else {
    items.push({ to: '/dashboard/find-campaigns', label: '🎯  Find Campaigns' });
  }

  items.push(
    { to: '/dashboard/account', label: '👤  Account Info' },
    { to: '/dashboard/pending-orders', label: '📄  Contracts' },
    { to: '/dashboard/orders', label: '💰  Earnings' },
    { to: '/dashboard/messages', label: '💬  Messages' }
  );

  // Community Intelligence — visible to influencers (primary audience)
  // and to all users so businesses can also browse what's gaining traction.
  items.push(
    { to: '/dashboard/community', label: '🌐  Community Hub' },
    { to: '/dashboard/community-campaigns', label: '📣  Campaigns' },
  );

  if (isSuperUser) {
    items.push({ to: '/dashboard/superadmin', label: '👑  Superadmin' });
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:flex animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full border-b border-slate-800 bg-slate-900 md:min-h-screen md:w-72 md:flex md:flex-col md:border-b-0 md:border-r md:border-slate-800">
        <div className="space-y-2 px-6 py-6">
          <BrandLogo className="max-h-24 animate-float" />
          <div>
            <h1 className="text-2xl font-bold text-white">MicroFluence</h1>
            <p className="mt-0.5 text-sm text-indigo-400 font-medium capitalize">{user.role} Portal</p>
          </div>
        </div>

        {/* Logged-in user badge */}
        <div className="mx-4 mb-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{displayName}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {getNavItems(user.role, user.is_superuser).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout button at bottom */}
        <div className="p-4 mt-auto">
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-red-700 hover:bg-red-900/20 hover:text-red-300"
          >
            🚪  Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
          <p className="text-sm font-medium text-slate-300">
            Dashboard · <span className="text-indigo-400 capitalize">{user.role}</span>
          </p>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
