import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationApi, influencerApi } from '../api';
import { useAuth } from '../context/AuthContext';

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function FindInfluencersPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const [filters, setFilters] = useState({
        category: '',
        locality: '',
        min_followers: '',
        max_price: ''
    });

    // We use a separate state to trigger the API call only when "Apply Filters" is clicked
    const [appliedFilters, setAppliedFilters] = useState({});

    useEffect(() => {
        async function loadInfluencers() {
            setLoading(true);
            try {
                // Construct query parameters
                const params = new URLSearchParams();
                if (appliedFilters.category) params.append('category', appliedFilters.category);
                if (appliedFilters.locality) params.append('locality', appliedFilters.locality);
                if (appliedFilters.min_followers) params.append('min_followers', appliedFilters.min_followers);
                if (appliedFilters.max_price) params.append('max_price', appliedFilters.max_price);

                const data = await influencerApi.list(params.toString());
                setInfluencers(data);
            } catch (err) {
                console.error('Failed to load influencers', err);
            } finally {
                setLoading(false);
            }
        }
        loadInfluencers();
    }, [appliedFilters]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const applyFilters = () => {
        setAppliedFilters(filters);
    };

    const clearFilters = () => {
        setFilters({ category: '', locality: '', min_followers: '', max_price: '' });
        setAppliedFilters({});
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const handleMessage = async (influencerId) => {
        try {
            setStartingChat(true);
            await conversationApi.create({ influencer_id: influencerId });
            // Redirect to messages page so they can chat
            navigate('/dashboard/messages');
        } catch (err) {
            console.error('Failed to start chat', err);
            alert('Could not start conversation.');
        } finally {
            setStartingChat(false);
        }
    };

    if (user?.role !== 'business') {
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
                    <h2 className="text-2xl font-bold text-white">Find Influencers</h2>
                    <p className="mt-1 text-slate-400">Browse and connect with top creators for your next campaign.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                        type="text" name="category" placeholder="Category (e.g. fitness)"
                        value={filters.category} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <input
                        type="text" name="locality" placeholder="City or Locality"
                        value={filters.locality} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <input
                        type="number" name="min_followers" placeholder="Min Followers"
                        value={filters.min_followers} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <input
                        type="number" name="max_price" placeholder="Max Price (₹)"
                        value={filters.max_price} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                    <button onClick={clearFilters} className="text-sm font-semibold text-slate-400 hover:text-white">
                        Clear Filters
                    </button>
                    <button onClick={applyFilters} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        Search Creators
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-12">Loading creators...</div>
            ) : influencers.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                    No influencers found.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {influencers.map((inf) => (
                        <div key={inf.id} className="glow-hover flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition-all hover:border-slate-700">
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-fuchsia-500 to-amber-500 p-0.5">
                                            <div className="h-full w-full rounded-full border-2 border-slate-900 bg-slate-800" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-100 flex items-center gap-1">
                                                @{inf.instagram_handle}
                                                {inf.is_verified && <span title="Verified" className="text-blue-400 text-sm">✓</span>}
                                            </h3>
                                            <p className="text-sm font-medium text-indigo-400 capitalize">{inf.category}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-950/50 p-4">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Followers</p>
                                        <p className="mt-1 text-lg font-bold text-slate-200">{formatNumber(inf.followers_count) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Locality</p>
                                        <p className="mt-1 font-medium text-slate-200 truncate">{inf.locality || 'Anywhere'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pricing Estimates</p>
                                        <p className="mt-1 font-medium text-slate-200">
                                            {inf.price_min && inf.price_max ? `₹${inf.price_min} - ₹${inf.price_max}` : 'Flexible'}
                                        </p>
                                    </div>
                                </div>
                                
                                {expandedId === inf.id && (
                                    <div className="mt-4 border-t border-slate-800 pt-4 animate-fade-in space-y-4">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bio</p>
                                            <p className="mt-1 text-sm text-slate-300 line-clamp-3">{inf.bio || 'No bio provided.'}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-md bg-slate-800/50 p-2">
                                                <p className="text-xs text-slate-500">Avg Reach</p>
                                                <p className="font-semibold text-slate-200">{formatNumber(inf.average_reach) || '--'}</p>
                                            </div>
                                            <div className="rounded-md bg-slate-800/50 p-2">
                                                <p className="text-xs text-slate-500">Avg Likes</p>
                                                <p className="font-semibold text-slate-200">{formatNumber(inf.average_likes_post) || '--'}</p>
                                            </div>
                                            <div className="rounded-md bg-slate-800/50 p-2">
                                                <p className="text-xs text-slate-500">Reel Hits</p>
                                                <p className="font-semibold text-slate-200">{formatNumber(inf.average_likes_reel) || '--'}</p>
                                            </div>
                                        </div>
                                        {inf.audience_demographics && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Audience</p>
                                                <p className="mt-1 text-sm text-slate-300">{inf.audience_demographics}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-2">
                                <button
                                    onClick={() => setExpandedId(expandedId === inf.id ? null : inf.id)}
                                    className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                                >
                                    {expandedId === inf.id ? 'View Less' : 'View Full Profile'}
                                </button>
                                <button
                                    onClick={() => handleMessage(inf.id)}
                                    disabled={startingChat}
                                    className="w-full rounded-lg bg-indigo-600/10 py-2.5 font-semibold text-indigo-400 transition hover:bg-indigo-600 hover:text-white disabled:opacity-50"
                                >
                                    Send Message
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FindInfluencersPage;
