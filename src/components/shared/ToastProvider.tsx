'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

// Context holds the toast function directly for a simpler API
type ToastFn = (params: Omit<ToastItem, 'id'>) => void;
const ToastContext = createContext<ToastFn | undefined>(undefined);

const toastStyles: Record<ToastVariant, { wrapper: string; iconColor: string; bar: string; iconEl: typeof CheckCircle2 }> = {
  success: {
    wrapper: 'bg-white border border-gray-100 border-l-4 border-l-emerald-500',
    iconColor: 'text-emerald-500',
    bar: 'bg-emerald-500',
    iconEl: CheckCircle2,
  },
  error: {
    wrapper: 'bg-white border border-gray-100 border-l-4 border-l-red-500',
    iconColor: 'text-red-500',
    bar: 'bg-red-500',
    iconEl: XCircle,
  },
  info: {
    wrapper: 'bg-white border border-gray-100 border-l-4 border-l-blue-500',
    iconColor: 'text-blue-500',
    bar: 'bg-blue-500',
    iconEl: Info,
  },
  warning: {
    wrapper: 'bg-white border border-gray-100 border-l-4 border-l-amber-500',
    iconColor: 'text-amber-500',
    bar: 'bg-amber-500',
    iconEl: AlertTriangle,
  },
};

const DURATION = 3000;
const ANIM = 320;

function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [shown, setShown] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const removeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const startExit = useCallback(() => {
    setShown(false);
    removeTimerRef.current = setTimeout(() => onRemove(item.id), ANIM);
  }, [item.id, onRemove]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setShown(true));
    exitTimerRef.current = setTimeout(startExit, DURATION - ANIM);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(exitTimerRef.current);
      clearTimeout(removeTimerRef.current);
    };
  }, [startExit]);

  const s = toastStyles[item.variant];
  const Icon = s.iconEl;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        transform: shown ? 'translateX(0)' : 'translateX(calc(100% + 1.5rem))',
        opacity: shown ? 1 : 0,
        transition: `transform ${ANIM}ms cubic-bezier(0.16,1,0.3,1), opacity ${ANIM}ms ease`,
        willChange: 'transform, opacity',
      }}
      className={`${s.wrapper} rounded-xl shadow-lg w-80 max-w-[calc(100vw-2rem)] overflow-hidden`}
    >
      {/* Shrinking progress bar */}
      <div className="h-[3px] overflow-hidden">
        <div
          className={`h-full ${s.bar}`}
          style={{ animation: `vltp-shrink ${DURATION}ms linear forwards` }}
        />
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`mt-0.5 shrink-0 ${s.iconColor}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</div>
          {item.description && (
            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={startExit}
          className="ml-1 shrink-0 rounded-full p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((params: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((c) => [...c, { id, ...params }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((c) => c.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed right-4 top-4 z-[9999] flex flex-col gap-2.5"
        style={{ pointerEvents: 'none' }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastCard item={t} onRemove={remove} />
          </div>
        ))}
      </div>
      <style>{`@keyframes vltp-shrink{from{transform:scaleX(1);transform-origin:left}to{transform:scaleX(0);transform-origin:left}}`}</style>
    </ToastContext.Provider>
  );
}

/**
 * Returns the toast dispatcher function directly.
 * Usage:  const toast = useToast();
 *         toast({ title: 'Done', variant: 'success' });
 */
export function useToast(): ToastFn {
  const fn = useContext(ToastContext);
  if (!fn) return () => undefined;
  return fn;
}