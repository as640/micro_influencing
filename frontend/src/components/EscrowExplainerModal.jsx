/**
 * EscrowExplainerModal.jsx
 * Educational popup explaining what escrow is and how it protects influencers.
 */

function EscrowExplainerModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-br from-emerald-900/40 to-slate-900 border-b border-emerald-500/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <h2 className="text-xl font-extrabold text-white">What is Escrow?</h2>
              </div>
              <p className="text-sm text-emerald-300/80 font-medium">Your safety net for every collaboration</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          
          {/* Step-by-step flow */}
          <div className="space-y-3">
            {[
              {
                step: '01',
                icon: '✅',
                title: 'You accept with Escrow',
                desc: 'When you accept a contract with escrow, the business has 24 hours to confirm and pay the agreed amount into our secure escrow account.',
                color: 'indigo',
              },
              {
                step: '02',
                icon: '🏦',
                title: 'Money is held safely',
                desc: 'The full payment is locked with MicroFluence — the business cannot take it back. You can now start working with 100% confidence.',
                color: 'emerald',
              },
              {
                step: '03',
                icon: '🎯',
                title: 'You complete the work',
                desc: 'Deliver your content and mark work as done. The business verifies, and once confirmed, the money is released directly to your account.',
                color: 'violet',
              },
              {
                step: '04',
                icon: '⚖️',
                title: 'Disputes go to admin',
                desc: 'If the business doesn\'t respond in 24 hours or there\'s a disagreement, our admin team reviews and resolves it — your payment is always protected.',
                color: 'amber',
              },
            ].map((item) => (
              <div key={item.step} className={`flex gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50`}>
                <div className="text-2xl shrink-0">{item.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Without Escrow note */}
          <div className="rounded-2xl bg-amber-900/20 border border-amber-700/30 px-4 py-3">
            <p className="text-xs font-semibold text-amber-300 mb-1">⚠️ Without Escrow</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              You trust the business to pay after completion. Works fine for established relationships, but carries risk with new clients. Payment is not guaranteed by MicroFluence.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
          >
            Got it — Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EscrowExplainerModal;
