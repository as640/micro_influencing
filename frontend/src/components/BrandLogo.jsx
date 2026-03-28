function BrandLogo({ className = 'h-10 w-auto' }) {
  return (
    <img
      src="/logo.jpg"
      alt="MicroFluence logo"
      className={`rounded-xl object-contain shadow-lg shadow-slate-950/40 ${className}`}
    />
  );
}

export default BrandLogo;
