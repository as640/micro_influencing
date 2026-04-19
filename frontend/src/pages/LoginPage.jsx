import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import MarketingHeaderBar from '../components/MarketingHeaderBar';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      // AuthContext.login() navigates to /dashboard/home on success
    } catch (err) {
      setError(
        err?.non_field_errors?.[0] ||
        err?.detail ||
        'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 animate-fade-in">
      <MarketingHeaderBar />

      <div className="px-4 py-10">
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/50">
          <div className="space-y-4 bg-indigo-700 px-8 py-8 text-white">
            <BrandLogo className="max-h-28 animate-float" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">MicroFluence</p>
              <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>
              <p className="mt-2 text-indigo-100">Sign in to continue to your dashboard.</p>
            </div>
          </div>

          <form className="space-y-5 px-8 py-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="block text-sm font-medium text-slate-300">Password</span>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Forgot Password?
                </Link>
              </div>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••" required
              />
            </label>

            <button
              className="glow-hover w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-slate-400">
              New user?{' '}
              <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Create an account
              </Link>
            </p>
          </form>

          <div className="border-t border-slate-800 px-8 py-4 text-center text-sm text-slate-400">
            <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Back to brand page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
