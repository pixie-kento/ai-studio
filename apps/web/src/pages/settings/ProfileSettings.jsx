import { useState, useEffect, useRef } from 'react';
import { Loader2, Save, Upload, Eye, EyeOff, User } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore.js';
import api from '../../lib/api.js';

export default function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ display_name: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (user) {
      setForm({ display_name: user.display_name || '', email: user.email || '' });
    }
  }, [user]);

  const updateForm = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const updatePw = (k, v) => setPasswords(p => ({ ...p, [k]: v }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('display_name', form.display_name);
      if (avatarFile) formData.append('avatar', avatarFile);
      const { data } = await api.patch('/api/auth/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data);
      setDirty(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.next !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch {
      toast.error('Failed to change password. Check your current password.');
    } finally {
      setSavingPw(false);
    }
  };

  const avatarUrl = avatarPreview || (user?.avatar ? `${import.meta.env.VITE_PB_URL}/api/files/users/${user.id}/${user.avatar}?thumb=128x128` : null);
  const initials = (user?.display_name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Profile Settings</h1>

      {/* Profile card */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900">Your Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-brand-purple/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-2xl font-black text-brand-purple">{initials}</span>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Profile Photo</p>
            <button type="button" onClick={() => fileRef.current.click()} className="btn-secondary text-sm">
              <Upload size={14} /> Upload Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
          </div>
        </div>

        <div>
          <label className="label">Display Name</label>
          <input
            value={form.display_name}
            onChange={e => updateForm('display_name', e.target.value)}
            className="input"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            value={form.email}
            disabled
            className="input bg-slate-50 text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
          <User size={16} className="text-slate-400" />
          <span>
            Platform role: <span className="font-semibold capitalize">{user?.platform_role || 'user'}</span>
          </span>
        </div>

        {dirty && (
          <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        )}
      </div>

      {/* Password card */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900">Change Password</h2>

        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={passwords.current}
              onChange={e => updatePw('current', e.target.value)}
              className="input pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">New Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={passwords.next}
            onChange={e => updatePw('next', e.target.value)}
            className="input"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={passwords.confirm}
            onChange={e => updatePw('confirm', e.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPw || !passwords.current || !passwords.next || !passwords.confirm}
          className="btn-primary"
        >
          {savingPw ? <Loader2 size={16} className="animate-spin" /> : null}
          Change Password
        </button>
      </div>
    </div>
  );
}
