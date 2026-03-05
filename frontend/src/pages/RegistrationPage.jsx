import MarketingHeaderBar from '../components/MarketingHeaderBar';

function RegistrationPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <MarketingHeaderBar />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 md:p-10 animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Registration</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Registration Page Coming Soon</h1>
          <p className="mt-4 text-lg text-slate-300">
            This route is ready. We will build the full registration flow and form fields here next.
          </p>
        </section>
      </main>
    </div>
  );
}

export default RegistrationPage;
