export const AuthLayout = ({
  children,
  mobileTitle = "CollaboWrite",
}: {
  children: React.ReactNode;
  mobileTitle?: string;
}) => (
  <div className="font-display min-h-screen flex flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
    {/* Left: Mesh gradient + branding (hidden on small screens) */}
    <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative flex-col justify-between p-12 mesh-gradient overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-symbols-outlined text-2xl">edit_note</span>
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">CollaboWrite</span>
      </div>
      <div className="relative z-10 max-w-lg">
        <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white mb-6">
          Where ideas come to life,{" "}
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-primary">
            together.
          </span>
        </h1>
        <p className="text-lg text-slate-300 font-medium leading-relaxed">
          Experience the next generation of real-time collaboration. Seamless, fast, and designed
          for modern teams.
        </p>
      </div>
    </div>
    {/* Right: Form area */}
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative bg-background-light dark:bg-background-dark">
      <div className="md:hidden absolute top-6 left-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-symbols-outlined text-xl">edit_note</span>
        </div>
        <span className="text-xl font-bold text-slate-900 dark:text-white">{mobileTitle}</span>
      </div>
      {children}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
    </div>
  </div>
);
