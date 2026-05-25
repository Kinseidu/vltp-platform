'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';
import { User, MapPin } from 'lucide-react';

export default function AdminYouthPresidents() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, uRes] = await Promise.all([
      fetch('/api/admin/communities'),
      fetch('/api/admin/users?role=YOUTH_PRESIDENT')
    ]);
    const cData = await cRes.json();
    const uData = await uRes.json();
    
    if (cData.success) setCommunities(cData.data.communities || []);
    if (uData.success) setUsers(uData.data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toast = useToast();

  const handleAssign = async (communityId: string, youthPresidentId: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${communityId}/youth-president`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youthPresidentId: youthPresidentId || null }),
      });
      if (res.ok) {
        toast({ title: 'Assignment updated', description: 'Youth President queue refreshed for all pending applicants in this community.', variant: 'success' });
        fetchData(); // refresh
      } else {
        const text = await res.text();
        toast({ title: 'Update failed', description: text || 'Unable to update assignment.', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Network error', description: 'Unable to update assignment right now.', variant: 'error' });
    }
  };

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="Youth President Assignments" 
        subtitle="Assign local Youth Presidents to their respective communities to enable local verification." 
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: List of communities and their current assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-gray-900 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Community Assignments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : communities.map(c => (
              <div key={c.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" /> {c.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 dark:text-gray-400">{c.region}</div>
                </div>
                
                <div className="w-full sm:w-64">
                  <label className="text-xs font-medium text-gray-500 mb-1 block dark:text-gray-400">Assigned Youth President</label>
                  <select
                    className="w-full border-gray-300 rounded-lg p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    value={c.youthPresidentId || ''}
                    onChange={(e) => handleAssign(c.id, e.target.value)}
                  >
                    <option value="">-- No Assignment --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.applicantProfile?.fullName || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Explainer */}
        <div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-6 dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2 dark:text-blue-100">
              <User size={18} /> How Assignments Work
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed mb-4 dark:text-blue-200">
              Youth Presidents act as the first line of defense in verifying local talent. 
              By assigning a Youth President to a community, you grant them access to the Verification Queue for all applicants claiming residency in that community.
            </p>
            <ul className="text-sm text-blue-800 space-y-2 list-disc pl-4 dark:text-blue-200">
              <li>A community can have at most ONE active Youth President.</li>
              <li>A Youth President can be assigned to at most ONE community.</li>
              <li>If you re-assign a Youth President, their previous queue access is revoked instantly.</li>
              <li>Only users with the <span className="font-mono text-xs bg-blue-200 px-1 rounded dark:bg-blue-900/40">YOUTH_PRESIDENT</span> role appear in the dropdown.</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
