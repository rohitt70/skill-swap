'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  UserCheck,
  UserX,
  Check,
  X,
  Sparkles,
  MessageSquare,
  Calendar,
  Loader2,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';

interface NotificationBellProps {
  onFriendshipChanged?: () => void;
  onOpenChatWith?: (recipientId: string) => void;
}

export function NotificationBell({ onFriendshipChanged, onOpenChatWith }: NotificationBellProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests');
  const [unreadCounts, setUnreadCounts] = useState({
    unreadNotifications: 0,
    pendingFriendRequests: 0,
    total: 0,
  });
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch counts
  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const counts = await api.notifications.getUnreadCount();
      setUnreadCounts(counts);
    } catch (err) {
      // Fail silently on background poll
    }
  }, [user]);

  // Fetch detailed list data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reqs, notifs] = await Promise.all([
        api.friends.getIncoming().catch(() => []),
        api.notifications.getAll(30).catch(() => []),
      ]);
      setIncomingRequests(reqs || []);
      setNotifications(notifs || []);
      // Update counts based on fresh lists
      const pendingReqCount = reqs?.length || 0;
      const unreadNotifCount = notifs?.filter((n: any) => !n.isRead).length || 0;
      setUnreadCounts({
        unreadNotifications: unreadNotifCount,
        pendingFriendRequests: pendingReqCount,
        total: pendingReqCount + unreadNotifCount,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Poll for counts periodically (every 15s)
  useEffect(() => {
    if (!user) return;
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [user, fetchCounts]);

  // When dropdown opens, fetch fresh data
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchData();
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    setActionInProgressId(requestId);
    try {
      await api.friends.acceptRequest(requestId);
      // Optimistic update
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setUnreadCounts((prev) => ({
        ...prev,
        pendingFriendRequests: Math.max(0, prev.pendingFriendRequests - 1),
        total: Math.max(0, prev.total - 1),
      }));
      onFriendshipChanged?.();
    } catch (err: any) {
      alert(err.message || 'Failed to accept friend request');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      await api.friends.rejectRequest(requestId);
      // Optimistic update
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setUnreadCounts((prev) => ({
        ...prev,
        pendingFriendRequests: Math.max(0, prev.pendingFriendRequests - 1),
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to decline friend request');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCounts((prev) => ({
        ...prev,
        unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCounts((prev) => ({
        ...prev,
        unreadNotifications: 0,
        total: prev.pendingFriendRequests,
      }));
    } catch (err) {
      // Ignore
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Notifications & Friend Requests"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCounts.total > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in-75 duration-150">
            {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Notifications Center
            </h3>
            {activeTab === 'activity' && unreadCounts.unreadNotifications > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Subtabs: Friend Requests vs Activity */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
                activeTab === 'requests'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Friend Requests
              {unreadCounts.pendingFriendRequests > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {unreadCounts.pendingFriendRequests}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
                activeTab === 'activity'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Activity
              {unreadCounts.unreadNotifications > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {unreadCounts.unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {/* Content Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : activeTab === 'requests' ? (
              /* TAB 1: FRIEND REQUESTS */
              incomingRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  No pending friend requests
                </div>
              ) : (
                incomingRequests.map((req) => {
                  const sender = req.sender;
                  const senderName =
                    sender?.profile?.displayName || sender?.email?.split('@')[0] || 'A Student';
                  const isActing = actionInProgressId === req.id;

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex flex-col gap-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={senderName}
                          url={sender?.profile?.avatarUrl}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {senderName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {sender?.profile?.institution || 'Student'}
                            {sender?.profile?.major ? ` • ${sender.profile.major}` : ''}
                          </p>
                          {req.note && (
                            <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                              &ldquo;{req.note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Accept & Reject Actions */}
                      <div className="flex items-center gap-2 pt-1 self-end">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleAcceptRequest(req.id, sender.id)}
                          className="px-3 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm flex items-center gap-1 disabled:opacity-50"
                        >
                          {isActing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* TAB 2: SYSTEM ACTIVITY */
              notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                  No recent activity notifications
                </div>
              ) : (
                notifications.map((notif) => {
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkNotificationRead(notif.id)}
                      className={`p-3 text-left transition cursor-pointer flex items-start gap-3 ${
                        notif.isRead
                          ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                          : 'bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {notif.type.includes('FRIEND') ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : notif.type.includes('SESSION') ? (
                          <Calendar className="w-3.5 h-3.5" />
                        ) : notif.type.includes('MESSAGE') ? (
                          <MessageSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold truncate">{notif.title}</p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(notif.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
