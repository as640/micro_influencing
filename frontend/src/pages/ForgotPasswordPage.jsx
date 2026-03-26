import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

function ForgotPasswordPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${BASE_URL}/auth/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.email?.[0] || 'Failed to request password reset.');
      }

      // Redirect to Reset Password Page with email state
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 animate-fade-in flex flex-col justify-center py-10">
      <div className="px-4">
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/50">
          <div className="space-y-4 bg-indigo-700 px-8 py-8 text-white">
            <BrandLogo className="max-h-28 animate-float" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">MicroFluence</p>
              <h1 className="mt-2 text-3xl font-bold">Reset Password</h1>
              <p className="mt-2 text-indigo-100">Enter your email to receive a 6-digit OTP code.</p>
            </div>
          </div>

          <form className="space-y-5 px-8 py-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email Address</span>
              <input
                className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2 ${user ? 'opacity-70 cursor-not-allowed' : ''}`}
                type="email" value={email}
                onChange={(e) => !user && setEmail(e.target.value)}
                readOnly={!!user}
                placeholder="you@example.com" required
              />
              {user && <p className="mt-1.5 text-xs text-slate-500">Using your account email.</p>}
            </label>

            <button
              className="glow-hover w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Sending Request...' : 'Send OTP'}
            </button>
          </form>

          <div className="border-t border-slate-800 px-8 py-4 text-center text-sm text-slate-400">
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
