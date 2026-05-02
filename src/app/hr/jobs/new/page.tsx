// src/app/hr/jobs/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { Plus, Trash2, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewJobPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', scope: '', responsibilities: '',
    minExperience: 0, applicationDeadline: '', status: 'DRAFT',
  });
  const [requirements, setRequirements] = useState<{ skillId: number; isMandatory: boolean; minYears: number }[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<number[]>([]);
  const [docTypes, setDocTypes] = useState<{ docType: string; label: string; required: boolean }[]>([
    { docType: 'CV_RESUME', label: 'CV / Resume', required: true },
  ]);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
      fetch('/api/admin/communities').then(r => r.json()),
    ]).then(([u, s, c]) => {
      if (u.success) setUser(u.data.user);
      if (s.success) setSkills(s.data.skills || []);
      if (c.success) setCommunities(c.data.communities || []);
    });
  }, []);

  const addRequirement = () =>
    setRequirements([...requirements, { skillId: skills[0]?.id || 0, isMandatory: true, minYears: 0 }]);

  const updateReq = (idx: number, field: string, value: any) => {
    const updated = [...requirements];
    updated[idx] = { ...updated[idx], [field]: value };
    setRequirements(updated);
  };

  const addDocType = () =>
    setDocTypes([...docTypes, { docType: 'CERTIFICATE', label: '', required: false }]);

  const updateDoc = (idx: number, field: string, value: any) => {
    const updated = [...docTypes];
    updated[idx] = { ...updated[idx], [field]: value };
    setDocTypes(updated);
  };

  const toggleCommunity = (id: number) =>
    setSelectedCommunities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.length === 0) { setError('Add at least one skill requirement'); return; }
    if (selectedCommunities.length === 0) { setError('Select at least one eligible community'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        minExperience: Number(form.minExperience),
        requirements,
        eligibleCommunityIds: selectedCommunities,
        requiredDocTypes: docTypes.filter(d => d.label),
      }),
    });
    const data = await res.json();

    if (data.success) {
      router.push('/hr/jobs');
    } else {
      if (data.details && typeof data.details === 'object') {
        const firstDetail = Object.entries(data.details).find(
          ([, messages]) => Array.isArray(messages) && messages.length > 0
        ) as [string, string[]] | undefined;

        if (firstDetail) {
          setError(`${firstDetail[0]}: ${firstDetail[1][0]}`);
        } else {
          setError(data.error || 'Validation failed');
        }
      } else {
        setError(data.error || 'Failed to create job');
      }
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const textareaClass = `${inputClass} resize-none`;

  return (
    <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <div className="mb-4">
        <Link href="/hr/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={16} /> Back to Jobs
        </Link>
      </div>
      <PageHeader title="Post New Job" subtitle="Define requirements, eligible communities, and required documents" />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className={labelClass}>Job Title *</label>
            <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className={inputClass} placeholder="e.g. Underground Mine Operator" />
          </div>
          <div>
            <label className={labelClass}>Job Description *</label>
            <textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className={textareaClass} placeholder="Overview of the role and its purpose..." />
          </div>
          <div>
            <label className={labelClass}>Scope of Work *</label>
            <textarea required rows={3} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
              className={textareaClass} placeholder="Detailed scope of day-to-day activities..." />
          </div>
          <div>
            <label className={labelClass}>Responsibilities *</label>
            <textarea required rows={3} value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })}
              className={textareaClass} placeholder="Key duties and responsibilities..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Min. Experience (years) *</label>
              <input type="number" min={0} max={40} required value={form.minExperience}
                onChange={e => setForm({ ...form, minExperience: parseInt(e.target.value) || 0 })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Application Deadline</label>
              <input type="date" value={form.applicationDeadline}
                onChange={e => setForm({ ...form, applicationDeadline: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Publish Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className={`${inputClass} bg-white`}>
                <option value="DRAFT">Save as Draft</option>
                <option value="OPEN">Publish (Open)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skill requirements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Skill Requirements</h2>
            <button type="button" onClick={addRequirement}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={15} /> Add Skill
            </button>
          </div>
          {requirements.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No requirements added. Click "Add Skill" to begin.</p>
          )}
          <div className="space-y-3">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <select value={req.skillId} onChange={e => updateReq(idx, 'skillId', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {skills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
                <input type="number" min={0} max={30} value={req.minYears}
                  onChange={e => updateReq(idx, 'minYears', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min yrs" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={req.isMandatory}
                    onChange={e => updateReq(idx, 'isMandatory', e.target.checked)}
                    className="rounded" />
                  Mandatory
                </label>
                <button type="button" onClick={() => setRequirements(requirements.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible communities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Eligible Communities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {communities.map((c: any) => (
              <label key={c.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCommunities.includes(c.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="checkbox" checked={selectedCommunities.includes(c.id)}
                  onChange={() => toggleCommunity(c.id)} className="rounded" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.region}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Required documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Required Documents</h2>
            <button type="button" onClick={addDocType}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={15} /> Add Document
            </button>
          </div>
          <div className="space-y-3">
            {docTypes.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <select value={doc.docType} onChange={e => updateDoc(idx, 'docType', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="CV_RESUME">CV / Resume</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="LICENSE">Licence</option>
                  <option value="SUPPORTING_DOC">Supporting Doc</option>
                  <option value="OTHER">Other</option>
                </select>
                <input type="text" value={doc.label}
                  onChange={e => updateDoc(idx, 'label', e.target.value)}
                  placeholder="Label (e.g. Valid Blasting Certificate)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={doc.required}
                    onChange={e => updateDoc(idx, 'required', e.target.checked)} className="rounded" />
                  Required
                </label>
                {idx > 0 && (
                  <button type="button" onClick={() => setDocTypes(docTypes.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link href="/hr/jobs"
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Saving...' : form.status === 'OPEN' ? 'Publish Job' : 'Save Draft'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
