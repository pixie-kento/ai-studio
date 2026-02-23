import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clapperboard, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-shell-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_16px_30px_-20px_rgba(91,117,255,0.95)]">
              <Clapperboard size={20} />
            </div>
            <div className="text-left">
              <p className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">StudioAI</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
            </div>
          </Link>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset your password</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Enter your account email and we will send a secure reset link.
            </p>
          </div>

          <div className="p-6">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Check your inbox</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  We sent a reset link to <span className="font-medium text-slate-700 dark:text-slate-100">{email}</span>.
                </p>
                <Link to="/login" className="btn-primary mt-6 w-full justify-center py-3">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="label">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send reset link'}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-300">
                  Remembered your password?{' '}
                  <Link to="/login" className="font-semibold text-brand-purple hover:underline">
                    Back to login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
