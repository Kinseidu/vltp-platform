'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';
import { SkeletonList } from '@/components/shared/Skeleton';
import { Shield, Search } from 'lucide-react';

export default function AdminRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(data => {
      if (data.success) setUsers(data.data.users);
      setLoading(false);
    });
  }, []);

  const toast = useToast();

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    
    // Prevent unauthorized role combinations (e.g. APPLICANT cannot be HR if they have active applications, though we just enforce strict single role for MVP)
    if (newRole === 'ADMIN' && !confirm('Are you sure you want to grant ADMIN privileges?')) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
        setSelectedUser(null);
        setNewRole('');
        toast({ title: 'Role updated', description: 'The user role assignment has been saved.', variant: 'success' });
      } else {
        toast({ title: 'Update failed', description: 'Unable to change the role. Please retry.', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Save error', description: 'Network or server issue prevented saving.', variant: 'error' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.applicantProfile?.fullName && u.applicantProfile.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader title="Roles & Permissions" subtitle="Assign system roles and prevent unauthorized access combos." />

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Column: User Search */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px] dark:bg-gray-900 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-semibold text-gray-900 mb-3 dark:text-gray-100">Select User</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 outline-none dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <SkeletonList count={5} />
            ) : filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); setNewRole(user.role); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedUser?.id === user.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-sm text-gray-900 truncate dark:text-gray-100">
                  {user.applicantProfile?.fullName || user.email}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500 truncate dark:text-gray-400">{user.email}</span>
                  <span className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">
                    {user.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Role Editor */}
        <div className="md:col-span-2">
          {selectedUser ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg dark:bg-blue-900/30">
                  {selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedUser.applicantProfile?.fullName || 'No Profile'}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Assign System Role</label>
                  <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">
                    Warning: Changing a user&apos;s role will revoke their access to their previous role&apos;s dashboards. 
                    Roles in this system are mutually exclusive to prevent conflict of interest (e.g. an HR officer cannot be an Applicant).
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'APPLICANT', label: 'Applicant', desc: 'Can apply for jobs and manage profile.' },
                      { id: 'YOUTH_PRESIDENT', label: 'Youth President', desc: 'Can verify local applicants.' },
                      { id: 'HR_OFFICER', label: 'HR Officer', desc: 'Can post jobs and shortlist candidates.' },
                      { id: 'CHIEF_STAFF', label: 'Chief Confirmation Officer', desc: 'Final sign-off on verifications.' },
                      { id: 'ADMIN', label: 'System Admin', desc: 'Full platform governance and config.' },
                    ].map(role => (
                      <label 
                        key={role.id}
                        className={`flex items-start p-4 border rounded-xl cursor-pointer transition-colors ${
                          newRole === role.id 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/30' 
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="role" 
                          value={role.id} 
                          checked={newRole === role.id}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{role.label}</span>
                          <span className="block text-xs text-gray-500 mt-1 dark:text-gray-400">{role.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 flex justify-end gap-3 dark:border-gray-700">
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRoleChange}
                    disabled={newRole === selectedUser.role}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Role Assignment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col items-center justify-center text-center p-6 dark:bg-gray-900 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 dark:bg-gray-800">
                <Shield size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No User Selected</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm dark:text-gray-400">
                Select a user from the list on the left to view and modify their system roles and permissions.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
