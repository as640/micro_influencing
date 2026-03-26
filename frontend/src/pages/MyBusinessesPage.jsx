import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { businessApi } from '../api';

function MyBusinessesPage() {
    const { user, login } = useAuth();
    const [businesses, setBusinesses] = useState(user?.business_profiles || []);
    const [showModal, setShowModal] = useState(false);
    
    // OTP Flow State
    const [step, setStep] = useState(1); // 1 = Request, 2 = Verify
    const [form, setForm] = useState({ gstin: '', company_name: '', industry: 'Marketing', locality: '' });
    const [otp, setOtp] = useState('');
    const [referenceId, setReferenceId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await businessApi.gstRequestOTP(form.gstin);
            setReferenceId(data.reference_id);
            setStep(2); // Move to OTP input
        } catch (err) {
            setError(err.error || 'Failed to request OTP. Please check the GSTIN.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const newBusiness = await businessApi.gstVerifyOTP(referenceId, otp, form.gstin, form.company_name, form.industry, form.locality);
            setBusinesses([...businesses, newBusiness]);
            setShowModal(false);
            setStep(1);
            setForm({ gstin: '', company_name: '', industry: 'Marketing', locality: '' });
            setOtp('');
            window.location.reload();
        } catch (err) {
            setError(err.error || 'Failed to verify OTP.');
        } finally {
            setLoading(false);
        }
    };

    if (user?.role !== 'business') {
        return <div className="p-10 text-slate-400">Restricted to business accounts.</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">My Businesses</h2>
                    <p className="mt-1 text-slate-400">Manage multiple verified entities under one account.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
                >
                    + Add Business via GST
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {businesses.map((biz) => (
                    <div key={biz.id} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
                        {biz.is_verified && (
                            <div className="absolute top-4 right-4 text-emerald-400">
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                </svg>
                            </div>
                        )}
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">{biz.industry}</p>
                        <h3 className="text-xl font-bold text-white mb-1">{biz.company_name}</h3>
                        {biz.legal_name && <p className="text-xs text-slate-500 mb-4 font-mono">Legal: {biz.legal_name}</p>}
                        
                        <div className="mt-auto border-t border-slate-800 pt-4">
                            <p className="text-sm font-medium text-slate-400">
                                <span className="text-slate-500">GSTIN:</span> {biz.gstin || 'Not Provided'}
                            </p>
                            <p className="text-sm font-medium text-slate-400 mt-1">
                                <span className="text-slate-500">Locality:</span> {biz.locality || 'N/A'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* GST Verification 2-Step OTP Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                        <div className="bg-indigo-600 px-6 py-4">
                            <h3 className="text-xl font-bold text-white">Verify New Business</h3>
                            <p className="text-sm text-indigo-100 mt-1">Add a company securely via GST OTP authentication</p>
                        </div>
                        
                        <div className="p-6">
                            {error && (
                                <div className="mb-4 rounded bg-red-900/40 p-3 text-sm text-red-400 border border-red-800">
                                    {error}
                                </div>
                            )}

                            {step === 1 ? (
                                <form onSubmit={handleRequestOTP} className="space-y-4">
                                    <label className="block">
                                        <span className="mb-1 block text-sm font-medium text-slate-300">15-Digit GSTIN</span>
                                        <input type="text" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} maxLength={15} required
                                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 uppercase focus:border-indigo-500" placeholder="07AAAAA0000A1Z5" />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-sm font-medium text-slate-300">Display Name / Brand Name</span>
                                        <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-indigo-500" placeholder="Optional (Defaults to Legal Name)" />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block">
                                            <span className="mb-1 block text-sm font-medium text-slate-300">Industry</span>
                                            <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}
                                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-indigo-500">
                                                {['tech', 'fitness', 'skincare', 'clothing', 'finance', 'agency', 'other'].map(ind => (
                                                    <option key={ind} value={ind}>{ind.charAt(0).toUpperCase() + ind.slice(1)}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-sm font-medium text-slate-300">HQ City</span>
                                            <input type="text" value={form.locality} onChange={e => setForm({...form, locality: e.target.value})}
                                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-indigo-500" placeholder="e.g. Mumbai" />
                                        </label>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancel</button>
                                        <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                                            {loading ? 'Requesting OTP...' : 'Send OTP'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOTP} className="space-y-4">
                                    <p className="text-sm text-slate-300 mb-4">An highly secure 6-digit OTP has been sent to the official GST-registered contact mechanisms (Email/Mobile) from the Government of India via Setu.</p>
                                    <label className="block">
                                        <span className="mb-1 block text-sm font-medium text-slate-300">Enter 6-Digit OTP</span>
                                        <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required
                                            className="w-full tracking-[0.3em] font-mono text-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xl text-slate-100 focus:border-indigo-500" placeholder="123456" />
                                    </label>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Back</button>
                                        <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                                            {loading ? 'Verifying OTP...' : 'Verify & Setup'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyBusinessesPage;
