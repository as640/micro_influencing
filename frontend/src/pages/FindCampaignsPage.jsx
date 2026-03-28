import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignApi, conversationApi } from '../api';
import { useAuth } from '../context/AuthContext';

function formatNumber(num) {
    if (!num) return '--';
    return Number(num).toLocaleString('en-IN');
}

function FindCampaignsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applyingTo, setApplyingTo] = useState(null);

    const [filters, setFilters] = useState({
        required_ad_type: '',
        business_locality: '',
        min_budget: '',
        max_budget: ''
    });

    const [appliedFilters, setAppliedFilters] = useState({});

    useEffect(() => {
        async function loadCampaigns() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (appliedFilters.required_ad_type) params.append('required_ad_type', appliedFilters.required_ad_type);
                if (appliedFilters.business_locality) params.append('business_locality', appliedFilters.business_locality);
                if (appliedFilters.min_budget) params.append('min_budget', appliedFilters.min_budget);
                if (appliedFilters.max_budget) params.append('max_budget', appliedFilters.max_budget);

                const data = await campaignApi.list(params.toString());
                setCampaigns(data);
            } catch (err) {
                console.error('Failed to load campaigns', err);
            } finally {
                setLoading(false);
            }
        }
        loadCampaigns();
    }, [appliedFilters]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const applyFilters = () => {
        setAppliedFilters(filters);
    };

    const clearFilters = () => {
        setFilters({ required_ad_type: '', business_locality: '', min_budget: '', max_budget: '' });
        setAppliedFilters({});
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const handleApply = async (businessId, campaignId) => {
        try {
            setApplyingTo(campaignId);
            // Start a conversation with the business
            await conversationApi.create({ business_id: businessId });
            // Redirect to messages so influencer can pitch themselves
            navigate('/dashboard/messages');
        } catch (err) {
            console.error('Failed to apply', err);
            alert('Could not start conversation with this business.');
        } finally {
            setApplyingTo(null);
        }
    };

    if (user?.role !== 'influencer') {
        return (
            <div className="flex h-48 items-center justify-center text-slate-400">
                You do not have access to this page.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-white font-display">Find Campaigns</h2>
                    <p className="mt-1.5 text-slate-400 font-medium">Browse live collaboration opportunities posted by businesses.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                    <select
                        name="required_ad_type"
                        value={filters.required_ad_type} onChange={handleFilterChange}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none"
                    >
                        <option value="" className="bg-slate-900 text-slate-400">Any Ad Format</option>
                        <option value="post" className="bg-slate-900">Instagram Post</option>
                        <option value="reel" className="bg-slate-900">Instagram Reel</option>
                        <option value="story" className="bg-slate-900">Instagram Story</option>
                        <option value="brand_ambassador" className="bg-slate-900">Brand Ambassador</option>
                    </select>
                    <input
                        type="text" name="business_locality" placeholder="Business Locality"
                        value={filters.business_locality} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="number" name="min_budget" placeholder="Min Budget (₹)"
                        value={filters.min_budget} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="number" name="max_budget" placeholder="Max Budget (₹)"
                        value={filters.max_budget} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="mt-5 flex items-center justify-end gap-4 border-t border-slate-800/60 pt-5 relative z-10">
                    <button onClick={clearFilters} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        Clear Filters
                    </button>
                    <button onClick={applyFilters} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all glow-hover">
                        Search Campaigns
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-16 animate-pulse-slow font-medium">Loading opportunities...</div>
            ) : campaigns.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                    <p className="text-lg font-semibold text-slate-300">No active campaigns found.</p>
                    <p className="text-sm text-slate-500 mt-2">Check back later or adjust your filters.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {campaigns.map((camp) => (
                        <div key={camp.id} className="glow-hover group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-6 lg:p-8 shadow-xl transition-all hover:border-violet-500/50 relative overflow-hidden">
                            
                            {/* Card Glow FX */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-600/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-violet-600/20 transition-all"></div>

                            <div className="relative z-10 flex flex-col flex-1">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase shadow-inner">
                                        {camp.required_ad_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        Posted {new Date(camp.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-extrabold text-white mb-3 font-display tracking-tight leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-indigo-200 transition-colors">{camp.title}</h3>

                                <p className="text-sm text-slate-400 mb-8 line-clamp-3 leading-relaxed flex-1">
                                    {camp.description || "No description provided."}
                                </p>

                                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-950/60 p-5 mt-auto border border-slate-800/50">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                                            Company
                                        </p>
                                        <p className="mt-1.5 font-bold text-slate-200 truncate">{camp.business_info?.company_name}</p>
                                        <p className="text-xs text-indigo-400/80 font-semibold capitalize mt-0.5">{camp.business_info?.industry}</p>
                                    </div>
                                    <div className="pl-4 border-l border-slate-800/60">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80"></span>
                                            Budget Range
                                        </p>
                                        <p className="mt-1.5 font-extrabold text-emerald-400 text-lg tracking-tight">
                                            ₹{formatNumber(camp.budget_min)} - ₹{formatNumber(camp.budget_max)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-800/40 relative z-10">
                                {(() => {
                                    const infCategory = (user?.influencer_profile?.category || '').trim().toLowerCase();
                                    const bizIndustry = (camp.business_info?.industry || '').trim().toLowerCase();
                                    // Superadmins bypass this check to test freely
                                    const isDomainMatch = user?.is_superuser || infCategory === bizIndustry;

                                    return (
                                        <button
                                            onClick={() => handleApply(camp.business_info?.id, camp.id)}
                                            disabled={applyingTo === camp.id}
                                            className={`w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg glow-hover ${
                                                applyingTo === camp.id
                                                    ? 'bg-indigo-500/50 text-white cursor-wait'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                                            }`}
                                        >
                                            {applyingTo === camp.id 
                                                    ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Connecting...
                                                        </span>
                                                    )
                                                    : "I'm Interested - Message Business"
                                            }
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FindCampaignsPage;
