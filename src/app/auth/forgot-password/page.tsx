'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HardHat, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Something went wrong');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verified Local Talent</h1>
          <p className="text-slate-400 text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-900">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4 dark:bg-green-900/30">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                If an account exists with that email, we&apos;ve sent a password reset link.
              </p>
              <Link href="/auth/login" className="text-blue-600 text-sm font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">Forgot password?</h2>
              <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div id="forgot-password-error" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-4 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} aria-describedby={error ? 'forgot-password-error' : undefined} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    aria-required="true"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6 dark:text-gray-400">
                <Link href="/auth/login" className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
