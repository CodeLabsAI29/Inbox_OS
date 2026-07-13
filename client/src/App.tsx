import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmailList } from './components/EmailList';
import { ComposeModal } from './components/ComposeModal';
import { LandingPage } from './components/LandingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SocketProvider, useSocket } from './context/SocketContext';
import {
  CheckCircle2,
  Sparkles,
  Zap,
  Sliders,
  User,
  Mail,
  Radio,
  Calendar,
  CheckSquare,
  Trash2,
  ListChecks,
  AlertCircle,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { API_BASE, authenticatedFetch } from './config';

// Extracted Dashboard Component to protect via ProtectedRoute
const DashboardContent: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('task.created', (data: any) => {
      setToastMessage(`New Task Extracted: ${data.title}`);
      setTimeout(() => setToastMessage(null), 4000);
    });

    socket.on('rule.executed', (data: any) => {
      setToastMessage(`Rule Executed: "${data.ruleName}" (${data.status})`);
      setTimeout(() => setToastMessage(null), 4000);
    });

    return () => {
      socket.off('task.created');
      socket.off('rule.executed');
    };
  }, [socket]);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.endsWith('/tasks') || path.includes('/tasks/')) return 'tasks';
    if (path.endsWith('/rules') || path.includes('/rules/')) return 'rules';
    if (path.endsWith('/settings') || path.includes('/settings/'))
      return 'settings';
    if (path.endsWith('/analytics') || path.includes('/analytics/'))
      return 'analytics';
    return 'inbox';
  };

  const activeTab = getActiveTab();
  const setActiveTab = (tab: string) => {
    if (tab === 'inbox') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  // Settings/Preferences states
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(true);
  const [telegramToken, setTelegramToken] = useState('6978452144:AAH_••••••••');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [minPriority, setMinPriority] = useState(70);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tasks tab state
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [tasksTotal, setTasksTotal] = useState(0);

  // Rules tab state
  const [rulesList, setRulesList] = useState<any[]>([
    {
      id: '1',
      name: 'Invoice Auto-Tag',
      condition: 'subject contains "invoice" OR "payment"',
      action: 'Label → Finance · Priority High',
      enabled: true,
      executions: 142,
    },
    {
      id: '2',
      name: 'Newsletter Digest',
      condition: 'sender domain in [substack.com, beehiiv.com]',
      action: 'Archive · Add to Weekly Digest',
      enabled: true,
      executions: 87,
    },
    {
      id: '3',
      name: 'OTP Fast-Path',
      condition: 'subject matches /\\b\\d{4,8}\\b/ AND sender trusted',
      action: 'Extract OTP → Clipboard · Archive',
      enabled: true,
      executions: 319,
    },
    {
      id: '4',
      name: 'Support Escalation',
      condition: 'body contains "urgent" AND priority >= 80',
      action: 'Notify Telegram · Flag Red',
      enabled: false,
      executions: 23,
    },
  ]);

  // Synced backend settings fields
  const [signature, setSignature] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    return systemPrefersDark ? 'dark' : 'light';
  });
  const [timezone, setTimezone] = useState('UTC');
  const [digestSchedule, setDigestSchedule] = useState('daily');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.remove('dark', 'dark-theme');
      document.documentElement.classList.add('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Digests list state
  const [digests, setDigests] = useState<any[]>([]);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState<string | null>(null);

  const fetchDigests = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/digests?limit=5`,
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDigests(data.digests || []);
      }
    } catch (err) {
      console.error('Failed to fetch digests:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && settingsSubTab === 'digests') {
      fetchDigests();
    }
  }, [activeTab, settingsSubTab]);

  // Load tasks when on tasks tab
  useEffect(() => {
    if (activeTab !== 'tasks') return;
    const fetchTasks = async () => {
      setTasksLoading(true);
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/api/tasks?completed=${showCompleted}&limit=50`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setTasksList(data.tasks || []);
          setTasksTotal(data.total || 0);
        }
      } catch (err) {
        console.error('[Tasks] fetch error', err);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchTasks();
  }, [activeTab, showCompleted]);

  const handleToggleTask = async (id: string, current: boolean) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !current }),
        credentials: 'include',
      });
      if (res.ok) {
        setTasksList((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isCompleted: !current } : t))
        );
      }
    } catch (err) {
      console.error('[Tasks] toggle error', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setTasksList((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('[Tasks] delete error', err);
    }
  };

  // Load Gmail connection status from backend
  useEffect(() => {
    if (activeTab !== 'settings' && activeTab !== 'inbox') return;
    const fetchGmailStatus = async () => {
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/api/integrations/gmail/status`,
          {
            credentials: 'include',
          }
        );
        if (res.ok) {
          const data = await res.json();
          setGmailConnected(data.connected ?? false);
          setGmailEmail(data.emailAddress ?? null);
        }
      } catch (err) {
        console.warn('[Gmail] Could not fetch status:', err);
      }
    };
    fetchGmailStatus();
  }, [activeTab]);

  const handleConnectGmail = async () => {
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/api/integrations/gmail/auth`,
        {
          credentials: 'include',
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch (err) {
      alert('Failed to start Gmail OAuth. Make sure the backend is running.');
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Disconnect your Gmail account?')) return;
    try {
      await authenticatedFetch(`${API_BASE}/api/integrations/gmail`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setGmailConnected(false);
      setGmailEmail(null);
    } catch (err) {
      alert('Failed to disconnect Gmail.');
    }
  };

  const handleSyncGmail = async () => {
    if (!gmailConnected) {
      alert(
        'Gmail is not connected yet. Redirecting you to Google authorization to link your Gmail account...'
      );
      handleConnectGmail();
      return;
    }
    setGmailSyncing(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/api/integrations/gmail/sync`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (res.ok) {
        const data = await res.json();
        setToastMessage(`Synced ${data.synced} new email(s) from Gmail`);
        setTimeout(() => setToastMessage(null), 4000);
        queryClient.invalidateQueries({ queryKey: ['emails'] });
      } else {
        const err = await res.json();
        alert(err.error || 'Sync failed');
      }
    } catch (err) {
      alert('Gmail sync failed. Is the backend running?');
    } finally {
      setGmailSyncing(false);
    }
  };

  // Load preferences from backend settings API
  useEffect(() => {
    if (activeTab !== 'settings') return;

    const loadSettings = async () => {
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/api/users/me/settings`,
          {
            credentials: 'include',
          }
        );
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme || 'dark');
          setSignature(data.signature || '');
          setAutoReply(!!data.autoReply);
          setTimezone(data.timezone || 'UTC');
          setDigestSchedule(data.digestSchedule || 'daily');
          setProfileName(data.username || '');
          setProfileEmail(data.email || '');
          setUserId(data.userId || '');
        }
      } catch (err) {
        console.error(
          'Failed to load user settings, using dev mock settings:',
          err
        );
        setTheme('light');
        setSignature('Sent from InboxOS Dev');
        setAutoReply(true);
        setTimezone('UTC');
        setDigestSchedule('daily');
        setProfileName('demo-user');
        setProfileEmail('demo-user@inboxos.dev');
      }
    };

    loadSettings();
  }, [activeTab]);

  // Load Google Calendar status
  const { data: calendarStatus, refetch: refetchCalendarStatus } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/api/integrations/google_calendar/status`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch calendar status');
      return response.json();
    },
    enabled: activeTab === 'settings' && settingsSubTab === 'integrations',
  });

  const handleConnectCalendar = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/integrations/google_calendar/auth`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Auth failed');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to initialize Google Calendar authentication');
      }
    } catch (err) {
      alert('Error connecting to calendar authentication endpoint');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/integrations/google_calendar`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Disconnect failed');
      refetchCalendarStatus();
    } catch (err) {
      alert('Error disconnecting calendar');
    }
  };

  const handleGenerateDigest = async () => {
    setIsGeneratingDigest(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/digests/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: digestSchedule === 'disabled' ? 'daily' : digestSchedule,
          }),
          credentials: 'include',
        }
      );
      if (response.ok) {
        await fetchDigests();
        alert('Digest generated successfully!');
      } else {
        const errData = await response.json();
        alert(`Failed to generate digest: ${errData.error || errData.message}`);
      }
    } catch (err) {
      alert('Error generating digest');
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  const handleSendDigest = async (digestId: string) => {
    setIsSendingDigest(digestId);
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/digests/${digestId}/send`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (response.ok) {
        await fetchDigests();
        alert('Digest email sent successfully!');
      } else {
        const errData = await response.json();
        alert(`Failed to send digest: ${errData.error || errData.message}`);
      }
    } catch (err) {
      alert('Error sending digest');
    } finally {
      setIsSendingDigest(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/api/users/me/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme,
            signature: signature || null,
            autoReply,
            timezone,
            digestSchedule,
            username: profileName || undefined,
          }),
          credentials: 'include',
        }
      );

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('Failed to save settings: server returned non-200');
      }
    } catch (err) {
      console.error('Failed to save settings to API:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (activeTab === 'analytics') {
    return (
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
      >
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-hover)',
              color: 'var(--color-ink)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <AnalyticsPage />
      </Layout>
    );
  }

  if (activeTab === 'settings') {
    return (
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
      >
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-hover)',
              color: 'var(--color-ink)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="text-left">
              <h2
                className="text-[22px] font-bold tracking-tight flex items-center gap-2"
                style={{ color: 'var(--color-ink)' }}
              >
                System Preferences{' '}
                <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
              </h2>
              <p
                className="text-[13px] mt-1"
                style={{ color: 'var(--color-muted)' }}
              >
                Configure your AI operating system, LLM integration, and
                outbound channels.
              </p>
            </div>
            {saveSuccess && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium"
                style={{
                  backgroundColor: 'rgba(63,167,106,.12)',
                  color: 'var(--color-success)',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Changes saved</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Sub-navigation */}
            <div className="md:col-span-1 flex flex-col gap-1.5 relative">
              {[
                {
                  id: 'profile',
                  label: 'General Profile',
                  icon: <User size={15} />,
                },
                {
                  id: 'integrations',
                  label: 'Connections',
                  icon: <Mail size={15} />,
                },
              ].map((subTab) => {
                const isActive = settingsSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setSettingsSubTab(subTab.id)}
                    className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
                    style={{
                      color: isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-muted)',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          'rgba(93,107,47,.05)';
                        (e.currentTarget as HTMLElement).style.color =
                          'var(--color-ink)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          'transparent';
                        (e.currentTarget as HTMLElement).style.color =
                          'var(--color-muted)';
                      }
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSettingsSubTab"
                        className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-[10px] -z-10"
                        transition={{
                          type: 'spring',
                          damping: 25,
                          stiffness: 350,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      {subTab.icon}
                      <span>{subTab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Form card wrapper */}
            <div className="md:col-span-3 space-y-6">
              {settingsSubTab === 'profile' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  {/* General Profile Panel */}
                  <div className="neu-card p-6 space-y-5">
                    <h3 className="text-sm font-semibold text-[var(--color-ink)] font-bold">
                      General & Account Profile
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                          Username
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                          placeholder="e.g. alexchen"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          disabled
                          className="neu-input w-full px-4 py-2.5 text-xs bg-gray-50 text-gray-400 cursor-not-allowed transition-all"
                          placeholder="alex@inboxos.app"
                          required
                        />
                      </div>
                      <div className="space-y-2 col-span-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                          Email Signature
                        </label>
                        <input
                          type="text"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                          placeholder="Sent from InboxOS"
                        />
                      </div>
                      <div className="space-y-2 col-span-1 flex items-center pt-5">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoReply}
                            onChange={(e) => setAutoReply(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
                          />
                          <span className="text-xs font-semibold text-gray-800">
                            Enable Auto Reply
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Theme Preferences Panel */}
                  <div className="neu-card p-6 space-y-4">
                    <h4 className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                      Theme Preferences
                    </h4>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-[var(--color-border)]">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          Interface Theme:{' '}
                          <span className="text-[var(--color-primary)] font-bold capitalize">
                            {theme}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Toggle between dark and light themes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTheme(theme === 'dark' ? 'light' : 'dark')
                        }
                        className="px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider neu-btn"
                      >
                        Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
                      </button>
                    </div>
                  </div>

                  {/* Save Settings Footer Card */}
                  <div className="neu-card p-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold text-xs transition-all active:scale-[0.97] disabled:opacity-50 uppercase tracking-wider shadow-[0_4px_14px_rgba(93,107,47,.25)] hover:shadow-[0_6px_20px_rgba(93,107,47,.35)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:outline-none"
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'ai' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <div className="neu-card p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-ink)] font-bold mb-1">
                        AI Processor Model
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Choose the LLM engine that parses, scores, and
                        classifies incoming streams.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                          AI Provider
                        </label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value)}
                          className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                        >
                          <option value="openai">
                            OpenAI GPT-4o API (Cloud)
                          </option>
                          <option value="gemini">
                            Google Gemini 1.5 Pro API (Cloud)
                          </option>
                          <option value="ollama">
                            Ollama Llama 3 (Local Self-Hosted)
                          </option>
                        </select>
                      </div>

                      {aiProvider === 'openai' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                            OpenAI API Key
                          </label>
                          <input
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                            placeholder="sk-proj-..."
                          />
                        </div>
                      )}

                      {aiProvider === 'gemini' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                            Gemini API Key
                          </label>
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                            placeholder="AIzaSy..."
                          />
                        </div>
                      )}

                      {aiProvider === 'ollama' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                            Ollama Connection URL
                          </label>
                          <input
                            type="url"
                            value={ollamaUrl}
                            onChange={(e) => setOllamaUrl(e.target.value)}
                            className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                            placeholder="http://localhost:11434"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="neu-card p-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold text-xs transition-all active:scale-[0.97] disabled:opacity-50 uppercase tracking-wider shadow-[0_4px_14px_rgba(93,107,47,.25)] hover:shadow-[0_6px_20px_rgba(93,107,47,.35)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:outline-none"
                    >
                      {isSaving ? 'Saving...' : 'Save AI Config'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'integrations' && (
                <div className="space-y-6 text-left">
                  {/* Inbox Connections Card */}
                  <div className="neu-card p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-ink)] font-bold mb-1">
                        Inbox Connections
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Enable ingestion sources or connection webhooks to
                        monitor and fetch mail.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Gmail */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                            <Mail size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                              Gmail Account
                            </p>
                            {gmailConnected ? (
                              <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                {gmailEmail ?? 'Connected'}
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-500 font-medium">
                                Not Connected
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {gmailConnected && (
                            <button
                              onClick={handleSyncGmail}
                              disabled={gmailSyncing}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white active:scale-[0.97] disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
                            >
                              {gmailSyncing && (
                                <Loader2 size={11} className="animate-spin" />
                              )}
                              {gmailSyncing ? 'Syncing...' : 'Sync Inbox'}
                            </button>
                          )}
                          <button
                            onClick={
                              gmailConnected
                                ? handleDisconnectGmail
                                : handleConnectGmail
                            }
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                              gmailConnected
                                ? 'neu-btn'
                                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-transparent active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40'
                            }`}
                          >
                            {gmailConnected ? 'Disconnect' : 'Connect Gmail'}
                          </button>
                        </div>
                      </div>

                      {/* Outlook */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                            <Mail size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                              Outlook / Exchange
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              Not Connected
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setOutlookConnected(!outlookConnected)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                            outlookConnected
                              ? 'neu-btn'
                              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-transparent active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40'
                          }`}
                        >
                          {outlookConnected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>

                      {/* Google Calendar */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                              Google Calendar
                            </p>
                            <p
                              className={`text-[10px] flex items-center gap-1 font-medium ${
                                calendarStatus?.connected
                                  ? 'text-emerald-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {calendarStatus?.connected ? (
                                <>
                                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />{' '}
                                  Connected
                                </>
                              ) : (
                                'Not Connected'
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={
                            calendarStatus?.connected
                              ? handleDisconnectCalendar
                              : handleConnectCalendar
                          }
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                            calendarStatus?.connected
                              ? 'neu-btn'
                              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-transparent active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40'
                          }`}
                        >
                          {calendarStatus?.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Telegram Control Channel Card */}
                  <div className="neu-card p-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                        Telegram Control Channel
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Configure Telegram Bot integration to receive alerts and
                        manage emails.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                            <Radio size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)] font-bold">
                              Telegram Ingestion Bot
                            </p>
                            <p
                              className={`text-[10px] flex items-center gap-1 font-medium ${telegramConnected ? 'text-emerald-600' : 'text-gray-500'}`}
                            >
                              {telegramConnected ? (
                                <>
                                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />{' '}
                                  Active
                                </>
                              ) : (
                                'Inactive'
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setTelegramConnected(!telegramConnected)
                          }
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                            telegramConnected
                              ? 'neu-btn'
                              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-transparent active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40'
                          }`}
                        >
                          {telegramConnected ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>

                      {telegramConnected && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                              Bot Token
                            </label>
                            <input
                              type="password"
                              value={telegramToken}
                              onChange={(e) => setTelegramToken(e.target.value)}
                              className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                              placeholder="Enter Telegram bot token"
                            />
                          </div>

                          {/* Telegram Linking Instruction Card */}
                          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2.5 shadow-sm">
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              💬 Link Your Chat ID
                            </p>
                            <p className="text-[10px] leading-relaxed text-amber-850 font-medium">
                              To sync alerts with your Telegram, message your
                              bot and send the start command with your unique
                              Workspace User ID:
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold select-all w-full text-center text-amber-900">
                                /start {userId || 'Loading...'}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  if (userId) {
                                    navigator.clipboard.writeText(
                                      `/start ${userId}`
                                    );
                                    setToastMessage(
                                      'Link command copied to clipboard!'
                                    );
                                    setTimeout(
                                      () => setToastMessage(null),
                                      3000
                                    );
                                  }
                                }}
                                className="px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-lg text-[10px] uppercase transition-all active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'notifications' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-black font-black mb-1">
                      Notification Routing Rules
                    </h3>
                    <p className="text-[11px] text-gray-600 font-bold">
                      Configure thresholds and channels where InboxOS alerts you
                      about incoming emails.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Push Alerts */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">
                          Dashboard Banner Alerts
                        </p>
                        <p className="text-[10px] text-gray-600 font-bold">
                          Display popup overlays when matching tasks run.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPushEnabled(!pushEnabled)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          pushEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white border border-black border-black text-gray-600 font-bold'
                        }`}
                      >
                        {pushEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Telegram Delivery */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">
                          Telegram Escalation
                        </p>
                        <p className="text-[10px] text-gray-600 font-bold">
                          Forward high-urgency notifications directly to your
                          chat.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTelegramAlerts(!telegramAlerts)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          telegramAlerts
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white border border-black border-black text-gray-600 font-bold'
                        }`}
                      >
                        {telegramAlerts ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">
                          WhatsApp Urgent Alerts
                        </p>
                        <p className="text-[10px] text-gray-600 font-bold">
                          Use Twilio to SMS high importance tasks or billing
                          alerts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          whatsappAlerts
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white border border-black border-black text-gray-600 font-bold'
                        }`}
                      >
                        {whatsappAlerts ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Priority Slider */}
                    <div className="border-t-4 border-black pt-5 space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-800 font-bold">
                        <span>Minimum Priority Alert Score</span>
                        <span className="text-blue-600 font-extrabold">
                          {minPriority}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={minPriority}
                        onChange={(e) => setMinPriority(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-white border border-black shadow-[2px_2px_0_0_#111] rounded-lg cursor-pointer"
                      />
                      <p className="text-[10px] text-gray-600 font-bold">
                        Only emails with AI importance rating at or above{' '}
                        {minPriority} will trigger instant push notifications.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-black font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save Rules'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'digests' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-black font-black mb-1">
                      Email Digests Settings
                    </h3>
                    <p className="text-[11px] text-gray-600 font-bold">
                      Configure your automated low-priority email digests and
                      delivery timezones.
                    </p>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
                          Digest Schedule
                        </label>
                        <select
                          value={digestSchedule}
                          onChange={(e) => setDigestSchedule(e.target.value)}
                          className="w-full bg-white border border-black rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                        >
                          <option value="daily">
                            Daily Digest (at 8:00 AM)
                          </option>
                          <option value="weekly">
                            Weekly Digest (Mondays at 8:00 AM)
                          </option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
                          Schedule Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-white border border-black rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                        >
                          <option value="UTC">
                            UTC (Universal Coordinated Time)
                          </option>
                          <option value="America/New_York">
                            EST/EDT (America/New_York)
                          </option>
                          <option value="America/Chicago">
                            CST/CDT (America/Chicago)
                          </option>
                          <option value="America/Denver">
                            MST/MDT (America/Denver)
                          </option>
                          <option value="America/Los_Angeles">
                            PST/PDT (America/Los_Angeles)
                          </option>
                          <option value="Europe/London">
                            GMT/BST (Europe/London)
                          </option>
                          <option value="Europe/Paris">
                            CET/CEST (Europe/Paris)
                          </option>
                          <option value="Asia/Tokyo">JST (Asia/Tokyo)</option>
                          <option value="Asia/Kolkata">
                            IST (Asia/Kolkata)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={handleGenerateDigest}
                        disabled={isGeneratingDigest}
                        className="px-4 py-2.5 rounded-xl bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-200 border border-black font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                      >
                        {isGeneratingDigest
                          ? 'Generating...'
                          : 'Compile Digest Now'}
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-black font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                      >
                        {isSaving ? 'Saving...' : 'Save Digest Preferences'}
                      </button>
                    </div>
                  </form>

                  <div className="border-t-4 border-black pt-5 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-800 font-bold">
                      Recent Generated Digests
                    </h4>

                    {digests.length === 0 ? (
                      <div className="p-8 rounded-xl bg-white/3 border border-black text-center text-xs text-gray-600 font-bold">
                        No digests generated yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {digests.map((d) => {
                          const contentData = d.content as any;
                          return (
                            <div
                              key={d.id}
                              className="p-4 rounded-xl bg-white/3 border border-black space-y-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs font-bold text-blue-600 capitalize">
                                    {d.type} Digest
                                  </span>
                                  <span className="text-[10px] text-gray-600 font-bold ml-2">
                                    Generated:{' '}
                                    {new Date(d.createdAt).toLocaleString()}
                                  </span>
                                  <div className="text-[10px] text-gray-700 font-bold mt-1">
                                    Status:{' '}
                                    <span
                                      className={`font-bold ${d.status === 'sent' ? 'text-emerald-400' : d.status === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}
                                    >
                                      {d.status}
                                    </span>
                                    {d.sentAt &&
                                      ` (Sent: ${new Date(d.sentAt).toLocaleString()})`}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSendDigest(d.id)}
                                  disabled={isSendingDigest === d.id}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                  {isSendingDigest === d.id
                                    ? 'Sending...'
                                    : 'Send Test Email'}
                                </button>
                              </div>

                              <div className="rounded-lg border border-black bg-black/30 overflow-hidden">
                                <div className="bg-white border border-black px-3 py-2 text-[10px] text-gray-700 font-bold font-bold border-b-4 border-black">
                                  HTML Preview (Dark Glassmorphism)
                                </div>
                                <div className="p-1 h-[320px] bg-[#0d0f1a]">
                                  <iframe
                                    title={`Preview of ${d.id}`}
                                    srcDoc={contentData?.html || ''}
                                    className="w-full h-full border-none rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (activeTab === 'tasks') {
    const pending = tasksList.filter((t) => !t.isCompleted);
    const completed = tasksList.filter((t) => t.isCompleted);
    return (
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--color-ink)',
              border: '1px solid var(--color-ink)',
              boxShadow: '5px 5px 0 var(--color-accent)',
              fontFamily: 'var(--font-body)',
              color: '#fff',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <h2
                className="text-[22px] font-bold tracking-tight flex items-center gap-2"
                style={{ color: 'var(--color-ink)' }}
              >
                <ListChecks
                  size={20}
                  style={{ color: 'var(--color-primary)' }}
                />
                Dashboard Tasks
              </h2>
              <p
                className="text-[13px] mt-1"
                style={{ color: 'var(--color-muted)' }}
              >
                AI-extracted action items from your inbox. {tasksTotal} total
                tracked.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: showCompleted
                    ? 'rgba(93,107,47,.08)'
                    : 'var(--color-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  color: showCompleted
                    ? 'var(--color-primary)'
                    : 'var(--color-muted)',
                }}
              >
                <CheckSquare size={14} />
                {showCompleted ? 'Hide Completed' : 'Show Completed'}
              </button>
            </div>
          </div>

          {tasksLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-[16px] animate-pulse"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />
              ))}
            </div>
          ) : tasksList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div
                className="w-16 h-16 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'rgba(93,107,47,.10)',
                  color: 'var(--color-primary)',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <p
                className="text-[15px] font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                No tasks found
              </p>
              <p
                className="text-[13px]"
                style={{ color: 'var(--color-muted)' }}
              >
                Process emails in your inbox to extract action items
                automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending tasks */}
              {pending.length > 0 && (
                <div className="space-y-2">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-3"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Pending — {pending.length}
                  </div>
                  {pending.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-[16px] transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          'var(--shadow-card)';
                        (e.currentTarget as HTMLElement).style.transform =
                          'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          'var(--shadow-sm)';
                        (e.currentTarget as HTMLElement).style.transform = '';
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() =>
                            handleToggleTask(task.id, task.isCompleted)
                          }
                          className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all hover:scale-110"
                          style={{
                            border: '2px solid var(--color-border)',
                            backgroundColor: 'transparent',
                          }}
                          aria-label="Mark complete"
                        >
                          <span />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-medium leading-snug"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {task.taskDescription}
                          </p>
                          {task.email && (
                            <p
                              className="text-[11px] mt-1"
                              style={{ color: 'var(--color-muted)' }}
                            >
                              From:{' '}
                              <span className="font-semibold">
                                {task.email.sender}
                              </span>{' '}
                              · {task.email.subject}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 p-1.5 rounded-lg transition-all hover:opacity-70"
                        style={{
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-muted)',
                        }}
                        aria-label="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed tasks */}
              {showCompleted && completed.length > 0 && (
                <div className="space-y-2">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-3"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Completed — {completed.length}
                  </div>
                  {completed.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-[16px] opacity-50 transition-all"
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() =>
                            handleToggleTask(task.id, task.isCompleted)
                          }
                          className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
                          style={{
                            border: '2px solid var(--color-primary)',
                            backgroundColor: 'rgba(93,107,47,.10)',
                            color: 'var(--color-primary)',
                          }}
                          aria-label="Mark incomplete"
                        >
                          <CheckCircle2 size={11} />
                        </button>
                        <p
                          className="text-[13px] line-through"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {task.taskDescription}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 p-1.5 rounded-lg hover:opacity-70"
                        style={{
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-muted)',
                        }}
                        aria-label="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (activeTab === 'rules') {
    return (
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--color-ink)',
              border: '1px solid var(--color-ink)',
              boxShadow: '5px 5px 0 var(--color-accent)',
              fontFamily: 'var(--font-body)',
              color: '#fff',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <h2
                className="text-[22px] font-bold tracking-tight flex items-center gap-2"
                style={{ color: 'var(--color-ink)' }}
              >
                <Zap size={20} style={{ color: 'var(--color-primary)' }} />
                Routing Rules
              </h2>
              <p
                className="text-[13px] mt-1"
                style={{ color: 'var(--color-muted)' }}
              >
                DSL-powered decision rules. Define conditions, actions, and
                priority routing for your inbox.
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-[10px] transition-all"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(93,107,47,.25)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 6px 20px rgba(93,107,47,.35)';
                (e.currentTarget as HTMLElement).style.transform =
                  'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 4px 14px rgba(93,107,47,.25)';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <Plus size={14} />
              New Rule
            </button>
          </div>

          <div className="space-y-3">
            {rulesList.map((rule, idx) => (
              <div
                key={rule.id}
                className="p-5 rounded-[22px] transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: rule.enabled ? 'var(--shadow-card)' : 'none',
                  opacity: rule.enabled ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (rule.enabled) {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      'var(--shadow-hover)';
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    rule.enabled ? 'var(--shadow-card)' : 'none';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: rule.enabled
                            ? 'rgba(93,107,47,.12)'
                            : 'rgba(0,0,0,.06)',
                          color: rule.enabled
                            ? 'var(--color-primary)'
                            : 'var(--color-muted)',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span
                        className="text-[15px] font-semibold"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {rule.name}
                      </span>
                      <span
                        className="text-[11px] ml-auto"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {rule.executions} runs
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest shrink-0 pt-0.5 rounded"
                          style={{
                            color: 'var(--color-muted)',
                            minWidth: '40px',
                          }}
                        >
                          IF
                        </span>
                        <code
                          className="text-[12px] font-mono"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {rule.condition}
                        </code>
                      </div>
                      <div className="flex items-start gap-3">
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest shrink-0 pt-0.5"
                          style={{
                            color: 'var(--color-muted)',
                            minWidth: '40px',
                          }}
                        >
                          THEN
                        </span>
                        <code
                          className="text-[12px] font-mono"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {rule.action}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setRulesList((prev) =>
                          prev.map((r) =>
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          )
                        )
                      }
                      className="px-3 py-1.5 text-[12px] font-medium rounded-full transition-all"
                      style={{
                        border: '1px solid var(--color-border)',
                        backgroundColor: rule.enabled
                          ? 'rgba(93,107,47,.10)'
                          : 'transparent',
                        color: rule.enabled
                          ? 'var(--color-primary)'
                          : 'var(--color-muted)',
                      }}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rules info */}
          <div
            className="p-4 flex items-start gap-3 rounded-[16px]"
            style={{
              border: '1px solid rgba(93,107,47,.15)',
              backgroundColor: 'rgba(93,107,47,.04)',
            }}
          >
            <AlertCircle
              size={15}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--color-primary)' }}
            />
            <div>
              <p
                className="text-[13px] font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                Rules run on every incoming email
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                Evaluated top-to-bottom. First matching rule wins. Define custom
                DSL conditions in the rule editor.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      theme={theme}
      onToggleTheme={() =>
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
      }
    >
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-hover)',
            color: 'var(--color-ink)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="space-y-6 animate-fadeIn">
        {/* Clean Dashboard Header */}
        <div className="flex flex-row items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="text-left">
            <h2
              className="text-[22px] font-bold tracking-tight flex items-center gap-2"
              style={{ color: 'var(--color-ink)' }}
            >
              My Inbox
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
            </h2>
            <p
              className="text-[13px] mt-1"
              style={{ color: 'var(--color-muted)' }}
            >
              Real-time, direct sync with your connected Google account.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncGmail}
              disabled={gmailSyncing}
              className="px-4 py-2.5 text-[13px] font-semibold rounded-[10px] flex items-center gap-2 transition-all"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(93,107,47,.25)',
              }}
              onMouseEnter={(e) => {
                if (!gmailSyncing) {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 6px 20px rgba(93,107,47,.35)';
                  (e.currentTarget as HTMLElement).style.transform =
                    'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 4px 14px rgba(93,107,47,.25)';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <RefreshCw
                size={14}
                className={gmailSyncing ? 'animate-spin' : ''}
              />
              <span>{gmailSyncing ? 'Syncing...' : 'Sync Inbox'}</span>
            </button>
          </div>
        </div>

        {/* Full-width Email list */}
        <div className="w-full">
          <EmailList
            gmailConnected={gmailConnected}
            onConnectGmail={handleConnectGmail}
          />
        </div>
      </div>
    </Layout>
  );
};

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark', 'dark-theme');
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--global-mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--global-mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <DashboardContent />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        {/* Fallback to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ComposeModal />
    </>
  );
}
