import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, authenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  useEffect(() => {
    if (!authLoading && authenticated) navigate(from, { replace: true });
  }, [authLoading, authenticated, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(msg || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px] glass-card rounded-2xl p-8 shadow-2xl relative z-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400">Enter your details to access your workspace.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-xl">{error}</p>
          )}
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="peer block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 pb-2.5 pt-5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none transition-colors"
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-4 z-10 origin-[0] -translate-y-2.5 scale-75 transform text-sm text-slate-500 dark:text-slate-400 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-primary"
            >
              Email address
            </label>
            <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-400 pointer-events-none text-[20px]">
              mail
            </span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="peer block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 pb-2.5 pt-5 pr-12 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none transition-colors"
            />
            <label
              htmlFor="password"
              className="absolute left-4 top-4 z-10 origin-[0] -translate-y-2.5 scale-75 transform text-sm text-slate-500 dark:text-slate-400 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-primary"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-4 top-3.5 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-surface-dark text-primary focus:ring-primary"
              />
              <span className="ml-2 block text-xs md:text-sm text-slate-600 dark:text-slate-400">
                Remember me
              </span>
            </label>
            <a
              href="#"
              className="text-xs md:text-sm font-semibold text-primary hover:text-blue-500 transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-primary to-blue-600 p-0.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.01] disabled:opacity-70 disabled:hover:scale-100"
          >
            <span className="flex w-full items-center justify-center rounded-[10px] bg-transparent px-4 py-3 transition-all">
              {loading ? "Signing in..." : "Sign In"}
              <span className="material-symbols-outlined ml-2 text-lg transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </span>
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-blue-500 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};
