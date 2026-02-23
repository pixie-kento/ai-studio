import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLogin } from '../../hooks/useAuth.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const login = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="public-shell-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_14px_26px_-16px_rgba(91,117,255,0.95)]">
              <Clapperboard size={20} />
            </div>
            <div className="text-left">
              <span className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">StudioAI</span>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
            </div>
          </Link>
        </div>

        <div className="card p-6 md:p-8">
          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Welcome back</h1>
          <p className="mb-7 text-sm text-slate-500 dark:text-slate-300">Sign in to continue managing your production workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-purple hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={login.isPending} className="btn-primary w-full justify-center py-3 text-base">
              {login.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-300">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand-purple hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
