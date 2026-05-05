'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { AppSpinner } from '@/components/shared/AppSpinner';

const PROFICIENCY_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'EXPERT'];

export default function ApplicantProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState('');

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    bio: '',
    dateOfBirth: '',
    gender: '',
    highestEducation: '',
  });

  const [newSkill, setNewSkill] = useState({ skillId: '', yearsOfExp: '0', proficiency: 'BEGINNER', notes: '' });
  const [newExperience, setNewExperience] = useState({
    jobTitle: '',
    employer: '',
    industry: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    location: '',
  });

  const fetchAll = async () => {
    const [meRes, profileRes, skillsRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/profile/me'),
      fetch('/api/skills'),
    ]);
    const meData = await meRes.json();
    const profileData = await profileRes.json();
    const skillsData = await skillsRes.json();

    if (meData.success) setUser(meData.data.user);
    if (profileData.success) {
      const p = profileData.data.profile;
      setProfile(p);
      setProfileForm({
        fullName: p.fullName || '',
        phone: p.user?.phone || '',
        bio: p.bio || '',
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: p.gender || '',
        highestEducation: p.highestEducation || '',
      });
    }
    if (skillsData.success) setAllSkills(skillsData.data.skills || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const availableSkills = useMemo(() => {
    const selected = new Set((profile?.skills || []).map((s: any) => s.skillId));
    return allSkills.filter((s: any) => !selected.has(s.id));
  }, [allSkills, profile]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setMessage('');
    const res = await fetch('/api/profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || 'Failed to save profile');
      setSavingProfile(false);
      return;
    }
    setMessage('Profile updated successfully.');
    await fetchAll();
    setSavingProfile(false);
  };

  const addSkill = async () => {
    if (!newSkill.skillId) return;
    setMessage('');
    const res = await fetch('/api/profile/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillId: parseInt(newSkill.skillId, 10),
        yearsOfExp: parseInt(newSkill.yearsOfExp, 10) || 0,
        proficiency: newSkill.proficiency,
        notes: newSkill.notes || undefined,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || 'Failed to add skill');
      return;
    }
    setNewSkill({ skillId: '', yearsOfExp: '0', proficiency: 'BEGINNER', notes: '' });
    await fetchAll();
  };

  const deleteSkill = async (id: number) => {
    setMessage('');
    const res = await fetch(`/api/profile/skills/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || 'Failed to remove skill');
      return;
    }
    await fetchAll();
  };

  const addExperience = async () => {
    if (!newExperience.jobTitle || !newExperience.employer || !newExperience.startDate) return;
    setMessage('');
    const res = await fetch('/api/profile/experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newExperience,
        endDate: newExperience.isCurrent ? undefined : (newExperience.endDate || undefined),
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || 'Failed to add experience');
      return;
    }
    setNewExperience({
      jobTitle: '',
      employer: '',
      industry: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
      location: '',
    });
    await fetchAll();
  };

  const deleteExperience = async (id: number) => {
    setMessage('');
    const res = await fetch(`/api/profile/experience/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || 'Failed to remove experience');
      return;
    }
    await fetchAll();
  };

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !profile) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={profile.fullName || user.email} userEmail={user.email}>
      <PageHeader
        title="My Profile"
        subtitle={`Community: ${profile.community?.name || 'N/A'} · Verification: ${profile.verificationStatus}`}
        action={
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Save size={14} />
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        }
      />

      {message && <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">{message}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Basic information</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={profileForm.fullName} onChange={e => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))} placeholder="Full name" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={profileForm.phone} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" value={profileForm.dateOfBirth} onChange={e => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={profileForm.gender} onChange={e => setProfileForm(prev => ({ ...prev, gender: e.target.value }))} placeholder="Gender" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={profileForm.highestEducation} onChange={e => setProfileForm(prev => ({ ...prev, highestEducation: e.target.value }))} placeholder="Highest education" className="px-3 py-2 border border-gray-300 rounded-lg text-sm md:col-span-2" />
              <textarea value={profileForm.bio} onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))} placeholder="Short bio" rows={3} className="px-3 py-2 border border-gray-300 rounded-lg text-sm md:col-span-2 resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Skills</h3>
            <div className="space-y-2 mb-4">
              {(profile.skills || []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-2.5">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.skill?.name}</div>
                    <div className="text-xs text-gray-500">{s.yearsOfExp} years · {s.proficiency}</div>
                  </div>
                  <button onClick={() => deleteSkill(s.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {(profile.skills || []).length === 0 && <p className="text-sm text-gray-500">No skills added yet.</p>}
            </div>

            <div className="grid md:grid-cols-4 gap-2">
              <select value={newSkill.skillId} onChange={e => setNewSkill(prev => ({ ...prev, skillId: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select skill</option>
                {availableSkills.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" min={0} max={50} value={newSkill.yearsOfExp} onChange={e => setNewSkill(prev => ({ ...prev, yearsOfExp: e.target.value }))} placeholder="Years" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={newSkill.proficiency} onChange={e => setNewSkill(prev => ({ ...prev, proficiency: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {PROFICIENCY_OPTIONS.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
              <button onClick={addSkill} className="inline-flex items-center justify-center gap-1 bg-gray-900 hover:bg-black text-white text-sm rounded-lg">
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Work Experience</h3>
            <div className="space-y-2 mb-4">
              {(profile.workExperiences || []).map((w: any) => (
                <div key={w.id} className="flex items-start justify-between border border-gray-200 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{w.jobTitle} · {w.employer}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(w.startDate).toLocaleDateString()} - {w.endDate ? new Date(w.endDate).toLocaleDateString() : 'Present'}
                    </div>
                    {w.description && <p className="text-xs text-gray-600 mt-1">{w.description}</p>}
                  </div>
                  <button onClick={() => deleteExperience(w.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {(profile.workExperiences || []).length === 0 && <p className="text-sm text-gray-500">No work experience added yet.</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <input value={newExperience.jobTitle} onChange={e => setNewExperience(prev => ({ ...prev, jobTitle: e.target.value }))} placeholder="Job title" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={newExperience.employer} onChange={e => setNewExperience(prev => ({ ...prev, employer: e.target.value }))} placeholder="Employer" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={newExperience.industry} onChange={e => setNewExperience(prev => ({ ...prev, industry: e.target.value }))} placeholder="Industry (optional)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={newExperience.location} onChange={e => setNewExperience(prev => ({ ...prev, location: e.target.value }))} placeholder="Location (optional)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" value={newExperience.startDate} onChange={e => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" disabled={newExperience.isCurrent} value={newExperience.endDate} onChange={e => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100" />
              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={newExperience.isCurrent} onChange={e => setNewExperience(prev => ({ ...prev, isCurrent: e.target.checked }))} />
                I currently work here
              </label>
              <textarea value={newExperience.description} onChange={e => setNewExperience(prev => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Description (optional)" className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
              <button onClick={addExperience} className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-gray-900 hover:bg-black text-white text-sm rounded-lg py-2.5">
                <Plus size={14} /> Add experience
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Verification status</h3>
            <p className="text-sm text-gray-600">{profile.verificationStatus}</p>
            <p className="text-xs text-gray-500 mt-2">Update skills and experience before requesting verification.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Community</h3>
            <p className="text-sm text-gray-600">{profile.community?.name || 'N/A'}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
