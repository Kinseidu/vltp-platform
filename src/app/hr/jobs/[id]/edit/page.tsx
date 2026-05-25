// src/app/hr/jobs/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Trash2, Loader2, ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/shared/ToastProvider';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const jobId = params.id;
  
  const [user, setUser] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);

  const [form, setForm] = useState({
    title: '', description: '', scope: '', responsibilities: '',
    minExperience: 0, applicationDeadline: '', status: 'DRAFT',
  });
  const [requirements, setRequirements] = useState<{ skillId: number; isMandatory: boolean; minYears: number }[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<number[]>([]);
  const [docTypes, setDocTypes] = useState<{ docType: string; label: string; required: boolean }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
      fetch('/api/admin/communities').then(r => r.json()),
      fetch(`/api/jobs/${jobId}`).then(r => r.json()),
    ]).then(([u, s, c, j]) => {
      if (u.success) setUser(u.data.user);
      if (s.success) setSkills(s.data.skills || []);
      if (c.success) setCommunities(c.data.communities || []);
      
      if (j.success) {
        const job = j.data.job;
        setForm({
          title: job.title,
          description: job.description,
          scope: job.scope,
          responsibilities: job.responsibilities,
          minExperience: job.minExperience,
          applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : '',
          status: job.status,
        });
        setRequirements(job.requirements.map((r: any) => ({
          skillId: r.skillId,
          isMandatory: r.isMandatory,
          minYears: r.minYears,
        })));
        setSelectedCommunities(job.eligibleCommunities.map((ec: any) => ec.communityId));
        setDocTypes(job.requiredDocTypes.map((rd: any) => ({
          docType: rd.docType,
          label: rd.label,
          required: rd.required,
        })));
      }
      setLoading(false);
    });
  }, [jobId]);

  const addRequirement = () => {
    setDirty(true);
    setRequirements([...requirements, { skillId: skills[0]?.id || 0, isMandatory: true, minYears: 0 }]);
  };

  const updateReq = (idx: number, field: string, value: any) => {
    setDirty(true);
    const updated = [...requirements];
    updated[idx] = { ...updated[idx], [field]: value };
    setRequirements(updated);
  };

  const addDocType = () => {
    setDirty(true);
    setDocTypes([...docTypes, { docType: 'CERTIFICATE', label: '', required: false }]);
  };

  const updateDoc = (idx: number, field: string, value: any) => {
    setDirty(true);
    const updated = [...docTypes];
    updated[idx] = { ...updated[idx], [field]: value };
    setDocTypes(updated);
  };

  const toggleCommunity = (id: number) => {
    setDirty(true);
    setSelectedCommunities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.length === 0) { toast({ title: 'Validation Error', description: 'Add at least one skill requirement', variant: 'error' }); return; }
    if (selectedCommunities.length === 0) { toast({ title: 'Validation Error', description: 'Select at least one eligible community', variant: 'error' }); return; }
    setSaving(true);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        requirements,
        eligibleCommunities: selectedCommunities,
        requiredDocTypes: docTypes.filter(d => d.docType),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setDirty(false);
      toast({ title: 'Success', description: 'Job updated successfully', variant: 'success' });
    } else {
      toast({ title: 'Error', description: data.error || 'Failed to update job', variant: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  const textareaClass = `${inputClass} resize-none`;

  return (
    <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <NotificationBell role={user?.role} />
      <div className="mb-4">
        <Link href="/hr/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={16} /> Back to Jobs
        </Link>
      </div>
      <PageHeader title="Edit Job Posting" subtitle={`Modifying: ${form.title}`} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            Basic Information
          </h2>
          <div>
            <label className={labelClass}>Job Title *</label>
            <input type="text" required value={form.title} onChange={e => { setDirty(true); setForm({ ...form, title: e.target.value }); }}
              className={inputClass} placeholder="e.g. Underground Mine Operator" />
          </div>
          <div>
            <label className={labelClass}>Job Description *</label>
            <textarea required aria-required="true" rows={3} value={form.description} onChange={e => { setDirty(true); setForm({ ...form, description: e.target.value }); }}
              className={textareaClass} placeholder="Overview of the role..." />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Scope of Work *</label>
              <textarea required aria-required="true" rows={4} value={form.scope} onChange={e => { setDirty(true); setForm({ ...form, scope: e.target.value }); }}
                className={textareaClass} />
            </div>
            <div>
              <label className={labelClass}>Responsibilities *</label>
              <textarea required aria-required="true" rows={4} value={form.responsibilities} onChange={e => { setDirty(true); setForm({ ...form, responsibilities: e.target.value }); }}
                className={textareaClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Min. Experience (years) *</label>
              <input type="number" min={0} max={40} required value={form.minExperience}
                onChange={e => { setDirty(true); setForm({ ...form, minExperience: parseInt(e.target.value) || 0 }); }}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Application Deadline</label>
              <input type="date" value={form.applicationDeadline}
                onChange={e => { setDirty(true); setForm({ ...form, applicationDeadline: e.target.value }); }}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Job Status</label>
              <select value={form.status} onChange={e => { setDirty(true); setForm({ ...form, status: e.target.value }); }}
                className={`${inputClass} bg-white font-medium`}>
                <option value="DRAFT">Draft (Internal Only)</option>
                <option value="OPEN">Open (Live & Matching)</option>
                <option value="CLOSED">Closed (Archived)</option>
                <option value="FILLED">Filled (Completed)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skill requirements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Required Skills</h2>
            <button type="button" onClick={addRequirement}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-wider">
              Add Skill
            </button>
          </div>
          <div className="space-y-3">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <select value={req.skillId} onChange={e => updateReq(idx, 'skillId', parseInt(e.target.value))}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {skills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Min. Exp:</span>
                  <input type="number" min={0} value={req.minYears}
                    onChange={e => updateReq(idx, 'minYears', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={req.isMandatory}
                    onChange={e => updateReq(idx, 'isMandatory', e.target.checked)} className="rounded text-blue-600" />
                  Mandatory
                </label>
                <button type="button" onClick={() => { setDirty(true); setRequirements(requirements.filter((_, i) => i !== idx)); }}
                  className="text-red-400 hover:text-red-600 p-1 ml-auto">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible communities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Eligible Host Communities</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {communities.map((c: any) => (
              <label key={c.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCommunities.includes(c.id)
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'
                }`}>
                <input type="checkbox" checked={selectedCommunities.includes(c.id)}
                  onChange={() => toggleCommunity(c.id)} className="rounded text-blue-600" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{c.region}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Required documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Required Documents</h2>
            <button type="button" onClick={addDocType}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-wider">
              Add Document
            </button>
          </div>
          <div className="space-y-3">
            {docTypes.map((doc, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <select value={doc.docType} onChange={e => updateDoc(idx, 'docType', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="CV_RESUME">CV / Resume</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="LICENSE">Licence</option>
                  <option value="SUPPORTING_DOC">Supporting Doc</option>
                  <option value="OTHER">Other</option>
                </select>
                <input type="text" value={doc.label}
                  onChange={e => updateDoc(idx, 'label', e.target.value)}
                  placeholder="Document label (e.g. Blasting Certificate)"
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={doc.required}
                    onChange={e => updateDoc(idx, 'required', e.target.checked)} className="rounded text-blue-600" />
                  Required
                </label>
                <button type="button" onClick={() => { setDirty(true); setDocTypes(docTypes.filter((_, i) => i !== idx)); }}
                  className="text-red-400 hover:text-red-600 p-1 ml-auto">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 justify-end pt-4">
          <Link href="/hr/jobs"
            className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving} aria-busy={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving Changes...' : 'Save Updates'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
