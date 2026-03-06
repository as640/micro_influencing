import { useEffect, useState } from 'react';
import { contractApi, paymentApi } from '../api';
import { useAuth } from '../context/AuthContext';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-900/40 text-amber-300',
    active: 'bg-blue-900/40 text-blue-300',
    completed: 'bg-emerald-900/40 text-emerald-300',
    cancelled: 'bg-red-900/40 text-red-300',
    paid: 'bg-purple-900/40 text-purple-300',
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
  const [updating, setUpdating] = useState(null);
  const [paying, setPaying] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null); // { success, message }

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

  const handleComplete = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'completed');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'completed' } : c));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  // ── Razorpay Payment Flow ──────────────────────────────────────
  const handlePayNow = async (contract) => {
    if (!window.Razorpay) {
      alert('Payment gateway is loading. Please try again in a moment.');
      return;
    }
    if (!RAZORPAY_KEY_ID) {
      alert('Razorpay Key ID is not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.');
      return;
    }

    setPaying(contract.id);
    try {
      // Step 1: Create a Razorpay order on our backend
      const order = await paymentApi.createOrder(contract.id);

      // Step 2: Open the Razorpay checkout modal
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,         // in paise (already set by backend)
        currency: order.currency || 'INR',
        name: 'MicroFluence',
        description: `Payment for contract: ${contract.deliverables?.slice(0, 60)}`,
        order_id: order.id,           // Razorpay order ID from backend
        prefill: {
          name: user?.email?.split('@')[0],
          email: user?.email,
        },
        theme: { color: '#6366f1' },   // Indigo to match design system

        handler: async (response) => {
          // Step 3: Verify payment signature server-side
          try {
            await paymentApi.verifyPayment(contract.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            // Update local state
            setContracts((prev) =>
              prev.map((c) => c.id === contract.id ? { ...c, status: 'completed', payment_intent_id: response.razorpay_payment_id } : c)
            );
            setPaymentResult({ success: true, id: contract.id, paymentId: response.razorpay_payment_id });
          } catch (verifyErr) {
            console.error('Payment verification failed', verifyErr);
            setPaymentResult({ success: false, id: contract.id });
          } finally {
            setPaying(null);
          }
        },

        modal: {
          ondismiss: () => setPaying(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        console.error('Razorpay payment failed:', response.error);
        setPaymentResult({ success: false, id: contract.id });
        setPaying(null);
      });
      rzp.open();

    } catch (err) {
      console.error('Failed to create payment order:', err);
      alert('Could not initialise payment. Make sure the contract is active and Razorpay is configured.');
      setPaying(null);
    }
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

      {/* Payment result toast */}
      {paymentResult && (
        <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 text-sm ${paymentResult.success
            ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
            : 'border-red-700 bg-red-900/30 text-red-300'
          }`}>
          <span className="text-lg">{paymentResult.success ? '✅' : '❌'}</span>
          <div>
            {paymentResult.success ? (
              <>
                <p className="font-semibold">Payment Successful!</p>
                <p className="mt-0.5 text-xs opacity-70">ID: {paymentResult.paymentId}</p>
              </>
            ) : (
              <p className="font-semibold">Payment failed or was cancelled. Please try again.</p>
            )}
          </div>
          <button onClick={() => setPaymentResult(null)} className="ml-auto text-slate-400 hover:text-white">✕</button>
        </div>
      )}

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
                    ? (c.business_name || 'Business')
                    : (c.influencer_handle ? `@${c.influencer_handle}` : 'Influencer');
                  const isPaying = paying === c.id;
                  const wasJustPaid = paymentResult?.success && paymentResult?.id === c.id;
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-800/40">
                      <td className="px-5 py-4 text-xs font-mono text-slate-400">{c.id?.slice(0, 8)}…</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{otherParty}</td>
                      <td className="px-5 py-4 max-w-[180px] truncate text-sm text-slate-300" title={c.deliverables}>{c.deliverables}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-white">₹{Number(c.agreed_price).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4"><StatusBadge status={wasJustPaid ? 'paid' : c.status} /></td>
                      <td className="px-5 py-4">
                        {/* Influencer: accept or decline pending contracts */}
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

                        {/* Business: on active contracts — Pay Now + Mark Complete + Cancel */}
                        {c.status === 'active' && !isInfluencer && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handlePayNow(c)}
                              disabled={isPaying}
                              className="flex items-center gap-1.5 rounded bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-900/40 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                            >
                              {isPaying ? (
                                <span className="animate-pulse">Processing…</span>
                              ) : (
                                <>💳 Pay Now</>
                              )}
                            </button>
                            <button onClick={() => handleComplete(c.id)} disabled={updating === c.id}
                              className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
                              ✓ Mark Done
                            </button>
                            <button onClick={() => handleCancel(c.id)} disabled={updating === c.id}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600 disabled:opacity-50">
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Influencer: on active contracts — view status only */}
                        {c.status === 'active' && isInfluencer && (
                          <span className="text-xs text-slate-500 italic">Awaiting payment from business</span>
                        )}

                        {/* Completed / paid */}
                        {(c.status === 'completed' || wasJustPaid) && (
                          <span className="text-xs text-emerald-400 font-semibold">✓ Done</span>
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

      {/* Razorpay Setup Notice (only shown when key is missing) */}
      {!RAZORPAY_KEY_ID && !isInfluencer && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-300">
          <p className="font-semibold">⚠️ Razorpay not configured</p>
          <p className="mt-1 opacity-80">
            Add <code className="rounded bg-amber-900/50 px-1">VITE_RAZORPAY_KEY_ID=rzp_test_XXXX</code> to your{' '}
            <code className="rounded bg-amber-900/50 px-1">frontend/.env</code> file and restart the dev server.
          </p>
        </div>
      )}
    </section>
  );
}

export default PendingOrdersPage;
