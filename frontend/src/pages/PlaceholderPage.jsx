function PlaceholderPage({ title }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-slate-400">This section is ready. We can build this page next.</p>
      <div className="mt-4 h-1.5 w-28 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 animate-gradient" />
    </section>
  );
}

export default PlaceholderPage;
