import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err?.non_field_errors?.[0] || err?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 animate-fade-in font-sans">
      
      {/* Left Panel: Branding & Marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-mesh overflow-hidden p-12 flex-col justify-between items-start border-r border-slate-800/50 shadow-2xl" style={{clipPath: 'inset(0)', zIndex: 0}}>
        
        {/* Glow Effects */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[40%] bg-violet-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        <Link to="/" className="z-10 group flex items-center transition">
          <BrandLogo className="h-14 lg:h-20 w-auto group-hover:scale-105 transition-transform duration-500 ease-out" />
        </Link>
        
        <div className="z-10 max-w-lg mb-12 animate-fade-up">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Grow together with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">smarter</span> collaborations.
          </h1>
          <p className="text-lg text-slate-300 font-medium my-4">
            Connect brands with authentic creators. Scale your impact, track your analytics, and manage payments—all in one place.
          </p>
          <div className="mt-8 flex items-center space-x-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-400">Join 5,000+ creators & brands</p>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32 z-20">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          
          <div className="mb-8 lg:hidden flex justify-center">
            <Link to="/">
              <BrandLogo className="h-12 w-auto animate-float" />
            </Link>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
            <p className="mt-3 text-sm text-slate-400">
              Please enter your details to sign in.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all hover:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="you@company.com" required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-300">Password</label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-indigo-400 transition hover:text-indigo-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 pr-11 text-slate-100 placeholder-slate-500 outline-none transition-all hover:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type={showPassword ? 'text' : 'password'} name="password" value={form.password}
                    onChange={handleChange} placeholder="••••••••" required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              className="glow-hover mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign up for free
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

export default LoginPage;
