import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeFooter from '../components/HomeFooter';
import ProfileCompletionRing from '../components/ProfileCompletionRing';
import { contractApi } from '../api';
import { useAuth } from '../context/AuthContext';

function AnimatedNumber({ target, suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frameId;
    const duration = 1000;
    const start = performance.now();
    const step = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target]);
  return `${count.toFixed(decimals)}${suffix}`;
}

function calcPct(profile) {
  if (!profile) return 0;
  const checks = [
    !!profile.instagram_handle, !!profile.category, !!profile.locality,
    !!profile.bio, profile.price_min != null && profile.price_max != null, !!profile.is_verified,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800/60 last:border-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-200 text-right max-w-[60%] truncate">{value || '—'}</p>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInfluencer = user?.role === 'influencer';
  const profile = user?.influencer_profile;
  const pct = isInfluencer ? calcPct(profile) : null;

  const [stats, setStats] = useState({ active: 0, completed: 0, totalMoney: 0 });
  const [businessStats, setBusinessStats] = useState({ activeAds: 0, closedAds: 0, totalInterests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isInfluencer) {
          const contracts = await contractApi.list();
          let active = 0, completed = 0, totalMoney = 0;
          contracts.forEach(c => {
            if (['active', 'work_submitted', 'work_verified', 'payment_done'].includes(c.status)) active++;
            if (c.status === 'completed') { completed++; totalMoney += Number(c.agreed_price || 0); }
          });
          setStats({ active, completed, totalMoney });
        } else {
          // For businesses: load their campaigns to count active, closed, and interests
          const campaigns = await (await import('../api')).campaignApi.list();
          let activeAds = 0, closedAds = 0, totalInterests = 0;
          
          const myBizIds = new Set((user?.business_profiles || []).map(b => b.id));
          const myAds = user?.is_superuser ? campaigns : campaigns.filter(c => myBizIds.has(c.business_info?.id));
          
          myAds.forEach(c => {
            if (c.is_active) activeAds++; else closedAds++;
            totalInterests += (c.interests_count || 0);
          });
          setBusinessStats({ activeAds, closedAds, totalInterests });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, isInfluencer]);

  if (isInfluencer) {
    const fmt = n => `₹${Number(n.toFixed(0)).toLocaleString('en-IN')}`;
    return (
      <>
        <section className="space-y-8 animate-fade-in font-sans">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/50 backdrop-blur-md px-8 py-10 shadow-2xl">
            <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-600/20 opacity-50"></div>
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-[80px]"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              <ProfileCompletionRing percentage={pct} size={100} strokeWidth={8} />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-400">Your Dashboard</p>
                <h2 className="mt-1 text-3xl font-extrabold text-white">
                  Welcome back,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                    {profile?.instagram_handle ? `@${profile.instagram_handle}` : user?.email.split('@')[0]}
                  </span>
                  {profile?.is_verified && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="inline h-7 w-7 ml-2 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </h2>
                {pct < 100 ? (
                  <p className="mt-2 text-amber-300 font-semibold text-sm">
                    ⚡ Your profile is {pct}% complete.{' '}
                    <button onClick={() => navigate('/dashboard/account')} className="underline hover:text-amber-200">
                      Complete it to apply to campaigns.
                    </button>
                  </p>
                ) : (
                  <p className="mt-2 text-emerald-400 font-semibold text-sm">✅ Profile 100% complete — you can apply to campaigns!</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: 'Active Campaigns', value: stats.active, suffix: '', color: 'text-blue-400' },
              { label: 'Completed Jobs', value: stats.completed, suffix: '', color: 'text-emerald-400' },
              { label: 'Total Earnings', value: loading ? 0 : stats.totalMoney / 1000, suffix: 'k', decimals: 1, prefix: '₹', color: 'text-violet-400' },
            ].map((item, i) => (
              <article key={item.label} className="glow-hover glass-panel rounded-2xl p-6 relative overflow-hidden group" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1 relative z-10">{item.label}</p>
                <p className={`mt-2 text-4xl font-extrabold font-display relative z-10 ${item.color}`}>
                  {loading ? <span className="text-slate-600">--</span> : (
                    <><AnimatedNumber target={item.value} suffix={item.suffix} decimals={item.decimals || 0} /></>
                  )}
                </p>
              </article>
            ))}
          </div>

          {/* Info visible to businesses */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                Your Public Profile
              </h3>
              <InfoRow label="Handle" value={profile?.instagram_handle ? `@${profile.instagram_handle}` : null} />
              <InfoRow label="Category" value={profile?.category} />
              <InfoRow label="Location" value={profile?.locality} />
              <InfoRow label="Followers" value={profile?.followers_count ? Number(profile.followers_count).toLocaleString('en-IN') : null} />
              <InfoRow label="Avg Reach" value={profile?.avg_reach ? Number(profile.avg_reach).toLocaleString('en-IN') : null} />
              <InfoRow label="Price Range" value={profile?.price_min && profile?.price_max ? `₹${Number(profile.price_min).toLocaleString('en-IN')} – ₹${Number(profile.price_max).toLocaleString('en-IN')}` : null} />
            </div>
            <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-400"></span>
                Bio Shown to Businesses
              </h3>
              {profile?.bio ? (
                <p className="text-sm text-slate-300 leading-relaxed">{profile.bio}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 gap-2">
                  <p className="text-sm text-slate-500">No bio added yet</p>
                  <button onClick={() => navigate('/dashboard/account')} className="text-xs text-indigo-400 underline">Add bio →</button>
                </div>
              )}
            </div>
          </div>
        </section>
        <div className="-mx-6 mt-12"><HomeFooter /></div>
      </>
    );
  }

  // Business dashboard
  return (
    <>
      <section className="space-y-8 animate-fade-in font-sans">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/50 backdrop-blur-md px-8 py-10 shadow-2xl">
          <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-600/20 opacity-50"></div>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-[80px]"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-400">Dashboard Area</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white font-display">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{user?.email.split('@')[0]}</span></h2>
            <p className="mt-3 max-w-2xl text-slate-300 font-medium text-lg">Here's a quick overview of your workspace. Check your campaigns and messages for new updates.</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: 'Active Campaigns', value: businessStats.activeAds, color: 'text-indigo-400' },
            { label: 'Completed Campaigns', value: businessStats.closedAds, color: 'text-emerald-400' },
            { label: 'Total Interests', value: businessStats.totalInterests, color: 'text-amber-400' }
          ].map((item, index) => (
            <article key={item.label} className="glow-hover glass-panel rounded-2xl p-6 relative overflow-hidden group" style={{ animationDelay: `${index * 120}ms` }}>
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1 relative z-10">{item.label}</p>
              <p className={`mt-2 text-4xl font-extrabold font-display relative z-10 ${item.color}`}>
                {loading ? <span className="text-slate-600">--</span> : <AnimatedNumber target={item.value} />}
              </p>
            </article>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6 md:p-8 mt-6 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Your Businesses</h3>
          {user?.business_profiles?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {user.business_profiles.map((bp) => (
                <div key={bp.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 relative group hover:border-indigo-500/50 transition-colors shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-200">{bp.company_name}</h4>
                    {bp.is_verified && <span className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">✓</span>}
                  </div>
                  <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">{bp.industry}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
              <p className="text-sm text-slate-500 mb-3">You don't have any businesses linked to this account yet.</p>
              <button onClick={() => navigate('/dashboard/my-businesses')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                Setup Business Profile →
              </button>
            </div>
          )}
        </div>
      </section>
      <div className="-mx-6 mt-12"><HomeFooter /></div>
    </>
  );
}

export default HomePage;
