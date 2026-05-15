import { useEffect, useState } from 'react';
import { contractApi, paymentApi } from '../api';
import { useAuth } from '../context/AuthContext';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

/* ── Helpers ─────────────────────────────────────────────────────── */

const STATUS_META = {
  pending:        { label: 'Awaiting Influencer',  color: 'text-amber-300',  bg: 'bg-amber-900/40'  },
  active:         { label: 'Active / In Progress', color: 'text-blue-300',   bg: 'bg-blue-900/40'   },
  work_submitted: { label: 'Work Submitted',        color: 'text-violet-300', bg: 'bg-violet-900/40' },
  work_verified:  { label: 'Work Verified',         color: 'text-cyan-300',   bg: 'bg-cyan-900/40'   },
  payment_done:   { label: 'Payment Sent',          color: 'text-purple-300', bg: 'bg-purple-900/40' },
  completed:      { label: 'Completed',             color: 'text-emerald-300',bg: 'bg-emerald-900/40'},
  cancelled:      { label: 'Cancelled',             color: 'text-red-300',    bg: 'bg-red-900/40'    },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'text-slate-300', bg: 'bg-slate-800' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
}

/** Visual pipeline showing which step the contract is on */
function EscrowProgress({ status, escrow_opted }) {
  const steps = escrow_opted
    ? ['Proposed', 'Accepted & Escrow', 'Business Pays', 'Work Done', 'Verified', 'Released', 'Complete']
    : ['Proposed', 'Accepted', 'Work Done', 'Verified', 'Complete'];

  const escrowIndex = {
    pending:        0,
    active:         escrow_opted ? 2 : 1,
    work_submitted: escrow_opted ? 3 : 2,
    work_verified:  escrow_opted ? 4 : 3,
    payment_done:   escrow_opted ? 5 : 4,
    completed:      escrow_opted ? 6 : 4,
    cancelled:      -1,
  };
  const current = escrowIndex[status] ?? 0;

  if (status === 'cancelled') return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            i < current  ? 'bg-indigo-600 text-white' :
            i === current ? 'bg-indigo-400 text-white ring-2 ring-indigo-300/40' :
                           'bg-slate-800 text-slate-500'
          }`}>{i < current ? '✓' : i + 1}</div>
          <span className={`whitespace-nowrap text-[10px] ${i <= current ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
          {i < steps.length - 1 && <div className={`h-px w-4 flex-shrink-0 ${i < current ? 'bg-indigo-600' : 'bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */

function PendingOrdersPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(null);
  const [paying, setPaying]       = useState(null);
  const [toast, setToast]         = useState(null);   // { type: 'success'|'error', msg }

  useEffect(() => {
    contractApi.list()
      .then(setContracts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  /* status update helper */
  const updateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      const res = await contractApi.updateStatus(id, newStatus);
      setContracts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      showToast('success', `Contract moved to "${newStatus.replace('_', ' ')}"`);
    } catch (err) {
      console.error(err);
      showToast('error', err?.error || 'Action failed. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  /* Razorpay checkout */
  const handlePayNow = async (contract) => {
    if (!window.Razorpay) { showToast('error', 'Payment gateway is loading. Please wait and try again.'); return; }
    if (!RAZORPAY_KEY_ID) { showToast('error', 'Add VITE_RAZORPAY_KEY_ID to frontend/.env'); return; }

    setPaying(contract.id);
    try {
      const order = await paymentApi.createOrder(contract.id);

      const isEscrowDeposit = contract.status === 'active';
      const description = isEscrowDeposit
        ? `Escrow deposit for: ${contract.deliverables?.slice(0, 60)}`
        : `Final payment release for: ${contract.deliverables?.slice(0, 60)}`;

      const options = {
        key:      RAZORPAY_KEY_ID,
        amount:   order.amount,
        currency: order.currency || 'INR',
        name:     'MicroFluence',
        description,
        order_id: order.id,
        prefill:  { name: user?.email?.split('@')[0], email: user?.email },
        theme:    { color: '#6366f1' },

        handler: async (response) => {
          try {
            const verifyRes = await paymentApi.verifyPayment(contract.id, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            // Update local state with new status from backend
            const newStatus = verifyRes.new_status || contract.status;
            setContracts(prev => prev.map(c =>
              c.id === contract.id
                ? { ...c, status: newStatus, payment_intent_id: response.razorpay_payment_id }
                : c
            ));
            if (isEscrowDeposit) {
              showToast('success', '✅ Escrow funded! The influencer can now start work.');
            } else {
              showToast('success', '✅ Payment verified! We will release funds to the influencer.');
            }
          } catch (verifyErr) {
            console.error('Verify failed', verifyErr);
            showToast('error', 'Payment captured but verification failed. Contact support with your payment ID.');
          } finally {
            setPaying(null);
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { showToast('error', 'Payment failed or cancelled.'); setPaying(null); });
      rzp.open();

    } catch (err) {
      console.error(err);
      showToast('error', err?.error || 'Could not initialise payment. Check Razorpay configuration.');
      setPaying(null);
    }
  };

  const isInfluencer = user?.role === 'influencer';

  /* ── Counts ──────────────────────────────────────────────────── */
  const pending   = contracts.filter(c => c.status === 'pending').length;
  const active    = contracts.filter(c => ['active', 'work_submitted', 'work_verified'].includes(c.status)).length;
  const done      = contracts.filter(c => ['completed', 'payment_done'].includes(c.status)).length;

  if (loading) return <div className="flex h-48 items-center justify-center text-slate-400">Loading contracts…</div>;

  return (
    <section className="space-y-6 animate-fade-up">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Contracts &amp; Deals</h2>
        <p className="mt-1 text-slate-400">
          {isInfluencer
            ? 'Manage your deal proposals, escrow, and work submissions.'
            : 'Propose deals, fund escrow, verify work, and release payments.'}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 text-sm ${
          toast.type === 'success'
            ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
            : 'border-red-700 bg-red-900/30 text-red-300'
        }`}>
          <span className="mt-0.5 text-base">{toast.type === 'success' ? '✅' : '❌'}</span>
          <p className="flex-1">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Proposals',  count: pending, color: 'text-amber-300'   },
          { label: 'Active / In Progress', count: active, color: 'text-blue-300'  },
          { label: 'Completed / Paid',   count: done,    color: 'text-emerald-300' },
        ].map(s => (
          <article key={s.label} className="glow-hover rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.count}</p>
          </article>
        ))}
      </div>

      {/* Razorpay key missing warning (business only) */}
      {!RAZORPAY_KEY_ID && !isInfluencer && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-300">
          <p className="font-semibold">⚠️ Razorpay not configured</p>
          <p className="mt-1 opacity-80">Add <code className="rounded bg-amber-900/50 px-1">VITE_RAZORPAY_KEY_ID=rzp_test_XXXX</code> to <code className="rounded bg-amber-900/50 px-1">frontend/.env</code> and restart.</p>
        </div>
      )}

      {/* Contract cards */}
      {contracts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-12 text-center text-slate-500">
          No contracts yet.
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map(c => {
            const otherParty = isInfluencer
              ? (c.business_name || 'Business')
              : (c.influencer_handle ? `@${c.influencer_handle}` : 'Influencer');
            const isPaying = paying === c.id;
            const isUpdating = updating === c.id;

            return (
              <article key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">

                {/* Card header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{otherParty}</p>
                    <p className="mt-0.5 text-xs text-slate-500">#{c.id?.slice(0, 8)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.escrow_opted && (
                      <span className="rounded-full bg-violet-900/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                        🔒 Escrow
                      </span>
                    )}
                    <StatusBadge status={c.status} />
                  </div>
                </div>

                {/* Escrow Progress bar */}
                <div className="mt-3">
                  <EscrowProgress status={c.status} escrow_opted={c.escrow_opted} />
                </div>

                {/* Details */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Amount</p>
                    <p className="font-bold text-white text-lg">₹{Number(c.agreed_price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Deliverables</p>
                    <p className="text-slate-300">{c.deliverables}</p>
                  </div>
                </div>

                {/* Payment ID if paid */}
                {c.payment_intent_id && (
                  <p className="mt-2 text-[11px] text-slate-500">Payment ID: {c.payment_intent_id}</p>
                )}

                {/* ── Action Buttons ─────────────────────────────── */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">

                  {/* ── INFLUENCER ACTIONS ── */}
                  {isInfluencer && (
                    <>
                      {/* Pending: Accept normally or Accept with Escrow */}
                      {c.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(c.id, 'active')} disabled={isUpdating}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                            ✓ Accept
                          </button>
                          <button
                            onClick={async () => {
                              setUpdating(c.id);
                              try {
                                const res = await contractApi.escrowAccept(c.id);
                                setContracts(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active', escrow_opted: true } : x));
                                showToast('success', '🔒 Accepted with Escrow! Business has 24 hours to fund.');
                              } catch (err) { showToast('error', err?.error || 'Failed'); }
                              finally { setUpdating(null); }
                            }}
                            disabled={isUpdating}
                            className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-violet-500 hover:to-purple-500 disabled:opacity-50">
                            🔒 Accept with Escrow
                          </button>
                          <button onClick={() => updateStatus(c.id, 'cancelled')} disabled={isUpdating}
                            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-600 disabled:opacity-50">
                            Decline
                          </button>
                        </>
                      )}

                      {/* Active (escrow funded): influencer submits work */}
                      {c.status === 'active' && (
                        <button onClick={() => updateStatus(c.id, 'work_submitted')} disabled={isUpdating}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                          📤 Submit Work as Done
                        </button>
                      )}

                      {/* Work submitted: waiting for business */}
                      {c.status === 'work_submitted' && (
                        <span className="text-sm text-slate-400 italic">⏳ Waiting for business to verify your work…</span>
                      )}

                      {/* Work verified: waiting for payment */}
                      {c.status === 'work_verified' && (
                        <span className="text-sm text-slate-400 italic">✅ Work verified! Business is releasing payment to platform…</span>
                      )}

                      {/* Payment done: confirm receipt */}
                      {c.status === 'payment_done' && (
                        <>
                          <p className="text-sm text-emerald-400 font-semibold">
                            💰 Platform has received payment. Payout will be transferred to your UPI/bank shortly.
                          </p>
                          <button onClick={() => updateStatus(c.id, 'completed')} disabled={isUpdating}
                            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                            ✓ Confirm & Close Contract
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* ── BUSINESS ACTIONS ── */}
                  {!isInfluencer && (
                    <>
                      {/* Pending: waiting for influencer */}
                      {c.status === 'pending' && (
                        <>
                          <span className="text-sm text-slate-400 italic">⏳ Waiting for influencer to accept…</span>
                          <button onClick={() => updateStatus(c.id, 'cancelled')} disabled={isUpdating}
                            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-600 disabled:opacity-50">
                            Withdraw
                          </button>
                        </>
                      )}

                      {/* Active with escrow: business MUST pay escrow now */}
                      {c.status === 'active' && c.escrow_opted && !c.payment_intent_id && (
                        <div className="flex w-full flex-col gap-2">
                          <div className="rounded-lg bg-violet-900/30 border border-violet-700/40 px-4 py-3 text-sm text-violet-300">
                            🔒 <strong>Escrow Required:</strong> The influencer chose escrow protection. You must fund the escrow before work begins. Your money is held safely by MicroFluence and released only after you verify the work.
                          </div>
                          <button
                            onClick={() => handlePayNow(c)}
                            disabled={isPaying}
                            className="flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 font-bold text-white shadow-lg hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50">
                            {isPaying ? <span className="animate-pulse">Processing…</span> : '💳 Fund Escrow Now'}
                          </button>
                        </div>
                      )}

                      {/* Active without escrow OR escrow already funded */}
                      {c.status === 'active' && (!c.escrow_opted || c.payment_intent_id) && (
                        <div className="flex flex-wrap gap-2">
                          {c.payment_intent_id && (
                            <span className="text-xs text-emerald-400 font-semibold">✅ Escrow funded — influencer is working</span>
                          )}
                          <button onClick={() => updateStatus(c.id, 'cancelled')} disabled={isUpdating}
                            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-600 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Work submitted: business verifies */}
                      {c.status === 'work_submitted' && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => updateStatus(c.id, 'work_verified')} disabled={isUpdating}
                            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">
                            ✓ Verify Work
                          </button>
                          <button onClick={() => updateStatus(c.id, 'cancelled')} disabled={isUpdating}
                            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-600 disabled:opacity-50">
                            Dispute / Cancel
                          </button>
                        </div>
                      )}

                      {/* Work verified: business releases final payment */}
                      {c.status === 'work_verified' && (
                        <div className="flex w-full flex-col gap-2">
                          <div className="rounded-lg bg-emerald-900/30 border border-emerald-700/40 px-4 py-3 text-sm text-emerald-300">
                            ✅ <strong>Work verified!</strong> Release the final payment to MicroFluence. We will transfer it to the influencer's bank/UPI account within 24 hours.
                          </div>
                          <button
                            onClick={() => handlePayNow(c)}
                            disabled={isPaying}
                            className="flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50">
                            {isPaying ? <span className="animate-pulse">Processing…</span> : '💳 Release Payment'}
                          </button>
                        </div>
                      )}

                      {/* Payment done */}
                      {c.status === 'payment_done' && (
                        <span className="text-sm text-emerald-400 font-semibold">
                          💰 Payment sent to platform. Influencer will receive funds shortly.
                        </span>
                      )}
                    </>
                  )}

                  {/* Completed / Cancelled — no actions */}
                  {c.status === 'completed' && (
                    <span className="text-sm font-semibold text-emerald-400">🎉 Contract completed!</span>
                  )}
                  {c.status === 'cancelled' && (
                    <span className="text-sm text-red-400 italic">Contract cancelled</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PendingOrdersPage;
