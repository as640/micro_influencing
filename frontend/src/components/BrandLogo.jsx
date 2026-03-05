function BrandLogo({ className = '' }) {
  return (
    <img
      src="/logo.jpg"
      alt="MicroFluence logo"
      className={`h-auto w-full rounded-xl border border-white/10 bg-black/20 object-cover shadow-lg shadow-slate-950/40 ${className}`}
    />
  );
}

export default BrandLogo;
