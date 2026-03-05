import { useEffect, useState } from 'react';
import { contractApi } from '../api';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-900/40 text-amber-300',
    active: 'bg-blue-900/40 text-blue-300',
    completed: 'bg-emerald-900/40 text-emerald-300',
    cancelled: 'bg-red-900/40 text-red-300',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-slate-800 text-slate-300'}`}>
      {status}
    </span>
  );
}

function PendingOrdersPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // ID of contract being updated

  useEffect(() => {
    contractApi.list()
      .then(setContracts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'active');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'active' } : c));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const handleCancel = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'cancelled');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'cancelled' } : c));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const pendingContracts = contracts.filter((c) => c.status === 'pending');
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const completedContracts = contracts.filter((c) => c.status === 'completed');
  const isInfluencer = user?.role === 'influencer';

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-slate-400">Loading contracts…</div>;
  }

  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-white">Contracts &amp; Deals</h2>
        <p className="mt-1 text-slate-400">Track your pending proposals, active jobs, and completed work.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Proposals', count: pendingContracts.length, color: 'text-amber-300' },
          { label: 'Active Jobs', count: activeContracts.length, color: 'text-blue-300' },
          { label: 'Completed', count: completedContracts.length, color: 'text-emerald-300' },
        ].map((s) => (
          <article key={s.label} className="glow-hover rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.count}</p>
          </article>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">All Contracts</h3>
        </div>

        {contracts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  {['ID', isInfluencer ? 'Business' : 'Influencer', 'Deliverables', 'Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {contracts.map((c) => {
                  const otherParty = isInfluencer
                    ? (c.business?.company_name || 'Business')
                    : (c.influencer?.instagram_handle || 'Influencer');
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-800/40">
                      <td className="px-5 py-4 text-xs font-mono text-slate-400">{c.id?.slice(0, 8)}…</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{otherParty}</td>
                      <td className="px-5 py-4 max-w-[200px] truncate text-sm text-slate-300">{c.deliverables}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-white">₹{Number(c.agreed_price).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-4">
                        {c.status === 'pending' && isInfluencer && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAccept(c.id)} disabled={updating === c.id}
                              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                              Accept
                            </button>
                            <button onClick={() => handleCancel(c.id)} disabled={updating === c.id}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600 disabled:opacity-50">
                              Decline
                            </button>
                          </div>
                        )}
                        {c.status === 'active' && !isInfluencer && (
                          <button onClick={() => handleCancel(c.id)} disabled={updating === c.id}
                            className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600 disabled:opacity-50">
                            Cancel
                          </button>
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

export default PendingOrdersPage;
