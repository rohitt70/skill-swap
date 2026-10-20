'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTheme } from './ThemeContext';

interface User {
  id: string;
  email: string;
  role: string;
  profile?: any;
  settings?: any;
  socialLinks?: any[];
  skills?: any[];
  completeness?: number;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  settings: any | null;
  socialLinks: any[];
  skills: any[];
  completeness: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (dto: { email: string; password: string; displayName: string; institution?: string; major?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (dto: any) => Promise<void>;
  updateSettings: (dto: any) => Promise<void>;
  addSocialLink: (dto: { platform: string; url: string }) => Promise<void>;
  deleteSocialLink: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [completeness, setCompleteness] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { setTheme } = useTheme();

  const fetchFullUserProfile = async () => {
    try {
      const fullProfile = await api.users.getMyProfile();
      setUser(fullProfile);
      setProfile(fullProfile.profile || null);
      setSettings(fullProfile.settings || null);
      setSocialLinks(fullProfile.socialLinks || []);
      setSkills(fullProfile.skills || []);
      setCompleteness(fullProfile.completeness || 0);

      // If user has a saved theme setting, apply it
      if (fullProfile.settings?.theme) {
        setTheme(fullProfile.settings.theme);
      }
    } catch (err) {
      setUser(null);
      setProfile(null);
      setSettings(null);
      setSocialLinks([]);
      setSkills([]);
      setCompleteness(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Attempt session restoration via credentials-enabled cookie
    fetchFullUserProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await api.auth.login({ email, password });
      await fetchFullUserProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: { email: string; password: string; displayName: string; institution?: string; major?: string }) => {
    setIsLoading(true);
    try {
      await api.auth.register(dto);
      await fetchFullUserProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore logout network errors
    } finally {
      setUser(null);
      setProfile(null);
      setSettings(null);
      setSocialLinks([]);
      setSkills([]);
      setCompleteness(0);
    }
  };

  const refreshUser = async () => {
    await fetchFullUserProfile();
  };

  const updateProfile = async (dto: any) => {
    const updated = await api.users.updateProfile(dto);
    setProfile(updated);
    await fetchFullUserProfile();
  };

  const updateSettings = async (dto: any) => {
    const updated = await api.users.updateSettings(dto);
    setSettings(updated);
    if (dto.theme) {
      setTheme(dto.theme);
    }
    await fetchFullUserProfile();
  };

  const addSocialLink = async (dto: { platform: string; url: string }) => {
    await api.users.addSocialLink(dto);
    await fetchFullUserProfile();
  };

  const deleteSocialLink = async (id: string) => {
    await api.users.deleteSocialLink(id);
    await fetchFullUserProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        socialLinks,
        skills,
        completeness,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        updateSettings,
        addSocialLink,
        deleteSocialLink,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
