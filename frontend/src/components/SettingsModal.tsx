'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Shield,
  Bell,
  Key,
  Info,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, settings, updateSettings, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<'appearance' | 'privacy' | 'notifications' | 'security' | 'info'>('appearance');

  // Privacy State
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [showSocialLinks, setShowSocialLinks] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showInstitution, setShowInstitution] = useState(true);
  const [showAvailability, setShowAvailability] = useState(true);

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [friendRequestNotifications, setFriendRequestNotifications] = useState(true);
  const [sessionNotifications, setSessionNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setIsProfilePublic(settings.isProfilePublic ?? true);
      setShowSocialLinks(settings.showSocialLinks ?? true);
      setShowEmail(settings.showEmail ?? false);
      setShowInstitution(settings.showInstitution ?? true);
      setShowAvailability(settings.showAvailability ?? true);
      setEmailNotifications(settings.emailNotifications ?? true);
      setFriendRequestNotifications(settings.friendRequestNotifications ?? true);
      setSessionNotifications(settings.sessionNotifications ?? true);
      setChatNotifications(settings.chatNotifications ?? true);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSavePrivacy = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      await updateSettings({
        isProfilePublic,
        showSocialLinks,
        showEmail,
        showInstitution,
        showAvailability,
      });
      setFeedback({ type: 'success', message: 'Privacy preferences updated!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update privacy settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      await updateSettings({
        emailNotifications,
        friendRequestNotifications,
        sessionNotifications,
        chatNotifications,
      });
      setFeedback({ type: 'success', message: 'Notification preferences updated!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setSaving(true);
    try {
      await api.users.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password updated! Please log in again.' });
      setTimeout(() => {
        logout();
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Password change failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (confirm('Are you sure you want to deactivate your SkillSwap student account?')) {
      try {
        await api.users.deleteAccount();
        alert('Account deactivated. Logging out.');
        logout();
        onClose();
      } catch (err: any) {
        alert(err.message || 'Failed to deactivate account.');
      }
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

        {/* Modal Title */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Account Settings</h2>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
          <button
            onClick={() => {
              setActiveSection('appearance');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeSection === 'appearance'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Appearance
          </button>
          <button
            onClick={() => {
              setActiveSection('privacy');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeSection === 'privacy'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Privacy
          </button>
          <button
            onClick={() => {
              setActiveSection('notifications');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeSection === 'notifications'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Notifications
          </button>
          <button
            onClick={() => {
              setActiveSection('security');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeSection === 'security'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Security
          </button>
          <button
            onClick={() => {
              setActiveSection('info');
              setFeedback(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeSection === 'info'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" /> Info
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

        {/* SECTION A: APPEARANCE */}
        {activeSection === 'appearance' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Theme Preference</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select how SkillSwap appears on your device. Changes are persisted locally and synced to your profile.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setTheme('LIGHT');
                  await updateSettings({ theme: 'LIGHT' });
                }}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  theme === 'LIGHT'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">Light</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setTheme('DARK');
                  await updateSettings({ theme: 'DARK' });
                }}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  theme === 'DARK'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Dark</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setTheme('SYSTEM');
                  await updateSettings({ theme: 'SYSTEM' });
                }}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  theme === 'SYSTEM'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Laptop className="w-5 h-5 text-slate-500" />
                <span className="text-xs">System</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION B: PRIVACY */}
        {activeSection === 'privacy' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile & Visibility Controls</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure which details are visible to other students in Discover Peers and public search.
            </p>

            <div className="space-y-3 pt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Public Profile Visibility</p>
                  <p className="text-slate-500">Allow other students to discover your profile in search</p>
                </div>
                <input
                  type="checkbox"
                  checked={isProfilePublic}
                  onChange={(e) => setIsProfilePublic(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Show Social Media Links</p>
                  <p className="text-slate-500">Display your GitHub, LinkedIn & Portfolio on your public card</p>
                </div>
                <input
                  type="checkbox"
                  checked={showSocialLinks}
                  onChange={(e) => setShowSocialLinks(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Display College / Institution</p>
                  <p className="text-slate-500">Show your university or campus on public cards</p>
                </div>
                <input
                  type="checkbox"
                  checked={showInstitution}
                  onChange={(e) => setShowInstitution(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Display Availability Hours</p>
                  <p className="text-slate-500">Show when you are available for learning sessions</p>
                </div>
                <input
                  type="checkbox"
                  checked={showAvailability}
                  onChange={(e) => setShowAvailability(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Show Email to Public</p>
                  <p className="text-slate-500">Recommended OFF to protect your student privacy</p>
                </div>
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={(e) => setShowEmail(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleSavePrivacy}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Privacy Settings
              </button>
            </div>
          </div>
        )}

        {/* SECTION C: NOTIFICATIONS */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose which in-app updates and alerts you wish to receive.
            </p>

            <div className="space-y-3 pt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Friend Request Alerts</p>
                  <p className="text-slate-500">Notify when another student invites you to connect</p>
                </div>
                <input
                  type="checkbox"
                  checked={friendRequestNotifications}
                  onChange={(e) => setFriendRequestNotifications(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Learning Session Bookings</p>
                  <p className="text-slate-500">Alerts when sessions are proposed, accepted, or rescheduled</p>
                </div>
                <input
                  type="checkbox"
                  checked={sessionNotifications}
                  onChange={(e) => setSessionNotifications(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Chat Session Inactivity Warnings</p>
                  <p className="text-slate-500">Receive 5-minute timeout warnings before chat sessions lock</p>
                </div>
                <input
                  type="checkbox"
                  checked={chatNotifications}
                  onChange={(e) => setChatNotifications(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleSaveNotifications}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Notification Settings
              </button>
            </div>
          </div>
        )}

        {/* SECTION D: SECURITY */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Change Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requires your existing password. Hashed securely with Argon2id on the backend.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password * (min. 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !currentPassword || !newPassword}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-xl text-xs font-semibold transition"
              >
                Update Password
              </button>
            </form>

            {/* Account Deactivation */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-rose-600 mb-1">Deactivate Account</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Temporarily deactivates your SkillSwap profile and terminates active sessions.
              </p>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                className="px-4 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl transition"
              >
                Deactivate My Account
              </button>
            </div>
          </div>
        )}

        {/* SECTION E: INFO */}
        {activeSection === 'info' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Information</h3>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-500">Account Role:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-500">Account ID:</span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">{user?.id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Verification Status:</span>
                <span className="text-emerald-600 font-semibold">Active & Verified</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
