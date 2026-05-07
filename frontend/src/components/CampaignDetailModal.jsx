/**
 * CampaignDetailModal.jsx
 * Full-detail slide-in drawer for a campaign card.
 * Shows all campaign info + the "I'm Interested" CTA.
 */

function CampaignDetailModal({ campaign, interestStatus, onClose, onInterest, applying }) {
  if (!campaign) return null;

  const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
  const adTypeLabel = {
    post: 'Instagram Post',
    reel: 'Instagram Reel',
    story: 'Instagram Story',
    brand_ambassador: 'Brand Ambassador',
  }[campaign.required_ad_type] || campaign.required_ad_type;

  const hasExpressedInterest = interestStatus && interestStatus !== null;
  const isApproved = interestStatus === 'approved';
  const isDeclined = interestStatus === 'declined';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-xl animate-fade-up rounded-t-3xl sm:rounded-3xl border border-slate-700/50 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-indigo-900/30 to-slate-900 border-b border-slate-700/50 shrink-0">
          <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase">
                {adTypeLabel}
              </span>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">{campaign.title}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          
          {/* Business info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
              {campaign.business_info?.profile_picture ? (
                <img src={campaign.business_info.profile_picture} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl">🏢</span>
              )}
            </div>
            <div>
              <p className="font-bold text-white">{campaign.business_info?.company_name || 'Business'}</p>
              <p className="text-xs text-indigo-400 font-semibold capitalize mt-0.5">{campaign.business_info?.industry}</p>
              {campaign.business_info?.locality && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {campaign.business_info.locality}
                </p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Budget Range</p>
              <p className="text-lg font-extrabold text-emerald-400">
                {fmt(campaign.budget_min)} – {fmt(campaign.budget_max)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Work Type</p>
              <p className="text-sm font-bold text-white">{adTypeLabel}</p>
            </div>
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Location</p>
              <p className="text-sm font-bold text-white">{campaign.business_info?.locality || 'Remote'}</p>
            </div>
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Posted</p>
              <p className="text-sm font-bold text-white">{new Date(campaign.created_at).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Work Description</p>
              <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
                <p className="text-sm text-slate-300 leading-relaxed">{campaign.description}</p>
              </div>
            </div>
          )}

          {/* Interest status */}
          {isApproved && (
            <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/30 p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-bold text-emerald-400">Business approved your interest!</p>
                <p className="text-xs text-slate-400 mt-0.5">Check your Messages tab to continue the conversation.</p>
              </div>
            </div>
          )}
          {isDeclined && (
            <div className="rounded-2xl bg-red-900/20 border border-red-500/30 p-4 flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-sm font-bold text-red-400">Business declined your interest</p>
                <p className="text-xs text-slate-400 mt-0.5">Keep exploring other campaigns!</p>
              </div>
            </div>
          )}
          {hasExpressedInterest && !isApproved && !isDeclined && (
            <div className="rounded-2xl bg-indigo-900/20 border border-indigo-500/30 p-4 flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="text-sm font-bold text-indigo-400">Interest Sent — Awaiting Approval</p>
                <p className="text-xs text-slate-400 mt-0.5">The business will review and respond. You'll see it in Messages when approved.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
          {!hasExpressedInterest ? (
            <button
              onClick={() => onInterest(campaign)}
              disabled={applying}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {applying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending interest...
                </span>
              ) : (
                '🎯 I\'m Interested — Express Interest'
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignDetailModal;
