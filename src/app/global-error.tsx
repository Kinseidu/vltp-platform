'use client';

import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="bg-gray-50 dark:bg-gray-950">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Critical Error</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
