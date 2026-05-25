'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HardHat, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Reset failed');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center dark:bg-gray-900">
          <p className="text-red-600 text-sm dark:text-red-400">Invalid reset link. Please request a new one.</p>
          <Link href="/auth/forgot-password" className="text-blue-600 text-sm font-medium hover:underline mt-4 inline-block">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verified Local Talent</h1>
          <p className="text-slate-400 text-sm mt-1">Choose a new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-900">
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4 dark:bg-green-900/30">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">Password reset!</h2>
              <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors inline-block">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">Set new password</h2>

              {error && (
                <div id="reset-password-error" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-4 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} aria-describedby={error ? 'reset-password-error' : undefined} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      aria-required="true"
                      minLength={8}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 pr-10 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    aria-required="true"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    placeholder="Re-enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
