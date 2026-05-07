import { useEffect, useState, useMemo } from 'react';
import { contractApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ReceiptCard from '../components/ReceiptCard';

const FILTERS = ['all', 'today', 'this_month'];

function OrdersEarningsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    contractApi.list()
      .then(all => setContracts(all.filter(c => c.status === 'completed')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'today') {
      const today = now.toDateString();
      return contracts.filter(c => new Date(c.updated_at || c.created_at).toDateString() === today);
    }
    if (filter === 'this_month') {
      return contracts.filter(c => {
        const d = new Date(c.updated_at || c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return contracts;
  }, [contracts, filter]);

  const totalEarnings = filtered.reduce((s, c) => s + Number(c.agreed_price || 0), 0);
  const escrowCount = filtered.filter(c => c.escrow_opted).length;

  const filterLabel = { all: 'All Time', today: 'Today', this_month: 'This Month' };

  const isBusiness = user?.role === 'business';

  return (
    <section className="space-y-8 animate-fade-in font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-display">
            {isBusiness ? 'Order History' : 'Earnings'}
          </h2>
          <p className="mt-1.5 text-slate-400 font-medium">
            {isBusiness ? 'Track your payments and download receipts.' : 'Track your completed work and download receipts.'}
          </p>
        </div>
        {/* Date filter */}
        <div className="flex gap-2 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}>
              {filterLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: isBusiness ? 'Total Spent' : 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, color: 'text-emerald-400', glow: 'bg-emerald-500/10' },
          { label: 'Jobs Completed', value: filtered.length, color: 'text-indigo-400', glow: 'bg-indigo-500/10' },
          { label: 'Escrow Protected', value: escrowCount, color: 'text-violet-400', glow: 'bg-violet-500/10' },
        ].map((s, i) => (
          <div key={s.label} className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${s.glow} blur-2xl pointer-events-none`} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16 animate-pulse">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl px-6 py-16 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50 text-2xl">💸</div>
          <p className="text-base font-semibold text-slate-300">No completed orders {filter !== 'all' ? `for ${filterLabel[filter].toLowerCase()}` : 'yet'}.</p>
          <p className="text-sm text-slate-500 mt-1">Complete contracts to see your receipts here.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map(c => <ReceiptCard key={c.id} contract={c} />)}
        </div>
      )}
    </section>
  );
}

export default OrdersEarningsPage;
