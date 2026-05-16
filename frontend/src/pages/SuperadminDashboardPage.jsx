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
    const [verifying, setVerifying] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview | contracts | verification | disputes

    useEffect(() => {
        if (user && user.is_superuser) {
            fetchData();
            const interval = setInterval(fetchData, 15000); // poll every 15s
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
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

    const handleVerifyBusiness = async (id) => {
        if (!window.confirm('Are you sure you want to verify this business?')) return;
        setVerifying(id);
        try {
            await superadminApi.verifyBusiness(id);
            // Remove from pending list
            setStats(prev => ({
                ...prev,
                pending_verifications: prev.pending_verifications.filter(b => b.id !== id),
            }));
        } catch (err) {
            console.error(err);
            alert('Failed to verify business.');
        } finally {
            setVerifying(null);
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
    const pendingVerifications = stats.pending_verifications || [];
    const activeContracts = stats.active_contracts || [];

    const tabs = [
        { key: 'overview', label: '📊 Overview' },
        { key: 'contracts', label: `⚡ Active Contracts (${activeContracts.length})` },
        { key: 'verification', label: `🔍 Verification (${pendingVerifications.length})` },
        { key: 'disputes', label: `⚖️ Disputes (${openDisputesCount})` },
    ];

    const statusColors = {
        active: 'text-blue-400 bg-blue-500/10',
        work_submitted: 'text-violet-400 bg-violet-500/10',
        work_verified: 'text-cyan-400 bg-cyan-500/10',
        payment_done: 'text-emerald-400 bg-emerald-500/10',
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 font-sans relative">
            {/* Background Glows */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 font-display">
                    <span className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20 text-xl sm:text-2xl">👑</span> 
                    Superadmin Dashboard
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-400">
                    Platform-wide statistics, contracts, and business verifications.
                </p>
            </div>

            {/* Tab Bar */}
            <div className="relative z-10 flex flex-wrap gap-1 rounded-xl bg-slate-900/80 border border-slate-800 p-1">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex-1 min-w-[120px] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === t.key
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 relative z-10">
                    <MetricCard title="Total Businesses" value={stats.total_businesses} icon="🏢" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                    <MetricCard title="Total Influencers" value={stats.total_influencers} icon="🤳" colorClass="text-violet-400" bgClass="bg-violet-500/10" />
                    <MetricCard title="Active Campaigns" value={stats.active_campaigns} icon="📢" colorClass="text-amber-400" bgClass="bg-amber-500/10" />
                    <MetricCard title="Open Disputes" value={openDisputesCount} icon="⚖️" colorClass="text-red-400" bgClass="bg-red-500/10" />
                    <MetricCard title="Deals Closed (Month)" value={stats.closed_deals_this_month} icon="🤝" colorClass="text-emerald-400" bgClass="bg-emerald-500/10" />
                    <MetricCard title="Active Contracts" value={stats.total_active_contracts} icon="⚡" colorClass="text-orange-400" bgClass="bg-orange-500/10" />
                    <MetricCard title="Pending Verification" value={pendingVerifications.length} icon="🔍" colorClass="text-amber-300" bgClass="bg-amber-500/10" />
                    <MetricCard 
                        title="Total Value Generated" 
                        value={formatCurrency(stats.total_platform_value)} 
                        icon="💰" 
                        colorClass="text-emerald-300" 
                        bgClass="bg-emerald-500/20"
                        glowClass="bg-emerald-500/5 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] glow-hover"
                    />
                </div>
            )}

            {/* ═══ ACTIVE CONTRACTS TAB ═══ */}
            {activeTab === 'contracts' && (
                <div className="relative z-10 glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-slate-800/60 px-4 sm:px-6 py-4 bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-lg font-extrabold text-white font-display">Active Contracts</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {activeContracts.length} Active
                        </span>
                    </div>
                    {activeContracts.length === 0 ? (
                        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 text-2xl">📋</div>
                            <p className="text-base font-bold text-slate-300">No active contracts right now.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-slate-800/60">
                                <thead className="bg-slate-950/60 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Contract</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Business</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Influencer</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Amount</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {activeContracts.map(c => {
                                        const sc = statusColors[c.status] || 'text-slate-400 bg-slate-800';
                                        return (
                                            <tr key={c.id} className="transition-colors hover:bg-slate-800/30 group">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className="text-sm font-bold text-indigo-400">{c.display_number}</span>
                                                    {c.escrow_opted && <span className="ml-1.5 text-[9px] bg-violet-900/40 text-violet-300 px-1.5 py-0.5 rounded font-bold">🔒</span>}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-slate-200 font-medium">{c.business_name}</td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden sm:table-cell">@{c.influencer_handle}</td>
                                                <td className="px-4 sm:px-6 py-4 text-sm font-bold text-white">₹{Number(c.agreed_price).toLocaleString('en-IN')}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-white/5 ${sc}`}>
                                                        {c.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ GST VERIFICATION TAB ═══ */}
            {activeTab === 'verification' && (
                <div className="relative z-10 glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-slate-800/60 px-4 sm:px-6 py-4 bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-lg font-extrabold text-white font-display">Pending Business Verifications</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                            pendingVerifications.length > 0
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                            {pendingVerifications.length} Pending
                        </span>
                    </div>
                    {pendingVerifications.length === 0 ? (
                        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 text-2xl">✅</div>
                            <p className="text-base font-bold text-slate-300">All businesses are verified!</p>
                            <p className="text-sm text-slate-500 mt-1">No pending GST verifications.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-slate-800/60">
                                <thead className="bg-slate-950/60 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Company</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">GSTIN</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Legal Name</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Email</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {pendingVerifications.map(b => (
                                        <tr key={b.id} className="transition-colors hover:bg-slate-800/30 group">
                                            <td className="px-4 sm:px-6 py-4">
                                                <p className="text-sm font-bold text-slate-200">{b.company_name}</p>
                                                <p className="text-[10px] text-slate-500 sm:hidden">{b.email}</p>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-sm font-mono text-amber-300">{b.gstin}</td>
                                            <td className="px-4 sm:px-6 py-4 text-sm text-slate-300 hidden sm:table-cell">{b.legal_name || '—'}</td>
                                            <td className="px-4 sm:px-6 py-4 text-sm text-slate-400 hidden sm:table-cell">{b.email}</td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <button
                                                    onClick={() => handleVerifyBusiness(b.id)}
                                                    disabled={verifying === b.id}
                                                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    {verifying === b.id ? 'Verifying…' : '✓ Verify'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ DISPUTES TAB ═══ */}
            {activeTab === 'disputes' && (
                <div className="relative z-10 glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-slate-800/60 px-4 sm:px-6 py-4 bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-lg font-extrabold text-white font-display">Platform Disputes</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${openDisputesCount > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {openDisputesCount} Open
                        </span>
                    </div>
                    
                    <div className="bg-transparent">
                        {disputes.length === 0 ? (
                            <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 shadow-inner text-2xl">✨</div>
                                <p className="text-base font-bold text-slate-300 font-display">No disputes recorded.</p>
                                <p className="text-sm text-slate-500 mt-1">The platform is running smoothly.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="min-w-full divide-y divide-slate-800/60">
                                    <thead className="bg-slate-950/60 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Contract</th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Reason</th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 bg-transparent">
                                        {disputes.map(d => (
                                            <tr key={d.id} className="transition-colors hover:bg-slate-800/30 group">
                                                <td className="px-4 sm:px-6 py-4 text-xs font-mono font-medium text-slate-500 group-hover:text-slate-400 whitespace-nowrap">
                                                    {new Date(d.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-200">
                                                    <span className="font-mono text-[10px] text-slate-500 block mb-0.5">ID: {d.contract.id.slice(0,8)}</span>
                                                    <span className="hidden sm:inline">{d.contract.business_name} <span className="text-slate-600 mx-1">↔</span> {d.contract.influencer_handle || 'Influencer'}</span>
                                                    <span className="sm:hidden">{d.contract.business_name}</span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-slate-300 font-medium max-w-xs truncate hidden sm:table-cell" title={d.reason}>
                                                    {d.reason}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    {d.status === 'open' ? (
                                                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/20">
                                                            OPEN
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20" title={d.resolution_note}>
                                                            RESOLVED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    {d.status === 'open' && (
                                                        <button onClick={() => handleResolve(d.id)} disabled={resolving === d.id}
                                                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none glow-hover">
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
            )}
            
        </div>
    );
}

// Reusable stat card
function MetricCard({ title, value, icon, colorClass, bgClass, className = '', glowClass = '' }) {
    return (
        <div className={`glass-panel overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 sm:p-6 transition-all hover:border-slate-600 hover:bg-slate-800/80 group ${glowClass} ${className}`}>
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${bgClass} ${colorClass} text-xl sm:text-2xl shadow-inner border border-white/5`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 truncate">{title}</p>
                    <p className={`text-xl sm:text-2xl font-extrabold tracking-tight font-display drop-shadow-sm group-hover:scale-[1.02] transition-transform origin-left ${colorClass}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}

export default SuperadminDashboardPage;
