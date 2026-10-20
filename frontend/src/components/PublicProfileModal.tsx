'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  BookOpen,
  MapPin,
  Calendar,
  Star,
  UserPlus,
  MessageSquare,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { SkillsBadges } from './SkillsBadges';
import { SocialLinksView } from './SocialLinksView';

interface PublicProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onOpenChatWith?: (userId: string) => void;
}

export function PublicProfileModal({ userId, onClose, onOpenChatWith }: PublicProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setRequestSent(false);

    api.users.getPublicProfile(userId)
      .then((data) => setStudent(data))
      .catch((err) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  const handleSendFriendRequest = async () => {
    if (!currentUser) {
      alert('Please sign in to send a connection request.');
      return;
    }
    setRequestLoading(true);
    try {
      await api.friends.sendRequest(userId);
      setRequestSent(true);
    } catch (err: any) {
      alert(err.message || 'Could not send friend request.');
    } finally {
      setRequestLoading(false);
    }
  };

  const isMe = currentUser?.id === userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading student profile...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          </div>
        ) : student?.isPrivate ? (
          <div className="py-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {student.profile?.displayName || 'Private Profile'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              This student has set their SkillSwap profile to private. Only connected friends may view details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header / Avatar */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar
                  name={student.profile?.displayName || 'Student'}
                  url={student.profile?.avatarUrl}
                  size="xl"
                />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {student.profile?.displayName || 'Student'}
                  </h2>
                  {student.profile?.headline && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                      {student.profile.headline}
                    </p>
                  )}
                  {student.profile?.institution && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <School className="w-3.5 h-3.5" />
                      {student.profile.institution} {student.profile.major && `• ${student.profile.major}`}
                    </p>
                  )}
                </div>
              </div>

              {student.profile?.reputationScore && (
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{student.profile.reputationScore.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Quick Details */}
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              {student.profile?.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{student.profile.location}</span>
                </div>
              )}
              {student.profile?.availability && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>{student.profile.availability}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {student.profile?.bio && (
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">About:</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {student.profile.bio}
                </p>
              </div>
            )}

            {/* Social Links */}
            {student.socialLinks && student.socialLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Connect Externally:</h4>
                <SocialLinksView links={student.socialLinks} />
              </div>
            )}

            {/* Skills */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Teaches:</h4>
                <SkillsBadges skills={student.skills || []} type="TEACH" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Wants to Learn:</h4>
                <SkillsBadges skills={student.skills || []} type="LEARN" />
              </div>
            </div>

            {/* Actions */}
            {!isMe && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendFriendRequest}
                  disabled={requestSent || requestLoading}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm ${
                    requestSent
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-950'
                  }`}
                >
                  {requestLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : requestSent ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Request Sent
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Connect / Friend Request
                    </>
                  )}
                </button>

                {onOpenChatWith && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChatWith(userId);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
