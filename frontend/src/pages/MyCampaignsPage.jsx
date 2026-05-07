import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignApi, campaignInterestApi } from '../api';
import { useAuth } from '../context/AuthContext';

function formatNumber(num) {
    if (!num) return '--';
    return Number(num).toLocaleString('en-IN');
}

function MyCampaignsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // State for interests expansion
    const [expandedCampaignId, setExpandedCampaignId] = useState(null);
    const [interestsData, setInterestsData] = useState({}); // { [campaignId]: { loading: bool, data: [] } }
    
    // Filter
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'closed'

    const [form, setForm] = useState({
        business_id: user?.business_profiles?.[0]?.id || '',
        title: '',
        required_ad_type: 'instagram_reel',
        budget_min: '',
        budget_max: '',
        description: ''
    });

    const [allBusinesses, setAllBusinesses] = useState([]);

    const loadCampaigns = async () => {
        try {
            const data = await campaignApi.list();
            let myAds;
            if (user?.is_superuser) {
                // Superadmin sees all campaigns
                myAds = data;
            } else {
                // Match against the user's array of business profile IDs
                const myBizIds = new Set((user?.business_profiles || []).map(b => b.id));
                myAds = data.filter(c => myBizIds.has(c.business_info?.id));
            }
            setCampaigns(myAds);
        } catch (err) {
            console.error('Failed to load campaigns', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // For superadmin, fetch all businesses in the system to pick from
        if (user?.is_superuser) {
            import('../api').then(({ businessApi }) => {
                // Only load if needed — fallback to user's own profiles
            });
            // Fetch all business profiles via a simple list approach
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/businesses/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            }).then(r => r.json()).then(data => {
                if (Array.isArray(data)) setAllBusinesses(data);
            }).catch(() => {});
        }
        loadCampaigns();
    }, [user]);

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await campaignApi.create(form);
            setShowForm(false);
            setForm({ business_id: user?.business_profiles?.[0]?.id || '', title: '', required_ad_type: 'instagram_reel', budget_min: '', budget_max: '', description: '' });
            await loadCampaigns(); // refresh list
        } catch (err) {
            console.error('Failed to post campaign', err);
            alert('Failed to post ad. Please check your inputs.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (campId, currentStatus) => {
        try {
            await campaignApi.update(campId, { is_active: !currentStatus });
            setCampaigns(campaigns.map(c => c.id === campId ? { ...c, is_active: !currentStatus } : c));
        } catch (err) {
            console.error('Failed to update campaign status', err);
            alert('Could not update status.');
        }
    };

    const handleDelete = async (campId) => {
        if (!window.confirm('Are you sure you want to permanently delete this campaign?\nContracts will remain but lose the linked campaign name.')) return;
        try {
            await campaignApi.delete(campId);
            setCampaigns(campaigns.filter(c => c.id !== campId));
        } catch (err) {
            console.error('Failed to delete campaign', err);
            alert('Could not delete campaign.');
        }
    };

    const handleToggleInterests = async (campId) => {
        if (expandedCampaignId === campId) {
            setExpandedCampaignId(null);
            return;
        }
        setExpandedCampaignId(campId);
        
        // Fetch if not loaded
        if (!interestsData[campId]) {
            setInterestsData(prev => ({ ...prev, [campId]: { loading: true, data: [] } }));
            try {
                const data = await campaignInterestApi.listForCampaign(campId);
                setInterestsData(prev => ({ ...prev, [campId]: { loading: false, data } }));
            } catch (err) {
                console.error(err);
                setInterestsData(prev => ({ ...prev, [campId]: { loading: false, data: [] } }));
            }
        }
    };

    const handleRespondInterest = async (campId, interestId, status) => {
        try {
            await campaignInterestApi.respond(campId, interestId, status);
            // Update local state
            setInterestsData(prev => {
                const campData = prev[campId];
                if (!campData) return prev;
                return {
                    ...prev,
                    [campId]: {
                        ...campData,
                        data: campData.data.map(i => i.id === interestId ? { ...i, status } : i)
                    }
                };
            });
            if (status === 'approved') {
                alert('Interest approved! A new conversation has been started in your Messages tab.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update interest status.');
        }
    };

    if (user?.role !== 'business' && !user?.is_superuser) {
        return (
            <div className="flex h-48 items-center justify-center text-slate-400">
                You do not have access to this page.
            </div>
        );
    }

    const filteredCampaigns = campaigns.filter(c => {
        if (filter === 'active') return c.is_active;
        if (filter === 'closed') return !c.is_active;
        return true;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">My Campaigns</h2>
                    <p className="mt-1 text-slate-400">Post and manage your collaboration opportunities.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Segmented Filter */}
                    <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
                        {['all', 'active', 'closed'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                                    filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                    >
                        {showForm ? 'Cancel' : 'Post New Ad'}
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glow-hover rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6 shadow-lg shadow-indigo-500/10">
                    <h3 className="mb-4 text-lg font-bold text-white">Post a New Opportunity</h3>
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* Business selector for superadmin or multi-business users */}
                        {(user?.is_superuser || user?.business_profiles?.length > 1) && (
                            <label className="block md:col-span-2">
                                <span className="mb-2 block text-sm font-medium text-slate-300">Select Business</span>
                                <select name="business_id" value={form.business_id} onChange={handleChange} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500">
                                    <option value="">-- Select a Business --</option>
                                    {(user?.is_superuser ? allBusinesses : user?.business_profiles || []).map(b => (
                                        <option key={b.id} value={b.id}>{b.company_name} {b.gstin ? '(Verified)' : ''}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-300">Campaign Title</span>
                            <input type="text" name="title" value={form.title} onChange={handleChange} required
                                placeholder="e.g. Summer Fitness Promo"
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2" />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-300">Ad Format</span>
                            <select name="required_ad_type" value={form.required_ad_type} onChange={handleChange}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500">
                                <option value="">Select ad type</option>
                                <option value="post">Instagram Post</option>
                                <option value="reel">Instagram Reel</option>
                                <option value="story">Instagram Story</option>
                                <option value="brand_ambassador">Brand Ambassador</option>
                                <option value="other">Other</option>
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-300">Min Budget (₹)</span>
                                <input type="number" name="budget_min" value={form.budget_min} onChange={handleChange} required min="0"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2" />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-300">Max Budget (₹)</span>
                                <input type="number" name="budget_max" value={form.budget_max} onChange={handleChange} required min="0"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2" />
                            </label>
                        </div>

                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-300">Description / Requirements</span>
                            <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
                                placeholder="Describe what you are looking for..."
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2" />
                        </label>

                        <div className="md:col-span-2 text-right">
                            <button type="submit" disabled={submitting}
                                className="rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                                {submitting ? 'Posting...' : 'Publish Campaign'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center text-slate-400 py-12">Loading your campaigns...</div>
            ) : filteredCampaigns.length === 0 && !showForm ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                    <p className="text-lg font-medium text-slate-300">No campaigns found.</p>
                    {filter === 'all' && (
                        <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                            Post your first ad →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredCampaigns.map((camp) => (
                        <div key={camp.id} className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-white">{camp.title}</h3>
                                        {camp.is_active ?
                                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 uppercase">Active</span> :
                                            <span className="rounded bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-400 uppercase">Closed</span>
                                        }
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 mb-2">{camp.required_ad_type.replace('_', ' ').toUpperCase()}</p>
                                    <p className="text-sm text-slate-300 max-w-3xl line-clamp-2">{camp.description}</p>
                                </div>
                                <div className="whitespace-nowrap md:text-right shrink-0">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Budget</p>
                                    <p className="text-lg font-bold text-emerald-400">₹{formatNumber(camp.budget_min)} - ₹{formatNumber(camp.budget_max)}</p>
                                    <p className="text-xs text-slate-500 mt-2">Posted on {new Date(camp.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-2">
                                <button
                                    onClick={() => handleToggleInterests(camp.id)}
                                    className="flex items-center gap-2 rounded-lg bg-indigo-600/10 px-4 py-1.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-600/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${expandedCampaignId === camp.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    View Interests
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleToggleStatus(camp.id, camp.is_active)}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                                            camp.is_active 
                                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                        }`}
                                    >
                                        {camp.is_active ? 'Deactivate' : 'Reactivate'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(camp.id)}
                                        className="rounded-lg bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Interests Section */}
                            {expandedCampaignId === camp.id && (
                                <div className="mt-2 rounded-xl bg-slate-950/50 p-5 border border-slate-800/50">
                                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                        🎯 Influencers Interested
                                    </h4>
                                    
                                    {interestsData[camp.id]?.loading ? (
                                        <div className="text-sm text-slate-500 animate-pulse py-2">Loading interests...</div>
                                    ) : !interestsData[camp.id]?.data?.length ? (
                                        <div className="text-sm text-slate-500 py-2">No influencers have expressed interest yet.</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {interestsData[camp.id].data.map(interest => (
                                                <div key={interest.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-xl bg-slate-900 border border-slate-700/50 p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 shrink-0">
                                                            {interest.influencer_picture ? (
                                                                <img src={interest.influencer_picture} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-xl">👤</div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-200">@{interest.influencer_handle}</p>
                                                                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{interest.category}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                {formatNumber(interest.followers_count)} followers • {interest.locality} • ₹{interest.price_min} - ₹{interest.price_max}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                        {interest.status === 'pending' ? (
                                                            <>
                                                                <button onClick={() => handleRespondInterest(camp.id, interest.id, 'approved')}
                                                                    className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">
                                                                    Approve & Message
                                                                </button>
                                                                <button onClick={() => handleRespondInterest(camp.id, interest.id, 'declined')}
                                                                    className="flex-1 sm:flex-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white">
                                                                    Decline
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="w-full sm:w-auto text-center px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/50">
                                                                <span className={`text-xs font-bold uppercase ${interest.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {interest.status}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyCampaignsPage;
