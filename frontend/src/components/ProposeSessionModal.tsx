'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, BookOpen, Clock, Video, MapPin, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface ProposeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedTeacherId?: string | null;
  preselectedTeacherName?: string | null;
  friends: any[];
}

export function ProposeSessionModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedTeacherId,
  preselectedTeacherName,
  friends,
}: ProposeSessionModalProps) {
  const [teacherId, setTeacherId] = useState(preselectedTeacherId || '');
  const [skillName, setSkillName] = useState('');
  const [topic, setTopic] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [format, setFormat] = useState<'VIRTUAL' | 'IN_PERSON'>('VIRTUAL');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedTeacherId) {
      setTeacherId(preselectedTeacherId);
    } else if (friends.length > 0 && !teacherId) {
      setTeacherId(friends[0].friend.id);
    }
  }, [preselectedTeacherId, friends, teacherId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teacherId) {
      setError('Please select a teacher partner.');
      return;
    }
    if (!skillName.trim()) {
      setError('Please specify the skill.');
      return;
    }
    if (!topic.trim()) {
      setError('Please provide a session topic.');
      return;
    }
    if (!scheduledAt) {
      setError('Please select a scheduled date and time.');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      setError('Scheduled date must be in the future.');
      return;
    }

    setLoading(true);
    try {
      await api.learningSessions.create({
        teacherId,
        skillName: skillName.trim(),
        topic: topic.trim(),
        scheduledAt: scheduledDate.toISOString(),
        durationMins: Number(durationMins),
        format,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create learning session');
    } finally {
      setLoading(false);
    }
  };

  // Min datetime for HTML input (current time in local ISO-like string YYYY-MM-DDTHH:mm)
  const nowIso = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-300 dark:shadow-indigo-950">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Propose Learning Session</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Book a peer knowledge exchange session</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teacher Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Teacher / Partner
            </label>
            {preselectedTeacherId && preselectedTeacherName ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white">
                {preselectedTeacherName}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You must connect with friends in Discover Peers first before proposing sessions.
              </p>
            ) : (
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {friends.map((f) => (
                  <option key={f.friend.id} value={f.friend.id}>
                    {f.friend.profile?.displayName || f.friend.id} ({f.friend.profile?.institution || 'Student'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Skill & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Skill
              </label>
              <input
                type="text"
                placeholder="e.g. Python, Figma, React"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (minutes)
              </label>
              <select
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
                <option value={120}>120 mins</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topic / Agenda
            </label>
            <input
              type="text"
              placeholder="e.g. Data visualization with Pandas & Matplotlib"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                min={nowIso}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="VIRTUAL">Virtual (Zoom / Meet)</option>
                <option value="IN_PERSON">In-Person (Campus Library)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {format === 'VIRTUAL' ? 'Meeting Link (Optional)' : 'Location (Optional)'}
            </label>
            <input
              type="text"
              placeholder={format === 'VIRTUAL' ? 'e.g. https://meet.google.com/xyz' : 'e.g. Science Library Room 302'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="What specifically would you like to achieve in this session?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !teacherId}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Propose Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
