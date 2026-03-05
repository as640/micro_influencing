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

    useEffect(() => {
        async function loadInfluencers() {
            try {
                const data = await influencerApi.list();
                setInfluencers(data);
            } catch (err) {
                console.error('Failed to load influencers', err);
            } finally {
                setLoading(false);
            }
        }
        loadInfluencers();
    }, []);

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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Find Influencers</h2>
                    <p className="mt-1 text-slate-400">Browse and connect with top creators for your next campaign.</p>
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
                            </div>

                            <button
                                onClick={() => handleMessage(inf.id)}
                                disabled={startingChat}
                                className="mt-6 w-full rounded-lg bg-indigo-600/10 py-2.5 font-semibold text-indigo-400 transition hover:bg-indigo-600 hover:text-white disabled:opacity-50"
                            >
                                Send Message
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FindInfluencersPage;
