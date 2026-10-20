'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  activeTab: 'discover' | 'chat' | 'sessions';
  setActiveTab: (tab: 'discover' | 'chat' | 'sessions') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSettings: () => void;
  onFriendshipChanged?: () => void;
  onOpenChatWith?: (recipientId: string) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSettings,
  onFriendshipChanged,
  onOpenChatWith,
}: NavbarProps) {
  const { user, profile, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Student';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('discover')}>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 dark:shadow-indigo-950">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SkillSwap</span>
            <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              Student P2P
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('discover')}
            className={`text-sm font-medium transition ${
              activeTab === 'discover'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Discover Peers
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`text-sm font-medium transition ${
              activeTab === 'chat'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Secure Chat
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`text-sm font-medium transition ${
              activeTab === 'sessions'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Learning Sessions
          </button>
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition"
          >
            API Docs <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </nav>

        {/* Right Actions: Theme Toggle & User Menu */}
        <div className="flex items-center space-x-3">
          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'LIGHT' : 'DARK')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode (current: ${theme.toLowerCase()})`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {user ? (
            /* Logged-In User Actions */
            <div className="flex items-center space-x-2">
              <NotificationBell
                onFriendshipChanged={onFriendshipChanged}
                onOpenChatWith={onOpenChatWith}
              />

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pl-2.5 pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700"
                >
                  <Avatar name={displayName} url={profile?.avatarUrl} size="sm" />
                  <div className="text-left hidden sm:block max-w-[120px]">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{profile?.institution || 'Student'}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenEditProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Settings
                      </button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await logout();
                          setActiveTab('discover');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged-Out Actions */
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-xl transition"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-200 dark:shadow-indigo-950"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
