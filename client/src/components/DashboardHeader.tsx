export const DashboardHeader = ({
  onMenuClick,
  searchValue = "",
  onSearchChange,
}: {
  onMenuClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) => (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-surface-highlight bg-white/50 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-10 md:px-8">
      <div className="flex flex-1 items-center gap-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-surface-highlight"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <span className="material-symbols-outlined text-primary">dashboard</span>
          <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="hidden md:flex max-w-md w-full relative group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-slate-100 dark:bg-surface-highlight text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
          />
        </div>
      </div>
    </header>
  );
