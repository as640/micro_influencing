import { useEffect, useState } from 'react';
import { contractApi } from '../api';
import { useAuth } from '../context/AuthContext';

function OrdersEarningsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contractApi.list()
      .then((data) => setContracts(data.filter((c) => c.status === 'completed')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isInfluencer = user?.role === 'influencer';

  // Compute earnings totals from completed contracts
  const totalEarned = contracts.reduce((sum, c) => sum + parseFloat(c.agreed_price || 0), 0);

  const fmt = (n) => `₹${Number(n.toFixed(0)).toLocaleString('en-IN')}`;

  const summaryCards = [
    { label: isInfluencer ? 'Total Earned' : 'Total Spent', value: fmt(totalEarned) },
    { label: 'Completed jobs', value: contracts.length },
    { label: 'Pending payout', value: '₹0' }, // Future: payment status field
  ];

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-slate-400">Loading history…</div>;
  }

  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-white">Order History &amp; {isInfluencer ? 'Earnings' : 'Spending'}</h2>
        <p className="mt-1 text-slate-400">All completed collaborations and payouts.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((s, i) => (
          <article key={s.label}
            className="glow-hover rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm animate-fade-up"
            style={{ animationDelay: `${i * 100}ms` }}>
            <p className="text-sm font-medium text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
          </article>
        ))}
      </div>

      {/* Completed contracts table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 className="font-semibold text-white">Completed Contracts</h3>
        </div>

        {contracts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No completed contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  {['ID', isInfluencer ? 'Business' : 'Influencer', 'Deliverables', 'Amount', 'Date', 'Receipt'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {contracts.map((c) => {
                  const party = isInfluencer
                    ? (c.business_name || 'Business')
                    : (c.influencer_handle || 'Influencer');
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-800/50">
                      <td className="px-5 py-4 text-xs font-mono text-slate-400">{c.id?.slice(0, 8)}…</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{party}</td>
                      <td className="px-5 py-4 max-w-[200px] truncate text-sm text-slate-300">{c.deliverables}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-white">₹{Number(c.agreed_price).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {new Date(c.updated_at || c.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-4">
                        {c.payment_intent_id ? (
                          <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                            Paid
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default OrdersEarningsPage;
