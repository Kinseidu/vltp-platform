'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';
import { useTheme } from '@/components/shared/ThemeProvider';
import { Save, Settings as SettingsIcon, Sun, Moon, Monitor } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    MAX_FILE_SIZE_MB: '10',
    VERIFICATION_EXPIRY_DAYS: '365',
    ENABLE_AI_SHORTLISTING: 'true',
    ENABLE_AI_INTERVIEWS: 'true',
    PLATFORM_NAME: 'VLTP - Verified Local Talent Platform'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.success && data.data.settings.length > 0) {
        const dbSettings = data.data.settings.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...dbSettings }));
      }
      setLoading(false);
    });
  }, []);

  const toast = useToast();
  const { theme, setTheme } = useTheme();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        toast({ title: 'Settings saved', description: 'Your configuration updates are now active.', variant: 'success' });
      } else {
        toast({ title: 'Save failed', description: 'Unable to store settings. Please retry.', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Network error', description: 'Unable to save settings right now.', variant: 'error' });
    }
    setSaving(false);
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="System Settings" 
        subtitle="Configure global platform parameters, file limits, and feature toggles." 
      />

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden max-w-3xl">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
          <SettingsIcon size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Global Configuration</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">

            {/* Appearance */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">Appearance</h3>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {[
                  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
                  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
                  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* General Settings */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">General Platform</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="platform-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Platform Name</label>
                  <input id="platform-name" type="text" value={settings.PLATFORM_NAME} onChange={e => handleChange('PLATFORM_NAME', e.target.value)} aria-describedby="platform-name-hint" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border" />
                  <p id="platform-name-hint" className="text-xs text-gray-400 dark:text-gray-500 mt-1">The display name shown across the platform.</p>
                </div>
              </div>
            </div>

            {/* Storage & Limits */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">Storage & Limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Upload File Size (MB)</label>
                  <input type="number" value={settings.MAX_FILE_SIZE_MB} onChange={e => handleChange('MAX_FILE_SIZE_MB', e.target.value)} className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Expiry (Days)</label>
                  <input type="number" value={settings.VERIFICATION_EXPIRY_DAYS} onChange={e => handleChange('VERIFICATION_EXPIRY_DAYS', e.target.value)} className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border" />
                </div>
              </div>
            </div>

            {/* AI Settings */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">AI Modules Configuration</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.ENABLE_AI_SHORTLISTING === 'true'} onChange={e => handleChange('ENABLE_AI_SHORTLISTING', e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable AI-Assisted Candidate Shortlisting</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.ENABLE_AI_INTERVIEWS === 'true'} onChange={e => handleChange('ENABLE_AI_INTERVIEWS', e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable AI Interview Question Generation</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button disabled={saving} type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
