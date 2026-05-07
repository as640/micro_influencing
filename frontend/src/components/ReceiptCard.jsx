/**
 * ReceiptCard.jsx
 * Styled payment receipt card for the Earnings page.
 * Auto-generates a human-readable receipt number.
 */
import { useAuth } from './../context/AuthContext';

function ReceiptCard({ contract }) {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const year = new Date(contract.updated_at || contract.created_at).getFullYear();
  const receiptNumber = `MF-${year}-${contract.id?.slice(0, 8).toUpperCase()}`;
  const amount = Number(contract.agreed_price).toLocaleString('en-IN');
  const date = new Date(contract.updated_at || contract.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/60 backdrop-blur-sm shadow-xl hover:border-emerald-500/40 transition-all">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
      
      {/* Top accent strip */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

      <div className="px-6 py-5">
        {/* Receipt header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-extrabold text-emerald-400/70 tracking-widest uppercase mb-0.5">Receipt</p>
            <p className="font-mono text-xs text-slate-400 font-bold">{receiptNumber}</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
            </div>
            {contract.escrow_opted && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 ml-1">
                <span className="text-[9px] font-bold text-violet-400">🛡️ Escrow</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <p className="text-3xl font-extrabold text-white">₹{amount}</p>
          <p className="text-xs text-slate-500 mt-0.5">{date}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-700/60 my-4" />

        {/* Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isBusiness ? 'Paid To' : 'From'}</p>
            <p className="text-xs font-bold text-slate-200 text-right max-w-[60%] truncate">
              {isBusiness ? (contract.influencer_name || `@${contract.influencer_instagram_handle || 'Influencer'}`) : (contract.business_name || 'Business')}
            </p>
          </div>
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Done</p>
            <p className="text-xs font-medium text-slate-400 text-right max-w-[60%] line-clamp-2">{contract.deliverables}</p>
          </div>
          {contract.payment_intent_id && (
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Ref</p>
              <p className="text-[10px] font-mono text-slate-500 text-right max-w-[60%] truncate">{contract.payment_intent_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReceiptCard;
