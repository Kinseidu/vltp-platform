'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { useToast } from '@/components/shared/ToastProvider';
import { Bell, Send } from 'lucide-react';

export default function AdminAnnouncements() {
  const [formData, setFormData] = useState({ title: '', message: '', targetRole: '', targetCommunityId: '' });
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/communities').then(r => r.json()).then(data => {
      if (data.success) setCommunities(data.data.communities || []);
    });
  }, []);

  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Announcement sent',
          description: `Delivered to ${data.data.sentCount} recipients.`,
          variant: 'success',
        });
        setFormData({ title: '', message: '', targetRole: '', targetCommunityId: '' });
      } else {
        toast({ title: 'Announcement failed', description: 'Please try again or check your input.', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Network error', description: 'Unable to send announcement right now.', variant: 'error' });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <PageHeader 
        title="Announcements" 
        subtitle="Broadcast notifications to users, roles, or specific communities." 
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Bell size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">New Announcement</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience (Role)</label>
              <select value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border bg-white">
                <option value="">All Users</option>
                <option value="APPLICANT">Applicants Only</option>
                <option value="YOUTH_PRESIDENT">Youth Presidents Only</option>
                <option value="HR_OFFICER">HR Officers Only</option>
                <option value="CHIEF_STAFF">Chief Staff Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Community (Optional)</label>
              <select value={formData.targetCommunityId} onChange={e => setFormData({...formData, targetCommunityId: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border bg-white">
                <option value="">All Communities</option>
                {communities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">If selected, only users within this community will receive the alert.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="announcement-title">Message Title</label>
              <input
                id="announcement-title"
                required
                type="text"
                placeholder="e.g. System Maintenance Notice"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
              <textarea required rows={4} placeholder="Type your announcement here..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border"></textarea>
            </div>

            <div className="pt-2 flex justify-end">
              <button disabled={loading} type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Send size={16} /> {loading ? 'Sending...' : 'Broadcast Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
