import { useEffect, useState } from 'react';
import HomeFooter from '../components/HomeFooter';
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

function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Active campaigns', value: 0, suffix: '' },
    { label: 'Completed jobs', value: 0, suffix: '' },
    { label: 'Total Volume', value: 0, suffix: 'k' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const contracts = await contractApi.list();

        let active = 0;
        let completed = 0;
        let totalMoney = 0;

        contracts.forEach(c => {
          if (c.status === 'active') active++;
          if (c.status === 'completed') {
            completed++;
            totalMoney += Number(c.agreed_price || 0);
          }
        });

        setStats([
          { label: 'Active campaigns', value: active, suffix: '' },
          { label: 'Completed jobs', value: completed, suffix: '' },
          { label: 'Total Volume (₹)', value: totalMoney > 0 ? totalMoney / 1000 : 0, suffix: 'k', decimals: 1 }
        ]);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  return (
    <>
      <section className="space-y-8 animate-fade-in font-sans">
        
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/50 backdrop-blur-md px-8 py-10 shadow-2xl">
          <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-600/20 opacity-50 mixing-blend-screen"></div>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-[80px]"></div>
          
          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-400">Dashboard Area</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white font-display">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{user?.email.split('@')[0]}</span></h2>
            <p className="mt-3 max-w-2xl text-slate-300 font-medium text-lg">
              Here's a quick overview of your workspace. Check your contracts and messages for new updates.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((item, index) => (
            <article
              key={item.label}
              className="glow-hover glass-panel rounded-2xl p-6 relative overflow-hidden group"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1 relative z-10">{item.label}</p>
              <p className="mt-2 text-4xl font-extrabold text-white font-display text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 relative z-10">
                {loading ? (
                  <span className="text-slate-600">--</span>
                ) : (
                  <AnimatedNumber target={item.value} suffix={item.suffix} decimals={item.decimals || 0} />
                )}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="-mx-6 mt-12">
        <HomeFooter />
      </div>
    </>
  );
}

export default HomePage;
