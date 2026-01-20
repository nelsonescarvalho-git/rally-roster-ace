export function VolleyballBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient - uses theme colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      
      {/* Net pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]">
        <defs>
          <pattern id="volleyball-net" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M0 30h60M30 0v60" stroke="currentColor" strokeWidth="1" className="text-foreground" />
          </pattern>
        </defs>
        <rect fill="url(#volleyball-net)" width="100%" height="100%" />
      </svg>
      
      {/* Decorative blur circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-48 -left-32 w-[30rem] h-[30rem] rounded-full bg-warning/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/3 blur-3xl" />
    </div>
  );
}
