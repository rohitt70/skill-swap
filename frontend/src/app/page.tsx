'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  Calendar,
  Send,
  Users,
  MessageSquare,
  UserPlus,
  Loader2,
  BookOpen,
  UserCheck,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Video,
  MapPin,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { Avatar } from '../components/Avatar';
import { SkillsBadges } from '../components/SkillsBadges';
import { SocialLinksView } from '../components/SocialLinksView';
import { AuthModal } from '../components/AuthModal';
import { ProfileModal } from '../components/ProfileModal';
import { SettingsModal } from '../components/SettingsModal';
import { PublicProfileModal } from '../components/PublicProfileModal';
import { ProposeSessionModal } from '../components/ProposeSessionModal';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const { user, profile } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'discover' | 'chat' | 'sessions'>('discover');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'view' | 'edit' | 'social' | 'skills'>('view');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [proposeTeacher, setProposeTeacher] = useState<{ id: string; name: string } | null>(null);

  // Discover state
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [skillTypeFilter, setSkillTypeFilter] = useState<'TEACH' | 'LEARN' | ''>('');
  const [students, setStudents] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [friendsList, setFriendsList] = useState<any[]>([]);

  // Chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatSession, setChatSession] = useState<any | null>(null);
  const [chatSecondsLeft, setChatSecondsLeft] = useState<number>(600);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Learning Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actingSessionId, setActingSessionId] = useState<string | null>(null);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load friends list
  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriendsList([]);
      return;
    }
    try {
      const list = await api.friends.getFriendsList();
      setFriendsList(list || []);
      const friendIds = new Set<string>((list || []).map((f: any) => f.friend.id));
      setConnectedIds(friendIds);
    } catch (err) {
      // Ignore
    }
  }, [user]);

  // Fetch real students from backend
  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await api.users.search({
        query: searchQuery || undefined,
        skill: skillFilter || undefined,
        skillType: skillTypeFilter || undefined,
      });
      setStudents(res.data || []);

      if (user) {
        const recs = await api.users.getRecommendations().catch(() => []);
        setRecommendations(recs || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [searchQuery, skillFilter, skillTypeFilter, user]);

  useEffect(() => {
    fetchStudents();
    fetchFriends();
  }, [fetchStudents, fetchFriends]);

  // Load conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const convs = await api.chat.getConversations();
      setConversations(convs || []);
      if (convs && convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, selectedConvId]);

  // Load messages & active session for selected conversation
  const fetchConversationData = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const [msgs, session] = await Promise.all([
        api.chat.getMessages(convId).catch(() => []),
        api.chat.getSession(convId).catch(() => null),
      ]);
      setMessages(msgs || []);
      setChatSession(session);
      if (session) {
        setChatSecondsLeft(session.secondsUntilLock ?? 600);
        setIsLocked(session.isLocked || session.status === 'LOCKED');
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'chat' && user) {
      fetchConversations();
    }
  }, [activeTab, user, fetchConversations]);

  useEffect(() => {
    if (selectedConvId && user) {
      fetchConversationData(selectedConvId);
    }
  }, [selectedConvId, user, fetchConversationData]);

  // Chat countdown timer based on server-provided secondsUntilLock
  useEffect(() => {
    if (!chatSession || isLocked || chatSecondsLeft <= 0) {
      if (chatSecondsLeft <= 0 && chatSession) {
        setIsLocked(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setChatSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [chatSecondsLeft, isLocked, chatSession]);

  // WebSocket Connection Setup
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (selectedConvId) {
        socket.emit('join_conversation', { conversationId: selectedConvId });
      }
    });

    socket.on('new_message', (incomingMsg: any) => {
      if (incomingMsg.conversationId === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        // Qualifying message resets activity countdown
        setChatSecondsLeft(600);
        setIsLocked(false);
      }
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === incomingMsg.conversationId
            ? { ...c, lastMessage: incomingMsg, updatedAt: incomingMsg.createdAt }
            : c,
        ),
      );
    });

    socket.on('user_typing', (data: any) => {
      if (data.conversationId === selectedConvId && data.userId !== user.id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, selectedConvId]);

  // When switching conversations, join socket room
  useEffect(() => {
    if (socketRef.current && selectedConvId) {
      socketRef.current.emit('join_conversation', { conversationId: selectedConvId });
      return () => {
        socketRef.current?.emit('leave_conversation', { conversationId: selectedConvId });
      };
    }
  }, [selectedConvId]);

  // Load learning sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const data = await api.learningSessions.getAll();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'sessions' && user) {
      fetchSessions();
    }
  }, [activeTab, user, fetchSessions]);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLocked || !selectedConvId || sendingMessage) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      const savedMsg = await api.chat.sendMessage(selectedConvId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });
      // Reset server inactivity timer locally
      setChatSecondsLeft(600);
      setIsLocked(false);

      // Notify socket server
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          conversationId: selectedConvId,
          content,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Rejoin session handler
  const handleRejoinSession = async () => {
    if (!chatSession?.id) return;
    try {
      const refreshed = await api.chat.rejoinSession(chatSession.id);
      setChatSession(refreshed);
      setChatSecondsLeft(refreshed.secondsUntilLock || 600);
      setIsLocked(false);
    } catch (err: any) {
      alert(err.message || 'Could not rejoin session');
    }
  };

  // Connection request handler
  const handleSendConnection = async (targetId: string) => {
    if (!user) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    try {
      await api.friends.sendRequest(targetId);
      setConnectedIds((prev) => new Set(prev).add(targetId));
      alert('Connection request sent successfully!');
    } catch (err: any) {
      alert(err.message || 'Could not send connection request');
    }
  };

  // Direct start chat from Discover or Profile
  const handleStartChatWith = async (targetId: string) => {
    if (!user) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    try {
      const conv = await api.chat.createConversation(targetId);
      await fetchConversations();
      setSelectedConvId(conv.id);
      setActiveTab('chat');
    } catch (err: any) {
      alert(err.message || 'Could not start conversation. Ensure you are connected friends.');
    }
  };

  // Session actions (accept / decline)
  const handleAcceptSession = async (sessionId: string) => {
    setActingSessionId(sessionId);
    try {
      await api.learningSessions.accept(sessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to accept session');
    } finally {
      setActingSessionId(null);
    }
  };

  const handleDeclineSession = async (sessionId: string) => {
    setActingSessionId(sessionId);
    try {
      await api.learningSessions.decline(sessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to decline session');
    } finally {
      setActingSessionId(null);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Selected conversation object
  const currentConv = conversations.find((c) => c.id === selectedConvId);
  const otherUser = currentConv?.otherParticipants?.[0];
  const chatPartnerName =
    otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'Peer Student';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenProfile={() => {
          setProfileModalTab('view');
          setProfileModalOpen(true);
        }}
        onOpenEditProfile={() => {
          setProfileModalTab('edit');
          setProfileModalOpen(true);
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onFriendshipChanged={() => {
          fetchFriends();
          fetchConversations();
        }}
        onOpenChatWith={handleStartChatWith}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold backdrop-blur-sm border border-indigo-400/20">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Verified Student Skill Exchange
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Teach what you know. Learn what you need. Peer-to-peer.
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
              Discover verified student peers, send connection requests, exchange knowledge in private secure chat,
              and coordinate peer learning sessions without fees.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      setAuthModalMode('register');
                      setAuthModalOpen(true);
                    }}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-teal-500/20 flex items-center gap-2"
                  >
                    Get Started (Sign Up) <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('login');
                      setAuthModalOpen(true);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs text-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Signed in as <strong>{profile?.displayName || user.email}</strong>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TAB 1: DISCOVER PEERS */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, bio, campus..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap w-full sm:w-auto gap-2 items-center">
                <input
                  type="text"
                  placeholder="Filter by skill (e.g. Python)..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />

                <select
                  value={skillTypeFilter}
                  onChange={(e) => setSkillTypeFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">All Skills</option>
                  <option value="TEACH">They Can Teach</option>
                  <option value="LEARN">They Want to Learn</option>
                </select>

                <button
                  onClick={fetchStudents}
                  className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recommendations Banner if Mutual Matches Exist */}
            {recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/30 dark:to-indigo-950/30 p-4 rounded-2xl border border-teal-200/80 dark:border-teal-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Recommended Peer Matches
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      We found students who match your skills exchange profile!
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-900/50 px-2.5 py-1 rounded-full">
                  {recommendations.length} Match(es)
                </span>
              </div>
            )}

            {/* Real Students Grid */}
            {loadingStudents ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500">Querying real student database...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No students matched your criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your skill search keywords or clear filters to view all registered students.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSkillFilter('');
                    setSkillTypeFilter('');
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                >
                  Clear all search filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((st) => {
                  const isFriend = connectedIds.has(st.id);
                  const isMe = user?.id === st.id;
                  const isRec = recommendations.some((r) => r.id === st.id && r.isMutualMatch);

                  return (
                    <div
                      key={st.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 ${
                        isRec
                          ? 'border-2 border-indigo-500 dark:border-indigo-400 relative'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {isRec && (
                        <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                          <Sparkles className="w-3 h-3" /> Mutual Match
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Student Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar
                              name={st.profile?.displayName || 'Student'}
                              url={st.profile?.avatarUrl}
                              size="md"
                            />
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                {st.profile?.displayName || 'Student'}
                                {isMe && (
                                  <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                                    You
                                  </span>
                                )}
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {st.profile?.institution || 'Campus Student'}
                                {st.profile?.major && ` • ${st.profile.major}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Headline & Bio */}
                        {st.profile?.headline && (
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {st.profile.headline}
                          </p>
                        )}
                        {st.profile?.bio && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {st.profile.bio}
                          </p>
                        )}

                        {/* Social Links View */}
                        {st.socialLinks && st.socialLinks.length > 0 && (
                          <div className="pt-1">
                            <SocialLinksView links={st.socialLinks} />
                          </div>
                        )}

                        {/* Skills Showcase */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Teaches:
                            </span>
                            <SkillsBadges skills={st.skills || []} type="TEACH" maxDisplay={3} />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Wants to Learn:
                            </span>
                            <SkillsBadges skills={st.skills || []} type="LEARN" maxDisplay={3} />
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setSelectedStudentId(st.id)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2 rounded-xl transition"
                        >
                          View Profile
                        </button>
                        {isMe ? (
                          <button
                            onClick={() => {
                              setProfileModalTab('edit');
                              setProfileModalOpen(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 rounded-xl transition"
                          >
                            Edit Profile
                          </button>
                        ) : isFriend ? (
                          <button
                            onClick={() => handleStartChatWith(st.id)}
                            className="text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendConnection(st.id)}
                            className="text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SECURE CHAT */}
        {activeTab === 'chat' && (
          !user ? (
            /* Protected Route Gate */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to Access Secure Chat</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peer chats are end-to-end authenticated. Sign in or register your student account to communicate with peers.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Create Account
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[650px]">
              {/* Left Conversations Sidebar */}
              <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Conversations ({conversations.length})
                  </h3>
                  <button
                    onClick={fetchConversations}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Refresh chats"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingConversations ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-xs">Loading conversations...</span>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-indigo-500" />
                      <p>No conversations yet</p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        Find peers in Discover $\rightarrow$
                      </button>
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const participant = conv.otherParticipants?.[0];
                      const partnerName =
                        participant?.profile?.displayName || participant?.email?.split('@')[0] || 'Peer Student';
                      const isSelected = conv.id === selectedConvId;

                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConvId(conv.id)}
                          className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                              : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <Avatar
                            name={partnerName}
                            url={participant?.profile?.avatarUrl}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {partnerName}
                              </p>
                              {conv.lastMessage && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Chat Panel */}
              <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                {selectedConvId ? (
                  <>
                    {/* Header with Server Inactivity Counter */}
                    <div className="bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          name={chatPartnerName}
                          url={otherUser?.profile?.avatarUrl}
                          size="sm"
                        />
                        <div>
                          <h3 className="font-semibold text-xs sm:text-sm">{chatPartnerName}</h3>
                          <p className="text-[10px] text-slate-400">
                            {otherUserTyping ? 'Typing...' : 'Real-time Encrypted Chat • Inactivity Lifetime Enforced'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-slate-300">Lock in:</span>
                          <span
                            className={`font-mono font-bold ${
                              chatSecondsLeft < 120 ? 'text-rose-400 animate-pulse' : 'text-teal-400'
                            }`}
                          >
                            {formatTimer(chatSecondsLeft)}
                          </span>
                        </div>
                        {isLocked && (
                          <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> LOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Warning Banner at <= 5 mins */}
                    {chatSecondsLeft <= 300 && !isLocked && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>
                          ⚠️ <strong>Inactivity Warning:</strong> No chat activity detected in 5 minutes.
                        </span>
                        <button
                          onClick={handleRejoinSession}
                          className="font-bold underline hover:text-amber-950 dark:hover:text-white"
                        >
                          Keep Active
                        </button>
                      </div>
                    )}

                    {/* Lock Banner */}
                    {isLocked && (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 px-6 py-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-rose-600" />
                          <span>
                            <strong>Chat Session Locked:</strong> 10-minute inactivity limit reached. Click rejoin to continue.
                          </span>
                        </div>
                        <button
                          onClick={handleRejoinSession}
                          className="bg-rose-600 text-white px-3 py-1 rounded-xl font-medium text-xs hover:bg-rose-700 transition flex items-center gap-1 shadow-sm"
                        >
                          <RefreshCw className="w-3 h-3" /> Rejoin Session
                        </button>
                      </div>
                    )}

                    {/* Messages Feed */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
                      {loadingMessages ? (
                        <div className="py-12 text-center space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                          <p className="text-xs text-slate-400">Loading messages from database...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                          <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                          <p>No messages yet. Send a message to start exchanging skills!</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.senderId === user.id;
                          const senderDisplayName =
                            msg.sender?.profile?.displayName || (isMe ? 'You' : chatPartnerName);

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {senderDisplayName}
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div
                                className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                  isMe
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Composer Form */}
                    <form
                      onSubmit={handleSendMessage}
                      className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-3"
                    >
                      <input
                        type="text"
                        disabled={isLocked || sendingMessage}
                        placeholder={
                          isLocked
                            ? 'Session is locked. Click Rejoin above to send messages.'
                            : 'Type your message (persisted to PostgreSQL)...'
                        }
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isLocked || !newMessage.trim() || sendingMessage}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                    <MessageSquare className="w-12 h-12 text-indigo-400 opacity-40" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Select a conversation or find peers
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Choose an existing direct chat from the sidebar or click Message on any connected friend.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* TAB 3: LEARNING SESSIONS */}
        {activeTab === 'sessions' && (
          !user ? (
            /* Protected Route Gate */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to View Learning Sessions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Learning sessions let you coordinate 1-on-1 peer tutoring. Sign in or register to schedule and view sessions.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Create Account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Scheduled Peer Learning Sessions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Coordinate peer calendar bookings with student partners
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSessions}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Refresh sessions"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setProposeTeacher(null);
                      setProposeModalOpen(true);
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Propose New Session
                  </button>
                </div>
              </div>

              {loadingSessions ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Loading scheduled sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">No scheduled sessions yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Propose a session with one of your connected student friends to coordinate tutoring and skill swaps.
                  </p>
                  <button
                    onClick={() => {
                      setProposeTeacher(null);
                      setProposeModalOpen(true);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                  >
                    Propose your first session
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sessions.map((sess) => {
                    const isTeacher = sess.teacherId === user.id;
                    const isLearner = sess.learnerId === user.id;
                    const partner = isTeacher ? sess.learner : sess.teacher;
                    const partnerName =
                      partner?.profile?.displayName || partner?.email?.split('@')[0] || 'Peer Student';
                    const isActing = actingSessionId === sess.id;

                    const statusBadgeColors = {
                      PROPOSED: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
                      CONFIRMED: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
                      COMPLETED: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
                      CANCELLED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                      DECLINED: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
                    }[sess.status as string] || 'bg-slate-100 text-slate-700';

                    return (
                      <div
                        key={sess.id}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusBadgeColors}`}>
                              {sess.status}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(sess.scheduledAt).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                              {sess.skillName}: {sess.topic}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Teacher:{' '}
                              <strong>{sess.teacher?.profile?.displayName || 'Teacher'}</strong>{' '}
                              • Learner:{' '}
                              <strong>{sess.learner?.profile?.displayName || 'Learner'}</strong>
                            </p>
                          </div>

                          {sess.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                              Notes: {sess.notes}
                            </p>
                          )}

                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Duration: {sess.durationMins || 60} mins</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sess.format === 'VIRTUAL' ? (
                                <Video className="w-3.5 h-3.5 text-teal-500" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <span>Format: {sess.format === 'VIRTUAL' ? 'Virtual' : 'In-Person'}</span>
                              {sess.location && <span className="truncate">({sess.location})</span>}
                            </div>
                          </div>
                        </div>

                        {/* Actions for teacher when PROPOSED */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          {isTeacher && sess.status === 'PROPOSED' ? (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={isActing}
                                onClick={() => handleAcceptSession(sess.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                              >
                                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Accept
                              </button>
                              <button
                                disabled={isActing}
                                onClick={() => handleDeclineSession(sess.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {sess.status === 'PROPOSED' ? 'Awaiting teacher confirmation' : `Session ${sess.status.toLowerCase()}`}
                            </span>
                          )}

                          <button
                            onClick={() => {
                              handleStartChatWith(partner.id);
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            Open Chat $\rightarrow$
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Modals Container */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        initialTab={profileModalTab}
        onClose={() => setProfileModalOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <PublicProfileModal
        userId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onOpenChatWith={(targetId) => handleStartChatWith(targetId)}
      />

      <ProposeSessionModal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        onSuccess={() => fetchSessions()}
        preselectedTeacherId={proposeTeacher?.id}
        preselectedTeacherName={proposeTeacher?.name}
        friends={friendsList}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>SkillSwap • Production-Oriented Peer-to-Peer Student Skill Exchange</p>
        <p className="mt-1">
          Backend API on Port 4000 • OpenAPI Swagger at{' '}
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline"
          >
            http://localhost:4000/api/docs
          </a>
        </p>
      </footer>
    </div>
  );
}
