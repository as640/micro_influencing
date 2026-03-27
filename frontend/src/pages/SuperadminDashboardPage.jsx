import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { superadminApi, disputeApi } from '../api';

function SuperadminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resolving, setResolving] = useState(null);

    useEffect(() => {
        if (user && user.is_superuser) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, disputesData] = await Promise.all([
                superadminApi.getDashboardStats(),
                disputeApi.listAll()
            ]);
            setStats(statsData);
            setDisputes(disputesData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch superadmin data:', err);
            setError('Failed to load dashboard statistics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        const note = window.prompt("Enter resolution note. This will mark the dispute as resolved.");
        if (!note) return;
        
        setResolving(id);
        try {
            await disputeApi.resolve(id, note);
            setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution_note: note } : d));
        } catch (err) {
            console.error(err);
            alert("Failed to resolve dispute.");
        } finally {
            setResolving(null);
        }
    };

    if (!user?.is_superuser) {
        return <Navigate to="/dashboard/home" replace />;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 animate-fade-in">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!stats) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const openDisputesCount = disputes.filter(d => d.status === 'open').length;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
                    <span>👑</span> Superadmin Dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Platform-wide statistics and metrics overview.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                    title="Total Businesses" 
                    value={stats.total_businesses} 
                    icon="🏢" 
                    colorClass="text-blue-400" 
                    bgClass="bg-blue-400/10" 
                />
                <MetricCard 
                    title="Total Influencers" 
                    value={stats.total_influencers} 
                    icon="🤳" 
                    colorClass="text-purple-400" 
                    bgClass="bg-purple-400/10" 
                />
                <MetricCard 
                    title="Active Campaigns" 
                    value={stats.active_campaigns} 
                    icon="📢" 
                    colorClass="text-yellow-400" 
                    bgClass="bg-yellow-400/10" 
                />
                <MetricCard 
                    title="Open Disputes" 
                    value={openDisputesCount} 
                    icon="⚖️" 
                    colorClass="text-red-400" 
                    bgClass="bg-red-400/10" 
                />
                
                <MetricCard 
                    title="Deals Closed (This Month)" 
                    value={stats.closed_deals_this_month} 
                    icon="🤝" 
                    colorClass="text-green-400" 
                    bgClass="bg-green-400/10" 
                />
                <MetricCard 
                    title="Active Contracts" 
                    value={stats.total_active_contracts} 
                    icon="⚡" 
                    colorClass="text-orange-400" 
                    bgClass="bg-orange-400/10" 
                />
                <MetricCard 
                    title="Pending Contracts" 
                    value={stats.total_pending_contracts} 
                    icon="⏳" 
                    colorClass="text-slate-400" 
                    bgClass="bg-slate-400/10" 
                />
                <MetricCard 
                    title="Total Value Generated" 
                    value={formatCurrency(stats.total_platform_value)} 
                    icon="💰" 
                    colorClass="text-emerald-400" 
                    bgClass="bg-emerald-400/10"
                />
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-4">Platform Disputes ({openDisputesCount} Open)</h3>
                <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
                    {disputes.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-500">No disputes recorded.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead className="bg-slate-950">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contract</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900">
                                    {disputes.map(d => (
                                        <tr key={d.id} className="transition hover:bg-slate-800/50">
                                            <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(d.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-300">
                                                ID: {d.contract.id.slice(0,8)}<br/>
                                                <span className="text-[10px] text-slate-500">
                                                    {d.contract.business_name} ↔ {d.contract.influencer_handle || 'Influencer'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-300 max-w-xs truncate" title={d.reason}>
                                                {d.reason}
                                            </td>
                                            <td className="px-5 py-4">
                                                {d.status === 'open' ? (
                                                    <span className="rounded-full bg-red-900/40 text-red-400 px-2 py-1 text-xs font-bold">OPEN</span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-800 text-emerald-400 px-2 py-1 text-xs font-bold" title={d.resolution_note}>RESOLVED</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                {d.status === 'open' && (
                                                    <button onClick={() => handleResolve(d.id)} disabled={resolving === d.id}
                                                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                                                        Resolve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Additional info section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mt-8 hidden">
                <h3 className="text-lg font-medium text-white mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Environment</span>
                        <span className="text-slate-200 font-medium font-mono">Production</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Last Updated</span>
                        <span className="text-slate-200 font-medium">{new Date().toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Reusable stat card
function MetricCard({ title, value, icon, colorClass, bgClass, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-800/80 ${className}`}>
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${bgClass} ${colorClass} text-xl`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-400">{title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

export default SuperadminDashboardPage;
