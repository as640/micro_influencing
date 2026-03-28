import { useEffect, useState } from 'react';
import { contractApi, paymentApi, disputeApi } from '../api';
import { useAuth } from '../context/AuthContext';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-900/40 text-amber-300',
    active: 'bg-blue-900/40 text-blue-300',
    work_submitted: 'bg-indigo-900/40 text-indigo-300',
    work_verified: 'bg-teal-900/40 text-teal-300',
    payment_done: 'bg-green-900/40 text-green-300',
    completed: 'bg-emerald-900/40 text-emerald-300',
    cancelled: 'bg-red-900/40 text-red-300',
    paid: 'bg-purple-900/40 text-purple-300',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-slate-800 text-slate-300'}`}>
      {status.replace('_', ' ')}
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
  const [disputeModal, setDisputeModal] = useState({ isOpen: false, contractId: null, reason: '' });

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

  const handleVerifyWork = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'work_verified');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'work_verified' } : c));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const handlePaymentDone = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'payment_done');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'payment_done' } : c));
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

  const handleSubmitWork = async (id) => {
    setUpdating(id);
    try {
      await contractApi.updateStatus(id, 'work_submitted');
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'work_submitted' } : c));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeModal.reason.trim()) return;
    setUpdating(disputeModal.contractId);
    try {
      await disputeApi.create(disputeModal.contractId, disputeModal.reason);
      setContracts((prev) => prev.map((c) => c.id === disputeModal.contractId ? { ...c, has_open_dispute: true } : c));
      setDisputeModal({ isOpen: false, contractId: null, reason: '' });
      alert('Dispute raised successfully. Communication is now paused until resolved.');
    } catch (err) { 
      console.error(err);
      alert('Failed to raise dispute.');
    } finally { 
      setUpdating(null); 
    }
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
            await contractApi.updateStatus(contract.id, 'payment_done');
            setContracts((prev) =>
              prev.map((c) => c.id === contract.id ? { ...c, status: 'payment_done', payment_intent_id: response.razorpay_payment_id } : c)
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
    <section className="space-y-8 animate-fade-in font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-display">Contracts &amp; Deals</h2>
          <p className="mt-1.5 text-slate-400 font-medium">Track your pending proposals, active jobs, and completed work.</p>
        </div>
      </div>

      {/* Payment result toast */}
      {paymentResult && (
        <div className={`flex items-start gap-4 rounded-2xl border px-6 py-5 text-sm shadow-xl animate-fade-down relative overflow-hidden backdrop-blur-md ${paymentResult.success
            ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300'
            : 'border-red-500/30 bg-red-900/20 text-red-300'
          }`}>
          {paymentResult.success && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none"></div>}
          <span className="text-2xl relative z-10 bg-slate-900/50 p-2 rounded-full shadow-inner">{paymentResult.success ? '✅' : '❌'}</span>
          <div className="relative z-10">
            {paymentResult.success ? (
              <>
                <p className="font-extrabold text-base text-white">Payment Successful!</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400/80">Ref: {paymentResult.paymentId}</p>
              </>
            ) : (
              <p className="font-bold text-base text-white">Payment failed or was cancelled. Please try again.</p>
            )}
          </div>
          <button onClick={() => setPaymentResult(null)} className="ml-auto text-slate-400 hover:text-white transition-colors relative z-10 bg-slate-900/50 hover:bg-slate-800 rounded-full p-1.5 flex items-center justify-center">✕</button>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid gap-6 sm:grid-cols-3 relative z-10">
        {[
          { label: 'Pending Proposals', count: pendingContracts.length, color: 'text-amber-400', glow: 'bg-amber-500/10' },
          { label: 'Active Jobs', count: activeContracts.length, color: 'text-blue-400', glow: 'bg-blue-500/10' },
          { label: 'Completed', count: completedContracts.length, color: 'text-emerald-400', glow: 'bg-emerald-500/10' },
        ].map((s, idx) => (
          <article key={s.label} className="glow-hover glass-panel rounded-2xl p-6 relative overflow-hidden group" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className={`absolute -right-6 -top-6 h-32 w-32 rounded-full ${s.glow} blur-3xl group-hover:blur-2xl transition-all pointer-events-none`}></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">{s.label}</p>
            <p className={`mt-2 text-4xl font-extrabold font-display relative z-10 drop-shadow-sm ${s.color}`}>{s.count}</p>
          </article>
        ))}
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-2xl shadow-xl overflow-hidden relative z-10 border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl">
        <div className="border-b border-slate-800/60 px-6 py-5 bg-slate-900/50 flex justify-between items-center">
          <h3 className="text-xl font-extrabold text-white font-display">All Contracts</h3>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-800 rounded-full text-slate-400 border border-slate-700">{contracts.length} Total</span>
        </div>

        {contracts.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 shadow-inner">📄</div>
            <p className="text-base font-semibold text-slate-300">No contracts yet.</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">When you propose or receive a contract, it will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-800/60">
              <thead className="bg-slate-950/60 backdrop-blur-md">
                <tr>
                  {['Ref ID', isInfluencer ? 'Business' : 'Influencer', 'Deliverables', 'Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-transparent">
                {contracts.map((c) => {
                  const otherParty = isInfluencer
                    ? (c.business_name || 'Business')
                    : (c.influencer_handle ? `@${c.influencer_handle}` : 'Influencer');
                  const isPaying = paying === c.id;
                  const wasJustPaid = paymentResult?.success && paymentResult?.id === c.id;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-slate-800/30 group">
                      <td className="px-6 py-5 text-xs font-mono font-medium text-slate-500 group-hover:text-slate-400">{c.id?.slice(0, 8)}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-200">{otherParty}</td>
                      <td className="px-6 py-5 max-w-[220px] truncate text-sm text-slate-400 font-medium" title={c.deliverables}>{c.deliverables}</td>
                      <td className="px-6 py-5 text-sm font-extrabold text-white font-display tracking-tight">₹{Number(c.agreed_price).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-5">
                        <StatusBadge status={wasJustPaid ? 'paid' : c.status} />
                        {c.has_open_dispute && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                            Disputed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {/* Influencer: accept or decline pending contracts */}
                        {c.status === 'pending' && isInfluencer && (
                          <div className="flex gap-2.5">
                            <button onClick={() => handleAccept(c.id)} disabled={updating === c.id}
                              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                              Accept
                            </button>
                            <button onClick={() => handleCancel(c.id)} disabled={updating === c.id}
                              className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:pointer-events-none">
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Influencer: active contract -> Submit Work */}
                        {c.status === 'active' && isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <button onClick={() => handleSubmitWork(c.id)} disabled={updating === c.id || c.has_open_dispute}
                              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                              Submit Work
                            </button>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Business: active contract -> Awaiting Work */}
                        {c.status === 'active' && !isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 pr-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse"></span>Awaiting work...</span>
                            <button onClick={() => handleCancel(c.id)} disabled={updating === c.id || c.has_open_dispute}
                              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:pointer-events-none">
                              Cancel
                            </button>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Business: work_submitted -> Verify Work */}
                        {c.status === 'work_submitted' && !isInfluencer && (
                          <div className="flex flex-wrap gap-2.5">
                            <button onClick={() => handleVerifyWork(c.id)} disabled={updating === c.id || c.has_open_dispute}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-900/40 hover:text-emerald-300 disabled:opacity-50">
                              ✓ Verify Work
                            </button>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Influencer: work_submitted -> Awaiting Verification */}
                        {c.status === 'work_submitted' && isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 pr-2">Awaiting Verification</span>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Business: work_verified -> Pay Now or Mark Paid */}
                        {c.status === 'work_verified' && !isInfluencer && (
                          <div className="flex flex-wrap gap-2.5">
                            <button onClick={() => handlePayNow(c)} disabled={isPaying || c.has_open_dispute}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none glow-hover">
                              {isPaying ? <span className="animate-pulse">Processing…</span> : <>💳 Pay Now</>}
                            </button>
                            <button onClick={() => handlePaymentDone(c.id)} disabled={updating === c.id || c.has_open_dispute}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-900/40 hover:text-emerald-300 disabled:opacity-50">
                              ✓ Mark Paid Manually
                            </button>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Influencer: work_verified -> Awaiting Payment */}
                        {c.status === 'work_verified' && isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 pr-2">Awaiting Payment</span>
                          </div>
                        )}

                        {/* Influencer: payment_done -> Confirm Completion */}
                        {c.status === 'payment_done' && isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <button onClick={() => handleComplete(c.id)} disabled={updating === c.id || c.has_open_dispute}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none glow-hover">
                              ✓ Confirm Completion
                            </button>
                            <button onClick={() => setDisputeModal({ isOpen: true, contractId: c.id, reason: '' })} 
                              className="rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300">
                              Dispute
                            </button>
                          </div>
                        )}

                        {/* Business: payment_done -> Awaiting Influencer Confirmation */}
                        {c.status === 'payment_done' && !isInfluencer && (
                          <div className="flex flex-wrap gap-2.5 items-center">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 pr-2">Awaiting Influencer Receipt</span>
                          </div>
                        )}

                        {/* Completed / paid */}
                        {(c.status === 'completed' || wasJustPaid) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400 shadow-inner">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            Done
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

      {/* Razorpay Setup Notice */}
      {!RAZORPAY_KEY_ID && !isInfluencer && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-300">
          <p className="font-semibold">⚠️ Razorpay not configured</p>
          <p className="mt-1 opacity-80">
            Add <code className="rounded bg-amber-900/50 px-1">VITE_RAZORPAY_KEY_ID=rzp_test_XXXX</code> to your{' '}
            <code className="rounded bg-amber-900/50 px-1">frontend/.env</code> file and restart the dev server.
          </p>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">Raise a Dispute</h3>
            <p className="text-sm text-slate-400 mb-4">Please detail the issue. This will pause platform communication with the other party until an admin resolves it.</p>
            
            <form onSubmit={handleRaiseDispute}>
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                rows="4"
                placeholder="Explain the problem (e.g., work not submitted, payment delayed, poor quality...)"
                value={disputeModal.reason}
                onChange={(e) => setDisputeModal(m => ({ ...m, reason: e.target.value }))}
                required
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDisputeModal({ isOpen: false, contractId: null, reason: '' })}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!disputeModal.reason.trim() || updating === disputeModal.contractId}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                >
                  {updating === disputeModal.contractId ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default PendingOrdersPage;
