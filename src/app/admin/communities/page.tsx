'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { MapPin, Plus, UserPlus, Loader2, X, Edit, Trash2, Save, Users } from 'lucide-react';
import { useToast } from '@/components/shared/ToastProvider';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

export default function AdminCommunities() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [youthPresidents, setYouthPresidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<number | null>(null);
  const [editingCommunity, setEditingCommunity] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const toast = useToast();

  const [formData, setFormData] = useState({ name: '', region: '', description: '' });
  const [editFormData, setEditFormData] = useState({ name: '', region: '', description: '', isActive: true });
  const [selectedYp, setSelectedYp] = useState<string>('');

  const fetchCommunities = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/communities');
    const data = await res.json();
    if (data.success) {
      setCommunities(data.data.communities || []);
    }
    setLoading(false);
  };

  const fetchYPs = async () => {
    const res = await fetch('/api/admin/users?role=YOUTH_PRESIDENT');
    const data = await res.json();
    if (data.success) {
      setYouthPresidents(data.data.users || []);
    }
  };

  useEffect(() => {
    fetchCommunities();
    fetchYPs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing('create');
    try {
      const res = await fetch('/api/admin/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({ name: '', region: '', description: '' });
        fetchCommunities();
        toast({
          title: 'Success',
          description: 'Community created successfully',
          variant: 'success'
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create community', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Network error occurred', variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity) return;

    setProcessing('update');
    try {
      const res = await fetch(`/api/admin/communities/${editingCommunity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingCommunity(null);
        fetchCommunities();
        toast({
          title: 'Success',
          description: 'Community updated successfully',
          variant: 'success'
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update community', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Network error occurred', variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (communityId: number) => {
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone.')) return;

    setProcessing(`delete-${communityId}`);
    try {
      const res = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchCommunities();
        toast({
          title: 'Success',
          description: 'Community deleted successfully',
          variant: 'success'
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete community', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Network error occurred', variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleAssignYP = async () => {
    if (showAssignModal === null) return;
    setProcessing('assign');
    try {
      const res = await fetch(`/api/admin/communities/${showAssignModal}/youth-president`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youthPresidentId: selectedYp || null }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignModal(null);
        setSelectedYp('');
        fetchCommunities();
        const count = data.data.pendingApplicantsCount || 0;
        toast({
          title: 'Assignment Updated',
          description: `Youth President assigned successfully. ${count} pending applicant${count !== 1 ? 's' : ''} now in queue for review.`,
          variant: 'success'
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to assign youth president', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Network error occurred', variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const openEditModal = (community: any) => {
    setEditingCommunity(community);
    setEditFormData({
      name: community.name,
      region: community.region,
      description: community.description || '',
      isActive: community.isActive,
    });
    setShowEditModal(true);
  };

  useEffect(() => {
    if (!showModal && showAssignModal === null && !showEditModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowAssignModal(null);
        setShowEditModal(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal, showAssignModal, showEditModal]);

  const addModalRef = useFocusTrap(showModal);
  const assignModalRef = useFocusTrap(showAssignModal !== null);
  const editModalRef = useFocusTrap(showEditModal);

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@miningco.gh">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="Community Management" 
        subtitle="Add and manage eligible host communities and their metadata." 
        action={
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Community
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-gray-900 dark:border-gray-700">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold">Community Name</th>
              <th className="px-6 py-3 font-semibold">Region</th>
              <th className="px-6 py-3 font-semibold">Youth President</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
            ) : communities.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No communities configured.</td></tr>
            ) : (
              communities.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center dark:bg-blue-900/30">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs dark:text-gray-400">{c.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{c.region}</td>
                  <td className="px-6 py-4">
                    {c.youthPresident ? (
                      <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30">
                          {c.youthPresident.email}
                        </span>
                        <button 
                          onClick={() => { setShowAssignModal(c.id); setSelectedYp(''); }}
                          className="text-gray-400 hover:text-blue-600 p-1 dark:text-gray-500"
                          title="Change Assignment"
                        >
                          <UserPlus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setShowAssignModal(c.id); setSelectedYp(''); }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={12} /> Assign YP
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gray-400 mr-4 dark:text-gray-500">
                        {c._count?.applicantProfiles || 0} applicants
                      </span>
                      <button
                        onClick={() => openEditModal(c)}
                        disabled={processing === `edit-${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:bg-blue-900/30"
                        title="Edit community"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={processing === `delete-${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:bg-red-900/30"
                        title="Delete community"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add Community Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowModal(false)}>
          <div ref={addModalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Add New Community</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Community Name</label>
                <input required aria-required="true" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Region / District</label>
                <input required aria-required="true" type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Description (Optional)</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600">Cancel</button>
<button type="submit" disabled={!!processing} aria-busy={!!processing} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
                  {processing && <Loader2 size={14} className="animate-spin" />}
                  Save Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign YP Modal */}
      {showAssignModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowAssignModal(null)}>
          <div ref={assignModalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Assign Youth President</h3>
              <button onClick={() => setShowAssignModal(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select a registered Youth President for <strong>{communities.find(c => c.id === showAssignModal)?.name}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Youth President</label>
                <select 
                  value={selectedYp} 
                  onChange={e => setSelectedYp(e.target.value)}
                  className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">-- Unassigned --</option>
                  {youthPresidents.map(yp => (
                    <option key={yp.id} value={yp.id}>
                      {yp.email} ({yp.isActive ? 'Active' : 'Inactive'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssignModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600">Cancel</button>
                <button 
                  onClick={handleAssignYP} 
                  disabled={!!processing}
                  aria-busy={!!processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  {processing && <Loader2 size={14} className="animate-spin" />}
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Community Modal */}
      {showEditModal && editingCommunity && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowEditModal(false)}>
          <div ref={editModalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Edit Community</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Community Name</label>
                <input
                  required
                  aria-required="true"
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Region / District</label>
                <input
                  required
                  aria-required="true"
                  type="text"
                  value={editFormData.region}
                  onChange={e => setEditFormData({...editFormData, region: e.target.value})}
                  className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                  className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editFormData.isActive}
                  onChange={e => setEditFormData({...editFormData, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                  Active
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!processing}
                  aria-busy={!!processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  {processing && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
