'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Edit3,
  Link as LinkIcon,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  School,
  MapPin,
  Calendar,
  Sparkles,
  Save,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Avatar } from './Avatar';
import { SkillsBadges } from './SkillsBadges';
import { SocialLinksView } from './SocialLinksView';

interface ProfileModalProps {
  isOpen: boolean;
  initialTab?: 'view' | 'edit' | 'social' | 'skills';
  onClose: () => void;
}

export function ProfileModal({ isOpen, initialTab = 'view', onClose }: ProfileModalProps) {
  const { user, profile, socialLinks, skills, completeness, updateProfile, addSocialLink, deleteSocialLink, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'social' | 'skills'>(initialTab);

  // Edit Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [institution, setInstitution] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [availability, setAvailability] = useState('');
  const [preferredFormat, setPreferredFormat] = useState('VIRTUAL');

  // Social Link Form State
  const [platform, setPlatform] = useState('LINKEDIN');
  const [socialUrl, setSocialUrl] = useState('');

  // Skill Form State
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'TEACH' | 'LEARN'>('TEACH');
  const [proficiency, setProficiency] = useState('INTERMEDIATE');

  // UI state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setHeadline(profile.headline || '');
      setInstitution(profile.institution || '');
      setMajor(profile.major || '');
      setGraduationYear(profile.graduationYear || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setPortfolioUrl(profile.portfolioUrl || '');
      setAvailability(profile.availability || '');
      setPreferredFormat(profile.preferredFormat || 'VIRTUAL');
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        headline: headline || undefined,
        institution: institution || undefined,
        major: major || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        location: location || undefined,
        bio: bio || undefined,
        portfolioUrl: portfolioUrl || undefined,
        availability: availability || undefined,
        preferredFormat,
      });
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialUrl.trim()) return;
    setFeedback(null);
    setSaving(true);
    try {
      await addSocialLink({ platform, url: socialUrl.trim() });
      setSocialUrl('');
      setFeedback({ type: 'success', message: `${platform} link saved!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add link' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    setFeedback(null);
    try {
      await deleteSocialLink(id);
      setFeedback({ type: 'success', message: 'Social link removed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete link' });
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setFeedback(null);
    setSaving(true);
    try {
      await api.skills.addSkill({
        skillName: skillName.trim(),
        type: skillType,
        proficiencyLevel: proficiency,
      });
      setSkillName('');
      await refreshUser();
      setFeedback({ type: 'success', message: `Skill "${skillName}" added!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add skill' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (id: string) => {
    setFeedback(null);
    try {
      await api.skills.removeSkill(id);
      await refreshUser();
      setFeedback({ type: 'success', message: 'Skill removed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove skill' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Avatar name={profile?.displayName || 'Student'} url={profile?.avatarUrl} size="lg" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {profile?.displayName || 'My Student Profile'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* Profile Completeness Bar */}
        <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Profile Completeness
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{completeness}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
          <button
            onClick={() => {
              setActiveTab('view');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'view'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              setActiveTab('edit');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'edit'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => {
              setActiveTab('social');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'social'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Social Links ({socialLinks?.length || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab('skills');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'skills'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            My Skills ({skills?.length || 0})
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'view' && (
          <div className="space-y-5 text-xs sm:text-sm">
            {profile?.headline && (
              <p className="text-slate-600 dark:text-slate-300 font-medium italic text-sm">
                "{profile.headline}"
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  <strong>Institution:</strong> {profile?.institution || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>
                  <strong>Major:</strong> {profile?.major || 'Not specified'}
                </span>
              </div>
              {profile?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>
                    <strong>Location:</strong> {profile.location}
                  </span>
                </div>
              )}
              {profile?.availability && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>
                    <strong>Availability:</strong> {profile.availability}
                  </span>
                </div>
              )}
            </div>

            {profile?.bio && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">About Me:</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">{profile.bio}</p>
              </div>
            )}

            {/* Social Links View */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Social & Portfolio:</h4>
              {socialLinks && socialLinks.length > 0 ? (
                <SocialLinksView links={socialLinks} />
              ) : (
                <p className="text-xs text-slate-400 italic">No social links added yet.</p>
              )}
            </div>

            {/* Skills View */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Skills I Can Teach:</h4>
                <SkillsBadges skills={skills} type="TEACH" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Skills I Want to Learn:</h4>
                <SkillsBadges skills={skills} type="LEARN" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDIT PROFILE */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS Sophomore @ MIT • Python Enthusiast"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Major / Field of Study
                </label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location (City / State)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cambridge, MA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Availability
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mon/Wed evenings, Weekends"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bio / Learning Goals
              </label>
              <textarea
                rows={3}
                placeholder="Tell peers what you love working on and what you hope to learn..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-200 dark:shadow-indigo-950"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SOCIAL LINKS */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSocialLink} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add New Social or Portfolio Link
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="GITHUB">GitHub</option>
                  <option value="PORTFOLIO">Portfolio</option>
                  <option value="TWITTER">Twitter / X</option>
                  <option value="WEBSITE">Personal Website</option>
                </select>
                <div className="sm:col-span-2 flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={socialUrl}
                    onChange={(e) => setSocialUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={saving || !socialUrl.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Links:</h4>
              {socialLinks && socialLinks.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {socialLinks.map((link) => (
                    <div key={link.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{link.platform}:</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 underline truncate max-w-xs"
                        >
                          {link.url}
                        </a>
                      </div>
                      <button
                        onClick={() => handleDeleteSocialLink(link.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No social links added yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSkill} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Learning, Figma..."
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <select
                  value={skillType}
                  onChange={(e) => setSkillType(e.target.value as any)}
                  className="px-2 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option value="TEACH">I can teach</option>
                  <option value="LEARN">I want to learn</option>
                </select>
                <button
                  type="submit"
                  disabled={saving || !skillName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Add Skill
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                  Skills You Teach:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skills.filter((s) => s.type === 'TEACH').map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-xs font-medium"
                    >
                      {item.skill?.name || 'Skill'}
                      <button
                        onClick={() => handleRemoveSkill(item.id)}
                        className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-2">
                  Skills You Want to Learn:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skills.filter((s) => s.type === 'LEARN').map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-lg text-xs font-medium"
                    >
                      {item.skill?.name || 'Skill'}
                      <button
                        onClick={() => handleRemoveSkill(item.id)}
                        className="text-sky-600 hover:text-sky-900 dark:hover:text-white ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
