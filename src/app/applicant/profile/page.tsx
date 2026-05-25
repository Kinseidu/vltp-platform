'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { Plus, Save, Trash2, Camera, Loader2 } from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { SkeletonForm } from '@/components/shared/Skeleton';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';

const PROFICIENCY_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'EXPERT'];

export default function ApplicantProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const toast = useToast();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);

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
      const p = { ...profileData.data.profile, avatarUrl: profileData.data.avatarUrl };
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
    const res = await fetch('/api/profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: 'Error', description: data.error || 'Failed to save profile', variant: 'error' });
      setSavingProfile(false);
      return;
    }
    setDirty(false);
    toast({ title: 'Success', description: 'Profile updated successfully.', variant: 'success' });
    await fetchAll();
    setSavingProfile(false);
  };

  const addSkill = async () => {
    if (!newSkill.skillId) return;
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
      toast({ title: 'Error', description: data.error || 'Failed to add skill', variant: 'error' });
      return;
    }
    setNewSkill({ skillId: '', yearsOfExp: '0', proficiency: 'BEGINNER', notes: '' });
    await fetchAll();
  };

  const deleteSkill = async (id: number) => {
    const res = await fetch(`/api/profile/skills/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: 'Error', description: data.error || 'Failed to remove skill', variant: 'error' });
      return;
    }
    await fetchAll();
  };

  const addExperience = async () => {
    if (!newExperience.jobTitle || !newExperience.employer || !newExperience.startDate) return;
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
      toast({ title: 'Error', description: data.error || 'Failed to add experience', variant: 'error' });
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
    const res = await fetch(`/api/profile/experience/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: 'Error', description: data.error || 'Failed to remove experience', variant: 'error' });
      return;
    }
    await fetchAll();
  };

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <SkeletonForm />
      </DashboardLayout>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to upload avatar', variant: 'error' });
      } else {
        await fetchAll();
      }
    } catch {
      toast({ title: 'Error', description: 'Network error uploading avatar', variant: 'error' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: 'Error', description: data.error || 'Failed to remove avatar', variant: 'error' });
    } else {
      await fetchAll();
    }
  };

  if (!user || !profile) {
    if (typeof window !== 'undefined') window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={profile.fullName || user.email} userEmail={user.email}>
      <NotificationBell />
      <PageHeader
        title="My Profile"
        subtitle={`Community: ${profile.community?.name || 'N/A'} · Verification: ${profile.verificationStatus}`}
        action={
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Basic information</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-full-name" className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
                <input id="profile-full-name" value={profileForm.fullName} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, fullName: e.target.value })); }} placeholder="e.g. Kwame Asante" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="profile-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number</label>
                <input id="profile-phone" value={profileForm.phone} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, phone: e.target.value })); }} placeholder="+233 24 000 0000" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="profile-dob" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date of birth</label>
                <input id="profile-dob" type="date" value={profileForm.dateOfBirth} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="profile-gender" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <input id="profile-gender" value={profileForm.gender} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, gender: e.target.value })); }} placeholder="Male, Female, Other" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profile-highest-education" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Highest education</label>
                <input id="profile-highest-education" value={profileForm.highestEducation} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, highestEducation: e.target.value })); }} placeholder="e.g. Diploma in Mining Technology" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profile-bio" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Short bio</label>
                <textarea id="profile-bio" value={profileForm.bio} onChange={e => { setDirty(true); setProfileForm(prev => ({ ...prev, bio: e.target.value })); }} placeholder="Tell us about your experience and strengths" rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Skills</h3>
            <div className="space-y-2 mb-4">
              {(profile.skills || []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.skill?.name}</div>
                    <div className="text-xs text-gray-500">{s.yearsOfExp} years · {s.proficiency}</div>
                  </div>
                  <button onClick={() => deleteSkill(s.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {(profile.skills || []).length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No skills added yet.</p>}
            </div>

            <div className="grid md:grid-cols-4 gap-2">
              <select value={newSkill.skillId} onChange={e => setNewSkill(prev => ({ ...prev, skillId: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm">
                <option value="">Select skill</option>
                {availableSkills.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" min={0} max={50} value={newSkill.yearsOfExp} onChange={e => setNewSkill(prev => ({ ...prev, yearsOfExp: e.target.value }))} placeholder="Years" className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <select value={newSkill.proficiency} onChange={e => setNewSkill(prev => ({ ...prev, proficiency: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm">
                {PROFICIENCY_OPTIONS.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
              <button onClick={addSkill} className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Work Experience</h3>
            <div className="space-y-2 mb-4">
              {(profile.workExperiences || []).map((w: any) => (
                <div key={w.id} className="flex items-start justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{w.jobTitle} · {w.employer}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(w.startDate).toLocaleDateString()} - {w.endDate ? new Date(w.endDate).toLocaleDateString() : 'Present'}
                    </div>
                    {w.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{w.description}</p>}
                  </div>
                  <button onClick={() => deleteExperience(w.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {(profile.workExperiences || []).length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No work experience added yet.</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <input value={newExperience.jobTitle} onChange={e => setNewExperience(prev => ({ ...prev, jobTitle: e.target.value }))} placeholder="Job title" className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <input value={newExperience.employer} onChange={e => setNewExperience(prev => ({ ...prev, employer: e.target.value }))} placeholder="Employer" className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <input value={newExperience.industry} onChange={e => setNewExperience(prev => ({ ...prev, industry: e.target.value }))} placeholder="Industry (optional)" className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <input value={newExperience.location} onChange={e => setNewExperience(prev => ({ ...prev, location: e.target.value }))} placeholder="Location (optional)" className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <input type="date" value={newExperience.startDate} onChange={e => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm" />
              <input type="date" disabled={newExperience.isCurrent} value={newExperience.endDate} onChange={e => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700" />
              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={newExperience.isCurrent} onChange={e => setNewExperience(prev => ({ ...prev, isCurrent: e.target.checked }))} />
                I currently work here
              </label>
              <textarea value={newExperience.description} onChange={e => setNewExperience(prev => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Description (optional)" className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm resize-none" />
              <button onClick={addExperience} className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg py-2.5">
                <Plus size={14} /> Add experience
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="relative group">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                    <Camera size={28} className="text-blue-500" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white p-1 hover:bg-white/20 rounded"
                    title="Upload photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {uploadingAvatar && <Loader2 size={14} className="animate-spin text-blue-600 mt-2" />}
              <p className="text-sm font-medium text-gray-900 mt-2">{profile.fullName}</p>
              <p className="text-xs text-gray-500">{profile.user?.email}</p>
              {profile.avatarStoragePath && (
                <button onClick={handleRemoveAvatar} className="text-xs text-red-500 hover:underline mt-1">
                  Remove photo
                </button>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Verification status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.verificationStatus}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Update skills and experience before requesting verification.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Community</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.community?.name || 'N/A'}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
