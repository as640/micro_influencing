import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { authApi, saveTokens, businessApi } from '../api';

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'influencer', instagram_handle: '', company_name: '', category: 'lifestyle', locality: '', industry: 'tech', gstin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Setu GST Flow variables
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Step 1: Check if Business needs to request OTP
    if (form.role === 'business' && step === 1) {
      setLoading(true);
      try {
        const res = await businessApi.publicGstRequestOTP(form.gstin);
        setReferenceId(res.reference_id);
        setStep(2); // Jump to OTP entry
      } catch (err) {
        setError(err.error || 'Failed to request OTP for this GSTIN.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    // Build payload based on role
    const payload = {
      email: form.email,
      password: form.password,
      role: form.role,
      ...(form.role === 'influencer'
        ? { instagram_handle: form.instagram_handle, category: form.category, locality: form.locality }
        : { company_name: form.company_name, industry: form.industry, locality: form.locality, gstin: form.gstin, reference_id: referenceId, otp: otp }
      ),
    };

    try {
      const data = await authApi.register(payload);
      saveTokens(data.access, data.refresh);
      navigate('/dashboard/home');
    } catch (err) {
      const firstError = Object.values(err)?.[0];
      setError(
        Array.isArray(firstError) ? firstError[0] : (err?.detail || 'Registration failed. Please check your details.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 animate-fade-in font-sans">
      
      {/* Left Panel: Branding & Marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-mesh overflow-hidden p-12 flex-col justify-between items-start border-r border-slate-800/50 shadow-2xl z-10 sticky top-0 h-screen">
        
        {/* Glow Effects */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[40%] bg-violet-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        <Link to="/" className="z-10 group flex items-center gap-3 transition">
          <BrandLogo className="h-10 w-auto group-hover:scale-105 transition-transform duration-500 ease-out" />
          <span className="text-xl font-bold tracking-tight text-white/90">MicroFluence</span>
        </Link>
        
        <div className="z-10 max-w-lg mb-12 animate-fade-up">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Start your journey with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">MicroFluence</span> today.
          </h1>
          <p className="text-lg text-slate-300 font-medium my-4">
            Join thousands of authentic creators and ambitious brands scaling their impact.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <div className="text-3xl mb-2">🚀</div>
              <p className="font-semibold text-white">Scale Faster</p>
              <p className="text-xs text-slate-400 mt-1">Data-driven analytics to boost your growth.</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <div className="text-3xl mb-2">🛡️</div>
              <p className="font-semibold text-white">Secure Payments</p>
              <p className="text-xs text-slate-400 mt-1">Guaranteed milestone-based platform payouts.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Signup Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 z-20 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          
          <div className="mb-8 lg:hidden flex justify-center">
            <Link to="/">
              <BrandLogo className="h-12 w-auto animate-float" />
            </Link>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Create an account</h2>
            <p className="mt-3 text-sm text-slate-400">
              Let's get you set up so you can access your personal dashboard.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-300">I am a...</span>
              <div className="grid grid-cols-2 gap-3">
                {['influencer', 'business'].map((r) => (
                  <button key={r} type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r, step: 1 }))}
                    className={`rounded-xl border py-3 text-sm font-bold capitalize transition-all duration-200 ${form.role === r
                      ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                  <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                  <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars" minLength={8} required />
                </div>
              </div>

              {form.role === 'influencer' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Instagram Handle</label>
                      <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="instagram_handle" value={form.instagram_handle} onChange={handleChange} placeholder="@yourhandle" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">City / Locality</label>
                      <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="locality" value={form.locality} onChange={handleChange} placeholder="e.g. Mumbai" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Content Category</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        name="category" value={form.category} onChange={handleChange}>
                        {['lifestyle', 'fitness', 'food', 'tech', 'fashion', 'travel', 'beauty', 'gaming', 'other'].map((c) => (
                          <option key={c} value={c} className="bg-slate-900">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">15-Digit GST Number <span className="text-red-400">*</span></label>
                    <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 uppercase tracking-widest placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      type="text" name="gstin" value={form.gstin} onChange={handleChange} placeholder="07AAAAA0000A1Z5" maxLength={15} required disabled={step===2}/>
                    {step === 1 && <p className="mt-1 text-xs text-slate-500">We use Setu to securely verify your business entity.</p>}
                  </div>
                  
                  {step === 1 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">Brand Name</label>
                          <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            type="text" name="company_name" value={form.company_name} onChange={handleChange} placeholder="Optional display name" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">City / Locality</label>
                          <input className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            type="text" name="locality" value={form.locality} onChange={handleChange} placeholder="e.g. Delhi" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Industry</label>
                        <div className="relative">
                          <select className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            name="industry" value={form.industry} onChange={handleChange}>
                            {['tech', 'marketing', 'fitness', 'skincare', 'clothing', 'finance', 'other'].map((c) => (
                              <option key={c} value={c} className="bg-slate-900">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* GST Verification Step 2 */}
            {form.role === 'business' && step === 2 && (
              <div className="animate-fade-in rounded-xl border border-indigo-500/30 bg-indigo-900/10 p-5 mt-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><span className="text-indigo-400">🛡️</span> Verify Identity</h3>
                  <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Edit Details</button>
                </div>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">We sent a 6-digit confirmation code to the phone/email officially linked with <span className="font-mono text-indigo-300">{form.gstin}</span>.</p>
                <div>
                  <input className="w-full tracking-[0.5em] font-mono text-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type="text" name="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="------" maxLength={6} required />
                </div>
              </div>
            )}

            <button
              className="glow-hover mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Processing...' : (form.role === 'business' && step === 1 ? 'Verify GST & Register' : 'Complete Registration')}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Log in
            </Link>
          </p>

          <div className="mt-8 pt-8 border-t border-slate-800/60 text-center">
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">
              ← Return to homepage
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
