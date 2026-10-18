'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  MessageSquare,
  Users,
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
  Star,
  ExternalLink,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'discover' | 'chat' | 'sessions'>('discover');
  const [searchSkill, setSearchSkill] = useState('');
  const [currentUser, setCurrentUser] = useState<'alice' | 'bob'>('alice');

  // Simulated Chat Session State
  const [chatSecondsLeft, setChatSecondsLeft] = useState(600); // 10 minutes lock timer
  const [isLocked, setIsLocked] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      sender: 'Alice Chen',
      text: 'Hi Bob! I saw you teach Graphic Design. I would love to exchange Python tutoring for design feedback!',
      time: '10:30 AM',
    },
    {
      id: '2',
      sender: 'Bob Rivera',
      text: "Hey Alice, that's perfect! I have been struggling with a Python web scraping script. Let's arrange a session!",
      time: '10:32 AM',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Countdown timer for chat inactivity demonstration
  useEffect(() => {
    if (chatSecondsLeft <= 0) {
      setIsLocked(true);
      return;
    }
    const timer = setInterval(() => {
      setChatSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [chatSecondsLeft]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLocked) return;
    const author = currentUser === 'alice' ? 'Alice Chen' : 'Bob Rivera';
    setChatMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: author,
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewMessage('');
    // Qualifying user activity resets inactivity timer!
    setChatSecondsLeft(600);
  };

  const handleRejoinSession = () => {
    setIsLocked(false);
    setChatSecondsLeft(600);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">SkillSwap</span>
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Student P2P
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setActiveTab('discover')}
              className={`text-sm font-medium transition ${
                activeTab === 'discover' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Discover Peers
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`text-sm font-medium transition ${
                activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Secure Chat
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`text-sm font-medium transition ${
                activeTab === 'sessions' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Learning Sessions
            </button>
            <a
              href="http://localhost:4000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Active Demo User:</span>
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value as any)}
              className="text-xs bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="alice">Alice Chen (Python $\rightarrow$ Design)</option>
              <option value="bob">Bob Rivera (Design $\rightarrow$ Python)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold backdrop-blur-sm border border-indigo-400/20">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Verified Student Skill Exchange
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Trade skills with students. No money. Just mutual learning.
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
              Find peers who have the skills you want to learn, and teach what you already know.
              Equipped with server-side authorization, inactivity chat lifecycle protection, and session scheduling.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setActiveTab('discover')}
                className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center gap-2"
              >
                Find a Match <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="http://localhost:4000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-4 py-2 rounded-xl text-sm transition flex items-center gap-2"
              >
                Swagger OpenAPI Docs <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* Tab 1: Discover Peers */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by skill (e.g. Python, Graphic Design)..."
                  value={searchSkill}
                  onChange={(e) => setSearchSkill(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Backend API Connected (`localhost:4000`)
              </div>
            </div>

            {/* Student Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Alice */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-700">
                      AC
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Alice Chen</h3>
                      <p className="text-xs text-slate-500">MIT • Computer Science</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.9
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Passionate about Python & algorithms. Looking to learn Figma and graphic design for personal projects!
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-medium text-slate-700">Teaches:</span>
                    <span className="ml-2 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                      Python Programming
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Wants to Learn:</span>
                    <span className="ml-2 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-medium border border-sky-200">
                      Graphic Design
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Open Chat
                </button>
              </div>

              {/* Card 2: Bob (Mutual Match!) */}
              <div className="bg-white rounded-2xl border-2 border-indigo-500 p-6 shadow-md relative space-y-4">
                <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                  <Sparkles className="w-3 h-3" /> Perfect Match
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center font-bold text-teal-700">
                      BR
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Bob Rivera</h3>
                      <p className="text-xs text-slate-500">RISD / Brown • Interaction Design</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 5.0
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Designer creating digital experiences. Really keen to understand Python for creative coding and AI tools!
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-medium text-slate-700">Teaches:</span>
                    <span className="ml-2 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                      Graphic Design
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Wants to Learn:</span>
                    <span className="ml-2 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-medium border border-sky-200">
                      Python Programming
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Book Session
                  </button>
                </div>
              </div>

              {/* Card 3: Charlie (Admin / Calculus) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center font-bold text-violet-700">
                      CK
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Charlie Kim</h3>
                      <p className="text-xs text-slate-500">Stanford • Applied Mathematics</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.8
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Math tutor and peer mentor. Happy to help anyone struggling with Calculus, Linear Algebra, or proofs.
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-medium text-slate-700">Teaches:</span>
                    <span className="ml-2 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                      Calculus & Linear Algebra
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Wants to Learn:</span>
                    <span className="ml-2 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-medium border border-sky-200">
                      Machine Learning
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => alert('Friend request sent to Charlie Kim via backend API!')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Send Friend Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Secure Chat with Inactivity Protection */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Chat Top Banner with Inactivity Timer */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold">
                  {currentUser === 'alice' ? 'BR' : 'AC'}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {currentUser === 'alice' ? 'Bob Rivera' : 'Alice Chen'}
                  </h3>
                  <p className="text-xs text-slate-400">Direct Authorized Session (End-to-End Verified)</p>
                </div>
              </div>

              {/* Inactivity Warning and Countdown */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">Inactivity Lock in:</span>
                  <span className={`font-mono font-bold ${chatSecondsLeft < 120 ? 'text-red-400 animate-pulse' : 'text-teal-400'}`}>
                    {formatTimer(chatSecondsLeft)}
                  </span>
                </div>
                {isLocked && (
                  <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED
                  </span>
                )}
              </div>
            </div>

            {/* Inactivity Warning Banner if below 5 minutes */}
            {chatSecondsLeft <= 300 && !isLocked && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
                <span>⚠️ <strong>Inactivity Warning:</strong> No activity detected in 5 mins. Session will lock soon.</span>
                <button
                  onClick={() => setChatSecondsLeft(600)}
                  className="text-amber-900 font-bold hover:underline"
                >
                  Keep Active
                </button>
              </div>
            )}

            {/* Locked Session Overlay Banner */}
            {isLocked && (
              <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-xs text-red-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-600" />
                  <span>
                    <strong>Chat Session Locked:</strong> Inactivity exceeded 10 minutes. Messages are protected.
                  </span>
                </div>
                <button
                  onClick={handleRejoinSession}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-red-700 transition flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" /> Rejoin Session
                </button>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              {chatMessages.map((msg) => {
                const isMe =
                  (currentUser === 'alice' && msg.sender.includes('Alice')) ||
                  (currentUser === 'bob' && msg.sender.includes('Bob'));
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{msg.sender}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-100'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
              <input
                type="text"
                disabled={isLocked}
                placeholder={isLocked ? 'Session is locked. Click Rejoin above to send messages.' : 'Type your message (activity resets timeout)...'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLocked || !newMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm shadow-indigo-200"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Learning Sessions */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scheduled Peer Learning Sessions</h2>
                <p className="text-xs text-slate-500">Coordinate calendar bookings with your learning partners</p>
              </div>
              <button
                onClick={() => alert('New session booking proposal initiated with Bob Rivera!')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" /> Book New Session
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Session 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                    CONFIRMED
                  </span>
                  <span className="text-xs text-slate-500">Tomorrow • 6:00 PM</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Python Web Scraping & BeautifulSoup</h3>
                  <p className="text-xs text-slate-500 mt-1">Teacher: Alice Chen • Learner: Bob Rivera</p>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Topic: Setting up Python script to scrape portfolio design references and clean HTML content.
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Format: Google Meet (Virtual)</span>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Discuss in Chat $\rightarrow$
                  </button>
                </div>
              </div>

              {/* Session 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
                    PROPOSED
                  </span>
                  <span className="text-xs text-slate-500">Friday • 4:00 PM</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Figma Design Systems & Components</h3>
                  <p className="text-xs text-slate-500 mt-1">Teacher: Bob Rivera • Learner: Alice Chen</p>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Topic: Auto-layout, component variants, and token structures for web apps.
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Format: Discord / Figma Audio</span>
                  <button
                    onClick={() => alert('Session accepted!')}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition"
                  >
                    Accept Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>SkillSwap • Production-Oriented Peer-to-Peer Student Skill Exchange</p>
        <p className="mt-1">
          Backend API on Port 4000 • OpenAPI Swagger at{' '}
          <a href="http://localhost:4000/api/docs" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
            http://localhost:4000/api/docs
          </a>
        </p>
      </footer>
    </div>
  );
}
