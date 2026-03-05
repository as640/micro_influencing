import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { authApi, saveTokens } from '../api';

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'influencer', instagram_handle: '', company_name: '', category: 'lifestyle', locality: '', industry: 'tech' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Build payload based on role
    const payload = {
      email: form.email,
      password: form.password,
      role: form.role,
      ...(form.role === 'influencer'
        ? { instagram_handle: form.instagram_handle, category: form.category, locality: form.locality }
        : { company_name: form.company_name, industry: form.industry, locality: form.locality }
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
    <div className="min-h-screen bg-slate-950 px-4 py-10 animate-fade-in">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/50">
        <div className="space-y-4 bg-indigo-700 px-8 py-8 text-white">
          <BrandLogo className="max-h-28 animate-float" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">MicroFluence</p>
            <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
            <p className="mt-2 text-indigo-100">Start your influencer journey with us.</p>
          </div>
        </div>

        <form className="space-y-4 px-8 py-8" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-300">I am a…</span>
            <div className="grid grid-cols-2 gap-2">
              {['influencer', 'business'].map((r) => (
                <button key={r} type="button"
                  onClick={() => setForm((p) => ({ ...p, role: r }))}
                  className={`rounded-lg border py-2.5 text-sm font-semibold capitalize transition ${form.role === r
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-600'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
            <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
              type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
            <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
              type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required />
          </label>

          {form.role === 'influencer' ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Instagram Handle</span>
                <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                  type="text" name="instagram_handle" value={form.instagram_handle} onChange={handleChange} placeholder="@yourhandle" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Category</span>
                <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500"
                  name="category" value={form.category} onChange={handleChange}>
                  {['lifestyle', 'fitness', 'food', 'tech', 'fashion', 'travel', 'beauty', 'gaming', 'other'].map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">City / Locality</span>
                <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                  type="text" name="locality" value={form.locality} onChange={handleChange} placeholder="e.g. Mumbai" required />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Company Name</span>
                <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                  type="text" name="company_name" value={form.company_name} onChange={handleChange} placeholder="Your company" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Industry</span>
                <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500"
                  name="industry" value={form.industry} onChange={handleChange}>
                  {['tech', 'fitness', 'skincare', 'clothing', 'finance', 'other'].map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">City / Locality</span>
                <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                  type="text" name="locality" value={form.locality} onChange={handleChange} placeholder="e.g. Delhi" required />
              </label>
            </>
          )}

          <button
            className="glow-hover w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            type="submit" disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="border-t border-slate-800 px-8 py-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
