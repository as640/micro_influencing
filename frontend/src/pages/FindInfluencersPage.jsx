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
        <div className="space-y-6 animate-fade-in font-sans">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-white font-display">Find Influencers</h2>
                    <p className="mt-1.5 text-slate-400 font-medium">Browse and connect with top creators for your next campaign.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                    <input
                        type="text" name="category" placeholder="Category (e.g. fitness)"
                        value={filters.category} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="text" name="locality" placeholder="City or Locality"
                        value={filters.locality} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="number" name="min_followers" placeholder="Min Followers"
                        value={filters.min_followers} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="number" name="max_price" placeholder="Max Price (₹)"
                        value={filters.max_price} onChange={handleFilterChange} onKeyDown={handleKeyDown}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="mt-5 flex items-center justify-end gap-4 border-t border-slate-800/60 pt-5 relative z-10">
                    <button onClick={clearFilters} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        Clear Filters
                    </button>
                    <button onClick={applyFilters} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all glow-hover">
                        Search Creators
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-16 animate-pulse-slow font-medium">Loading creators...</div>
            ) : influencers.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                    <p className="text-lg font-semibold text-slate-300">No influencers found.</p>
                    <p className="text-sm text-slate-500 mt-2">Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {influencers.map((inf) => (
                        <div key={inf.id} className="glow-hover group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-6 shadow-xl transition-all hover:border-indigo-500/50 relative overflow-hidden">
                            
                            {/* Card Glow FX */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-fuchsia-500 to-amber-500 p-[2.5px] shadow-lg">
                                            <div className="h-full w-full rounded-full border-[3px] border-slate-900 bg-slate-800 overflow-hidden flex items-center justify-center">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inf.instagram_handle}`} alt="Avatar" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-100 flex items-center gap-1.5 text-lg font-display">
                                                @{inf.instagram_handle}
                                                {inf.is_verified && <span title="Verified" className="text-blue-400 text-sm drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">✓</span>}
                                            </h3>
                                            <p className="text-xs font-bold tracking-wider text-indigo-400 uppercase mt-0.5">{inf.category}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-800/50 bg-slate-950/60 p-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Followers</p>
                                        <p className="mt-1 text-lg font-extrabold text-slate-200">{formatNumber(inf.followers_count) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locality</p>
                                        <p className="mt-1 font-semibold text-slate-200 truncate">{inf.locality || 'Anywhere'}</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-slate-800/50 mt-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pricing Estimate</p>
                                        <p className="mt-1 font-semibold text-emerald-400">
                                            {inf.price_min && inf.price_max ? `₹${inf.price_min} - ₹${inf.price_max}` : 'Flexible / Negotiable'}
                                        </p>
                                    </div>
                                </div>
                                
                                {expandedId === inf.id && (
                                    <div className="mt-5 pt-5 animate-fade-in space-y-5 relative">
                                        {/* Divider line instead of border-t for a cleaner look */}
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                                        
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bio</p>
                                            <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">{inf.bio || 'No bio provided.'}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-2.5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Reach</p>
                                                <p className="font-extrabold text-slate-200 mt-0.5">{formatNumber(inf.average_reach) || '--'}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-2.5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Likes</p>
                                                <p className="font-extrabold text-slate-200 mt-0.5">{formatNumber(inf.average_likes_post) || '--'}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-2.5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Reel Hits</p>
                                                <p className="font-extrabold text-slate-200 mt-0.5">{formatNumber(inf.average_likes_reel) || '--'}</p>
                                            </div>
                                        </div>
                                        {inf.audience_demographics && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Audience</p>
                                                <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 italic">{inf.audience_demographics}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex gap-3 relative z-10">
                                <button
                                    onClick={() => setExpandedId(expandedId === inf.id ? null : inf.id)}
                                    className="flex-1 rounded-xl bg-slate-800/80 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-700 border border-slate-700"
                                >
                                    {expandedId === inf.id ? 'View Less' : 'Full Profile'}
                                </button>
                                <button
                                    onClick={() => handleMessage(inf.id)}
                                    disabled={startingChat}
                                    className="flex-[1.5] rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20 glow-hover"
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
