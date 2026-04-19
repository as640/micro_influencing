import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Assume user comes from ForgotPasswordPage and their email is saved in location.state
  const [email, setEmail] = useState(location.state?.email || '');
  const [form, setForm] = useState({ otp: '', new_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is missing. Please restart the password reset process.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${BASE_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: form.otp, new_password: form.new_password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.otp?.[0] || errorData.new_password?.[0] || 'Failed to reset password.');
      }

      // Success, route to login
      navigate('/login', { replace: true });
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
              <h1 className="mt-2 text-3xl font-bold">Verify OTP</h1>
              <p className="mt-2 text-indigo-100">Enter the 6-digit code sent to your email.</p>
            </div>
          </div>

          <form className="space-y-5 px-8 py-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {!location.state?.email && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Email Address</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">6-Digit OTP</span>
              <input
                className="w-full tracking-[0.2em] rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                type="text" name="otp" value={form.otp} maxLength={6}
                onChange={handleChange} placeholder="123456" required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">New Password</span>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none ring-indigo-500 transition focus:border-indigo-500 focus:ring-2"
                type="password" name="new_password" value={form.new_password} minLength={8}
                onChange={handleChange} placeholder="••••••••" required
              />
            </label>

            <button
              className="glow-hover w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Verifying...' : 'Reset Password'}
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

export default ResetPasswordPage;
