import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { superadminApi } from '../api';

function SuperadminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Double check superuser status before fetching
        if (user && user.is_superuser) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await superadminApi.getDashboardStats();
            setStats(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch superadmin stats:', err);
            setError('Failed to load dashboard statistics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If not superuser, redirect away (defense in depth)
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
                    onClick={fetchStats}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!stats) return null;

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
                    <span>👑</span> Superadmin Dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Platform-wide statistics and metrics overview.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Users section */}
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
                
                {/* Campaigns section */}
                <MetricCard 
                    title="Active Campaigns" 
                    value={stats.active_campaigns} 
                    icon="📢" 
                    colorClass="text-yellow-400" 
                    bgClass="bg-yellow-400/10" 
                />
                
                {/* Contracts section */}
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
                
                {/* Value section */}
                <MetricCard 
                    title="Total Value Generated" 
                    value={formatCurrency(stats.total_platform_value)} 
                    icon="💰" 
                    colorClass="text-emerald-400" 
                    bgClass="bg-emerald-400/10"
                    className="sm:col-span-2 lg:col-span-2" 
                />
            </div>
            
            {/* Additional info section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mt-8">
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
