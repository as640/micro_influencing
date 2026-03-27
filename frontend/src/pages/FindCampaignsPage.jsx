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
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Find Campaigns</h2>
                    <p className="mt-1 text-slate-400">Browse live collaboration opportunities posted by businesses.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                        name="required_ad_type"
                        value={filters.required_ad_type} onChange={handleFilterChange}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    >
                        <option value="">Any Ad Format</option>
                        <option value="post">Instagram Post</option>
                        <option value="reel">Instagram Reel</option>
                        <option value="story">Instagram Story</option>
                        <option value="brand_ambassador">Brand Ambassador</option>
                    </select>
                    <input
                        type="text" name="business_locality" placeholder="Business Locality"
                        value={filters.business_locality} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <input
                        type="number" name="min_budget" placeholder="Min Budget (₹)"
                        value={filters.min_budget} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <input
                        type="number" name="max_budget" placeholder="Max Budget (₹)"
                        value={filters.max_budget} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                    <button onClick={clearFilters} className="text-sm font-semibold text-slate-400 hover:text-white">
                        Clear Filters
                    </button>
                    <button onClick={applyFilters} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        Search Campaigns
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-12">Loading opportunities...</div>
            ) : campaigns.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                    No active campaigns found. Check back later!
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {campaigns.map((camp) => (
                        <div key={camp.id} className="glow-hover flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition-all hover:border-slate-700">
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 tracking-wider uppercase">
                                        {camp.required_ad_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Posted {new Date(camp.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">{camp.title}</h3>

                                <p className="text-sm text-slate-400 mb-6 line-clamp-3">
                                    {camp.description || "No description provided."}
                                </p>

                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-950/50 p-4 border border-slate-800/80 mb-6">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Company</p>
                                        <p className="mt-1 font-semibold text-slate-200 truncate">{camp.business_info?.company_name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{camp.business_info?.industry}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Budget Range</p>
                                        <p className="mt-1 font-bold text-emerald-400">
                                            ₹{formatNumber(camp.budget_min)} - ₹{formatNumber(camp.budget_max)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const infCategory = (user?.influencer_profile?.category || '').trim().toLowerCase();
                                const bizIndustry = (camp.business_info?.industry || '').trim().toLowerCase();
                                // Superadmins bypass this check to test freely
                                const isDomainMatch = user?.is_superuser || infCategory === bizIndustry;

                                return (
                                    <button
                                        onClick={() => handleApply(camp.business_info?.id, camp.id)}
                                        disabled={!isDomainMatch || applyingTo === camp.id}
                                        className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={!isDomainMatch ? `You are in ${user?.influencer_profile?.category}, but this campaign needs ${camp.business_info?.industry}` : ''}
                                    >
                                        {!isDomainMatch 
                                            ? `Domain Mismatch (${camp.business_info?.industry})` 
                                            : applyingTo === camp.id 
                                                ? 'Connecting...' 
                                                : "I'm Interested"
                                        }
                                    </button>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FindCampaignsPage;
