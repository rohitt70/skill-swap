// SkillSwap Frontend API Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers as Record<string, string> || {}),
    };

    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || 'An unexpected error occurred';
      const formatted = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
      throw new Error(formatted);
    }

    return data as T;
  }

  // Authentication
  auth = {
    getCsrfToken: () =>
      this.request<{ csrfToken: string }>('/api/v1/auth/csrf', {
        method: 'GET',
      }),

    register: (dto: { email: string; password: string; displayName: string; institution?: string; major?: string }) =>
      this.request<{ success: boolean; message: string; user: any }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    login: (dto: { email: string; password: string }) =>
      this.request<{ success: boolean; message: string; user: any }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    refresh: (refreshToken?: string) =>
      this.request<{ success: boolean; message: string; user: any }>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    logout: () =>
      this.request<{ success: boolean }>('/api/v1/auth/logout', {
        method: 'POST',
      }),

    getMe: () =>
      this.request<any>('/api/v1/auth/me', {
        method: 'GET',
      }),
  };

  // User Profile & Settings
  users = {
    getMyProfile: () =>
      this.request<any>('/api/v1/users/me/profile', {
        method: 'GET',
      }),

    updateProfile: (dto: any) =>
      this.request<any>('/api/v1/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),

    getMySettings: () =>
      this.request<any>('/api/v1/users/me/settings', {
        method: 'GET',
      }),

    updateSettings: (dto: any) =>
      this.request<any>('/api/v1/users/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),

    addSocialLink: (dto: { platform: string; url: string }) =>
      this.request<any>('/api/v1/users/me/social-links', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    deleteSocialLink: (id: string) =>
      this.request<any>(`/api/v1/users/me/social-links/${id}`, {
        method: 'DELETE',
      }),

    changePassword: (dto: { currentPassword: string; newPassword: string }) =>
      this.request<{ success: boolean; message: string }>('/api/v1/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    deleteAccount: () =>
      this.request<{ success: boolean; message: string }>('/api/v1/users/me', {
        method: 'DELETE',
      }),

    search: (params?: { query?: string; skill?: string; skillType?: string; institution?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.query) q.set('query', params.query);
      if (params?.skill) q.set('skill', params.skill);
      if (params?.skillType) q.set('skillType', params.skillType);
      if (params?.institution) q.set('institution', params.institution);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const queryString = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ data: any[]; meta: any }>(`/api/v1/users/search${queryString}`, {
        method: 'GET',
      });
    },

    getRecommendations: () =>
      this.request<any[]>('/api/v1/users/recommendations', {
        method: 'GET',
      }),

    getPublicProfile: (id: string) =>
      this.request<any>(`/api/v1/users/${id}`, {
        method: 'GET',
      }),
  };

  // Friends & Connections
  friends = {
    sendRequest: (recipientId: string, note?: string) =>
      this.request<any>('/api/v1/friends/request', {
        method: 'POST',
        body: JSON.stringify({ recipientId, note }),
      }),

    getIncoming: () =>
      this.request<any[]>('/api/v1/friends/requests/incoming', {
        method: 'GET',
      }),

    getOutgoing: () =>
      this.request<any[]>('/api/v1/friends/requests/outgoing', {
        method: 'GET',
      }),

    acceptRequest: (id: string) =>
      this.request<any>(`/api/v1/friends/request/${id}/accept`, {
        method: 'POST',
      }),

    rejectRequest: (id: string) =>
      this.request<any>(`/api/v1/friends/request/${id}/reject`, {
        method: 'POST',
      }),

    getFriendsList: () =>
      this.request<any[]>('/api/v1/friends/list', {
        method: 'GET',
      }),
  };

  // Skills
  skills = {
    getCatalog: () =>
      this.request<any[]>('/api/v1/skills/catalog', {
        method: 'GET',
      }),

    getMySkills: () =>
      this.request<any[]>('/api/v1/skills/my-skills', {
        method: 'GET',
      }),

    addSkill: (dto: { skillName: string; type: 'TEACH' | 'LEARN'; proficiencyLevel?: string; category?: string; notes?: string }) =>
      this.request<any>('/api/v1/skills/my-skills', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    removeSkill: (id: string) =>
      this.request<any>(`/api/v1/skills/my-skills/${id}`, {
        method: 'DELETE',
      }),
  };

  // Chat
  chat = {
    getConversations: () =>
      this.request<any[]>('/api/v1/chat/conversations', {
        method: 'GET',
      }),

    createConversation: (recipientId: string) =>
      this.request<any>('/api/v1/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      }),

    getMessages: (conversationId: string) =>
      this.request<any[]>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'GET',
      }),

    sendMessage: (conversationId: string, content: string) =>
      this.request<any>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ conversationId, content }),
      }),

    getSession: (conversationId: string) =>
      this.request<any>(`/api/v1/chat/conversations/${conversationId}/session`, {
        method: 'GET',
      }),

    rejoinSession: (sessionId: string) =>
      this.request<any>(`/api/v1/chat/sessions/${sessionId}/rejoin`, {
        method: 'POST',
      }),
  };

  // Learning Sessions
  learningSessions = {
    getAll: () =>
      this.request<any[]>('/api/v1/learning-sessions', {
        method: 'GET',
      }),

    create: (dto: { teacherId: string; skillName: string; topic: string; scheduledAt: string; durationMins?: number; format?: string; location?: string; notes?: string }) =>
      this.request<any>('/api/v1/learning-sessions', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    accept: (id: string) =>
      this.request<any>(`/api/v1/learning-sessions/${id}/accept`, {
        method: 'POST',
      }),

    decline: (id: string) =>
      this.request<any>(`/api/v1/learning-sessions/${id}/decline`, {
        method: 'POST',
      }),
  };

  // Notifications
  notifications = {
    getAll: (limit?: number) =>
      this.request<any[]>(`/api/v1/notifications${limit ? `?limit=${limit}` : ''}`, {
        method: 'GET',
      }),

    getUnreadCount: () =>
      this.request<{ unreadNotifications: number; pendingFriendRequests: number; total: number }>(
        '/api/v1/notifications/unread-count',
        {
          method: 'GET',
        },
      ),

    markAsRead: (id: string) =>
      this.request<any>(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    markAllAsRead: () =>
      this.request<{ success: boolean; updated: number }>('/api/v1/notifications/read-all', {
        method: 'PATCH',
      }),
  };
}

export const api = new ApiClient();
