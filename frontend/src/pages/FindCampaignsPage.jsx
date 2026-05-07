import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignApi, campaignInterestApi } from '../api';
import { useAuth } from '../context/AuthContext';
import CampaignDetailModal from '../components/CampaignDetailModal';
import ProfileCompletionRing from '../components/ProfileCompletionRing';

function formatNumber(num) {
  if (!num) return '--';
  return Number(num).toLocaleString('en-IN');
}

function calcPct(profile) {
  if (!profile) return 0;
  const checks = [
    !!profile.instagram_handle, !!profile.category, !!profile.locality,
    !!profile.bio, profile.price_min != null && profile.price_max != null, !!profile.is_verified,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

const AD_LABELS = { post: 'Post', reel: 'Reel', story: 'Story', brand_ambassador: 'Brand Ambassador' };

export default function FindCampaignsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [interestMap, setInterestMap] = useState({}); // campaignId -> status | 'sent'
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [filters, setFilters] = useState({ required_ad_type: '', business_locality: '', min_budget: '', max_budget: '' });
  const [appliedFilters, setAppliedFilters] = useState({});

  const profile = user?.influencer_profile;
  const pct = calcPct(profile);
  const profileComplete = pct >= 100;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.required_ad_type) params.append('required_ad_type', appliedFilters.required_ad_type);
        if (appliedFilters.business_locality) params.append('business_locality', appliedFilters.business_locality);
        if (appliedFilters.min_budget) params.append('min_budget', appliedFilters.min_budget);
        if (appliedFilters.max_budget) params.append('max_budget', appliedFilters.max_budget);
        const data = await campaignApi.list(params.toString());
        setCampaigns(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [appliedFilters]);

  // Load existing interest statuses
  useEffect(() => {
    if (user?.role !== 'influencer') return;
    campaignInterestApi.mine()
      .then(data => {
        const map = {};
        data.forEach(i => { map[i.campaign_id] = i.status; });
        setInterestMap(map);
      })
      .catch(() => {});
  }, [user]);

  const handleInterest = useCallback(async (campaign) => {
    if (!profileComplete) return;
    setApplying(campaign.id);
    try {
      await campaignInterestApi.express(campaign.id);
      setInterestMap(prev => ({ ...prev, [campaign.id]: 'pending' }));
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign(prev => ({ ...prev, _interestSent: true }));
      }
    } catch (err) {
      alert(err?.error || 'Could not express interest. Please try again.');
    } finally {
      setApplying(null);
    }
  }, [profileComplete, selectedCampaign]);

  if (user?.role !== 'influencer') {
    return <div className="flex h-48 items-center justify-center text-slate-400">You do not have access to this page.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* Profile incomplete gate banner */}
      {!profileComplete && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-900/10 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-5">
            <ProfileCompletionRing percentage={pct} size={52} strokeWidth={5} />
            <div className="flex-1">
              <p className="font-bold text-amber-300 text-sm">Complete your profile to apply to campaigns</p>
              <p className="text-xs text-amber-400/70 mt-0.5">Your profile is {pct}% done. You need 100% to express interest.</p>
            </div>
            <button onClick={() => navigate('/dashboard/account')}
              className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-lg">
              Complete Profile →
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-display">Find Campaigns</h2>
          <p className="mt-1.5 text-slate-400 font-medium">Browse live collaboration opportunities and express interest.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
          <select name="required_ad_type" value={filters.required_ad_type}
            onChange={e => setFilters(p => ({ ...p, required_ad_type: e.target.value }))}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none">
            <option value="" className="bg-slate-900 text-slate-400">Any Ad Format</option>
            <option value="post" className="bg-slate-900">Instagram Post</option>
            <option value="reel" className="bg-slate-900">Instagram Reel</option>
            <option value="story" className="bg-slate-900">Instagram Story</option>
            <option value="brand_ambassador" className="bg-slate-900">Brand Ambassador</option>
          </select>
          <input type="text" placeholder="Business Locality" value={filters.business_locality}
            onChange={e => setFilters(p => ({ ...p, business_locality: e.target.value }))}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          <input type="number" placeholder="Min Budget (₹)" value={filters.min_budget}
            onChange={e => setFilters(p => ({ ...p, min_budget: e.target.value }))}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          <input type="number" placeholder="Max Budget (₹)" value={filters.max_budget}
            onChange={e => setFilters(p => ({ ...p, max_budget: e.target.value }))}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div className="mt-5 flex items-center justify-end gap-4 border-t border-slate-800/60 pt-5 relative z-10">
          <button onClick={() => { setFilters({ required_ad_type: '', business_locality: '', min_budget: '', max_budget: '' }); setAppliedFilters({}); }}
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Clear Filters
          </button>
          <button onClick={() => setAppliedFilters(filters)}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all">
            Search Campaigns
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16 animate-pulse font-medium">Loading opportunities...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <p className="text-lg font-semibold text-slate-300">No active campaigns found.</p>
          <p className="text-sm text-slate-500 mt-2">Check back later or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns.map((camp) => {
            const status = interestMap[camp.id];
            const hasInterest = !!status;
            const isApproved = status === 'approved';
            const isDeclined = status === 'declined';
            const isPending = status === 'pending';
            const isApplying = applying === camp.id;

            return (
              <div key={camp.id}
                className="glow-hover group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-6 shadow-xl transition-all hover:border-violet-500/50 relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedCampaign(camp)}>
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-600/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-violet-600/20 transition-all"></div>

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase">
                      {AD_LABELS[camp.required_ad_type] || camp.required_ad_type}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md">
                      {new Date(camp.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-white mb-2 font-display tracking-tight leading-tight">{camp.title}</h3>
                  <p className="text-sm text-slate-400 mb-5 line-clamp-2 leading-relaxed">{camp.description || 'No description provided.'}</p>

                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-950/60 p-4 mt-auto border border-slate-800/50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company</p>
                      <p className="mt-1 font-bold text-slate-200 truncate">{camp.business_info?.company_name}</p>
                      {camp.business_info?.locality && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">📍 {camp.business_info.locality}</p>
                      )}
                    </div>
                    <div className="pl-4 border-l border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Budget</p>
                      <p className="mt-1 font-extrabold text-emerald-400 text-lg">
                        ₹{formatNumber(camp.budget_min)} – ₹{formatNumber(camp.budget_max)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/40 relative z-10" onClick={e => e.stopPropagation()}>
                  {isApproved ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/10 border border-emerald-500/30 py-3">
                      <span className="text-emerald-400 text-sm font-bold">✅ Approved — Check Messages</span>
                    </div>
                  ) : isDeclined ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-red-900/10 border border-red-500/20 py-3">
                      <span className="text-red-400 text-sm font-semibold">❌ Interest Declined</span>
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-900/10 border border-indigo-500/20 py-3">
                      <span className="text-indigo-400 text-sm font-semibold">⏳ Interest Sent — Awaiting Approval</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => profileComplete ? handleInterest(camp) : navigate('/dashboard/account')}
                      disabled={isApplying}
                      className={`w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
                        !profileComplete
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : isApplying
                            ? 'bg-indigo-500/50 text-white cursor-wait'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                      }`}
                    >
                      {isApplying ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : !profileComplete ? '🔒 Complete Profile to Apply' : '🎯 I\'m Interested'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          interestStatus={interestMap[selectedCampaign.id] || null}
          onClose={() => setSelectedCampaign(null)}
          onInterest={handleInterest}
          applying={applying === selectedCampaign.id}
        />
      )}
    </div>
  );
}
