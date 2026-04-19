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
            totalMoney += Number(c.payment_amount || 0);
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
      <section className="space-y-8 animate-fade-in">
        <div className="animate-gradient rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-cyan-600 px-8 py-10 text-white shadow-lg shadow-slate-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">Dashboard</p>
          <h2 className="mt-3 text-3xl font-bold">Welcome back, {user?.email.split('@')[0]}</h2>
          <p className="mt-2 max-w-2xl text-indigo-100">
            Here's a quick overview of your workspace. Check your contracts and messages for new updates.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {stats.map((item, index) => (
            <article
              key={item.label}
              className="glow-hover rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm animate-fade-up"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <p className="text-sm font-medium text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">
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
