import { Link } from 'react-router-dom';

function MarketingPlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-5xl px-6 py-16 animate-fade-up">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Coming Soon</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">{description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Back to Home
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white"
            >
              Go to Login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MarketingPlaceholderPage;
