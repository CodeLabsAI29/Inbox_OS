import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { DeadlinesWidget } from './components/DeadlinesWidget';
import { SocketProvider, useSocket } from './context/SocketContext';
import {
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Inbox,
  Filter,
  Zap,
  Play,
  Sliders,
  User,
  Bot,
  Mail,
  Radio,
  Bell,
  Calendar,
  Clock,
  CheckSquare,
  Trash2,
  ListChecks,
  AlertCircle,
  Plus,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
  bg?: string;
  accent?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive,
  icon,
  accent,
}) => {
  const accentColor = accent || (isPositive ? 'var(--color-success)' : 'var(--color-danger)');

  return (
    <div
      className="relative overflow-hidden p-5 rounded-[22px] transition-all duration-250"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[22px]" style={{ backgroundColor: accentColor }} />
      <div className="flex justify-between items-start mb-4 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{title}</span>
        <div className="p-2 flex items-center justify-center rounded-xl" style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          {value}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isPositive ? 'rgba(63,167,106,.12)' : 'rgba(217,104,87,.12)',
            color: accentColor,
          }}
        >
          {change}
        </span>
      </div>
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accentColor }} />
    </div>
  );
};


// Extracted Dashboard Component to protect via ProtectedRoute
const DashboardContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/dashboard/stats`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('task.created', (data: any) => {
      setToastMessage(`New Task Extracted: ${data.title}`);
      setTimeout(() => setToastMessage(null), 4000);
      refetchStats();
    });

    socket.on('rule.executed', (data: any) => {
      setToastMessage(`Rule Executed: "${data.ruleName}" (${data.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      refetchStats();
    });

    socket.on('email.received', () => {
      refetchStats();
    });

    return () => {
      socket.off('task.created');
      socket.off('rule.executed');
      socket.off('email.received');
    };
  }, [socket, refetchStats]);

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
  const [profileName, setProfileName] = useState('Alex Chen');
  const [profileEmail, setProfileEmail] = useState('demo@inboxos.app');
  const [aiProvider, setAiProvider] = useState('openai');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [gmailConnected, setGmailConnected] = useState(true);
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
    { id: '1', name: 'Invoice Auto-Tag', condition: 'subject contains "invoice" OR "payment"', action: 'Label → Finance · Priority High', enabled: true, executions: 142 },
    { id: '2', name: 'Newsletter Digest', condition: 'sender domain in [substack.com, beehiiv.com]', action: 'Archive · Add to Weekly Digest', enabled: true, executions: 87 },
    { id: '3', name: 'OTP Fast-Path', condition: 'subject matches /\\b\\d{4,8}\\b/ AND sender trusted', action: 'Extract OTP → Clipboard · Archive', enabled: true, executions: 319 },
    { id: '4', name: 'Support Escalation', condition: 'body contains "urgent" AND priority >= 80', action: 'Notify Telegram · Flag Red', enabled: false, executions: 23 },
  ]);

  // Synced backend settings fields
  const [signature, setSignature] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [timezone, setTimezone] = useState('UTC');
  const [digestSchedule, setDigestSchedule] = useState('daily');

  // Digests list state
  const [digests, setDigests] = useState<any[]>([]);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState<string | null>(null);

  const fetchDigests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/digests?limit=5`, {
        credentials: 'include',
      });
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
        const res = await fetch(
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
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !current }),
        credentials: 'include',
      });
      if (res.ok) {
        setTasksList(prev =>
          prev.map(t => t.id === id ? { ...t, isCompleted: !current } : t)
        );
      }
    } catch (err) {
      console.error('[Tasks] toggle error', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setTasksList(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('[Tasks] delete error', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      if (tab && ['profile', 'ai', 'integrations', 'notifications', 'digests'].includes(tab)) {
        setSettingsSubTab(tab);
      }
    }
  }, [location.search, activeTab]);

  // Load preferences from backend settings API
  useEffect(() => {
    if (activeTab !== 'settings') return;

    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me/settings`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme || 'dark');
          setSignature(data.signature || '');
          setAutoReply(!!data.autoReply);
          setTimezone(data.timezone || 'UTC');
          setDigestSchedule(data.digestSchedule || 'daily');
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };

    loadSettings();
  }, [activeTab]);

  // Load Google Calendar status
  const { data: calendarStatus, refetch: refetchCalendarStatus } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const response = await fetch(
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
      const response = await fetch(
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
      const response = await fetch(
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
      const response = await fetch(`${API_BASE}/api/digests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: digestSchedule === 'disabled' ? 'daily' : digestSchedule,
        }),
        credentials: 'include',
      });
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
      const response = await fetch(`${API_BASE}/api/digests/${digestId}/send`, {
        method: 'POST',
        credentials: 'include',
      });
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
      const res = await fetch(`${API_BASE}/api/users/me/settings`, {
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
        }),
        credentials: 'include',
      });

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

  const metrics = [
    {
      title: 'Total Ingested',
      value: stats?.totalIngested?.value ?? '0',
      change: stats?.totalIngested?.change ?? '0%',
      isPositive: stats?.totalIngested?.isPositive ?? true,
      icon: <Inbox size={18} />,
      bg: '#BBF7D0',
      accent: 'var(--color-success)',
    },
    {
      title: 'Urgent Action Required',
      value: stats?.pendingActions?.value ?? '0',
      change: stats?.pendingActions?.change ?? '0%',
      isPositive: stats?.pendingActions?.isPositive ?? true,
      icon: <ShieldAlert size={18} className="text-amber-400 animate-pulse" />,
      bg: '#FEF08A',
      accent: 'var(--color-pending)',
    },
    {
      title: 'Auto-resolved / Closed',
      value: stats?.resolutionRate?.value ?? '0%',
      change: stats?.resolutionRate?.change ?? '0%',
      isPositive: stats?.resolutionRate?.isPositive ?? true,
      icon: <CheckCircle2 size={18} className="text-emerald-400" />,
      bg: '#FECACA',
      accent: 'var(--color-danger)',
    },
    {
      title: 'Average Action Time',
      value: '1.2m',
      change: '-12%',
      isPositive: true,
      icon: <Clock size={18} />,
      bg: '#BFDBFE',
      accent: 'var(--color-accent-cta)',
    },
  ];

  if (activeTab === 'analytics') {
    return (
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-hover)', color: 'var(--color-ink)' }}
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
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-hover)', color: 'var(--color-ink)' }}>
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="text-left">
              <h2 className="text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                System Preferences <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
                Configure your AI operating system, LLM integration, and outbound channels.
              </p>
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium" style={{ backgroundColor: 'rgba(63,167,106,.12)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={14} />
                <span>Changes saved</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Sub-navigation */}
            <div className="md:col-span-1 flex flex-col gap-1.5">
              {[
                { id: 'profile', label: 'General Profile', icon: <User size={15} /> },
                { id: 'ai', label: 'AI Intelligence', icon: <Bot size={15} /> },
                { id: 'integrations', label: 'Connections', icon: <Mail size={15} /> },
                { id: 'notifications', label: 'Alert Rules', icon: <Bell size={15} /> },
                { id: 'digests', label: 'Email Digests', icon: <Sliders size={15} /> },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setSettingsSubTab(subTab.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all text-left"
                  style={{
                    backgroundColor: settingsSubTab === subTab.id ? 'rgba(93,107,47,.10)' : 'transparent',
                    color: settingsSubTab === subTab.id ? 'var(--color-primary)' : 'var(--color-muted)',
                  }}
                  onMouseEnter={e => { if (settingsSubTab !== subTab.id) { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(93,107,47,.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'; } }}
                  onMouseLeave={e => { if (settingsSubTab !== subTab.id) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'; } }}
                >
                  {subTab.icon}
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* Form card */}
            <div
              className="md:col-span-3 relative overflow-hidden p-6 rounded-[22px]"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
            >

              {settingsSubTab === 'profile' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <h3 className="text-sm font-semibold text-black font-black">
                    General & Account Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                        placeholder="Alex Chen"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="neu-input w-full px-4 py-2.5 text-xs transition-all"
                        placeholder="alex@inboxos.app"
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
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
                          className="h-4 w-4 rounded border-white/10 bg-white border border-black text-indigo-600 focus:ring-indigo-500/30"
                        />
                        <span className="text-xs font-semibold text-gray-800 font-bold">
                          Enable Auto Reply
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t-4 border-black pt-5 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-800 font-bold">
                      Theme Preferences
                    </h4>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">
                          Interface Theme:{' '}
                          <span className="text-blue-600 capitalize">
                            {theme}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-600 font-bold">
                          Toggle between dark and light themes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTheme(theme === 'dark' ? 'light' : 'dark')
                        }
                        className="px-3 py-1.5 rounded-lg bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-800 font-bold border border-black text-[10px] font-bold transition-all uppercase tracking-wider"
                      >
                        Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-black font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'ai' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-black font-black mb-1">
                      AI Processor Model
                    </h3>
                    <p className="text-[11px] text-gray-600 font-bold">
                      Choose the LLM engine that parses, scores, and classifies
                      incoming streams.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
                        AI Provider
                      </label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full bg-white border border-black rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
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
                        <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
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
                        <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
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
                        <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
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

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-black font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save AI Config'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'integrations' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-black font-black mb-1">
                      Inbox Connections
                    </h3>
                    <p className="text-[11px] text-gray-600 font-bold">
                      Enable ingestion sources or connection webhooks to monitor
                      and fetch mail.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Gmail */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-black font-black">
                            Gmail Account
                          </p>
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />{' '}
                            Connected
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setGmailConnected(!gmailConnected)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          gmailConnected
                            ? 'bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-800 font-bold border-black'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-black font-black border-transparent'
                        }`}
                      >
                        {gmailConnected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {/* Outlook */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-black font-black">
                            Outlook / Exchange
                          </p>
                          <p className="text-[10px] text-gray-600 font-bold">
                            Not Connected
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setOutlookConnected(!outlookConnected)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          outlookConnected
                            ? 'bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-800 font-bold border-black'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-black font-black border-transparent'
                        }`}
                      >
                        {outlookConnected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {/* Google Calendar */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-black font-black">
                            Google Calendar
                          </p>
                          <p
                            className={`text-[10px] flex items-center gap-1 font-medium ${
                              calendarStatus?.connected
                                ? 'text-emerald-400'
                                : 'text-gray-600 font-bold'
                            }`}
                          >
                            {calendarStatus?.connected ? (
                              <>
                                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />{' '}
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
                            ? 'bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-800 font-bold border-black'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-black font-black border-transparent'
                        }`}
                      >
                        {calendarStatus?.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {/* Telegram Bot */}
                    <div className="border-t-4 border-black pt-5 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-800 font-bold">
                        Telegram Control Channel
                      </h4>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-black">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                            <Radio size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-black font-black">
                              Telegram Ingestion Bot
                            </p>
                            <p
                              className={`text-[10px] flex items-center gap-1 font-medium ${telegramConnected ? 'text-emerald-400' : 'text-gray-600 font-bold'}`}
                            >
                              {telegramConnected ? (
                                <>
                                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />{' '}
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
                              ? 'bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-gray-800 font-bold border-black'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-black font-black border-transparent'
                          }`}
                        >
                          {telegramConnected ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>

                      {telegramConnected && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-700 font-bold uppercase tracking-wider block">
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
    const pending = tasksList.filter(t => !t.isCompleted);
    const completed = tasksList.filter(t => t.isCompleted);
    return (
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'var(--color-ink)', border: '1px solid var(--color-ink)', boxShadow: '5px 5px 0 var(--color-accent)', fontFamily: 'var(--font-body)', color: '#fff' }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                <ListChecks size={20} style={{ color: 'var(--color-primary)' }} />
                Dashboard Tasks
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
                AI-extracted action items from your inbox. {tasksTotal} total tracked.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: showCompleted ? 'rgba(93,107,47,.08)' : 'var(--color-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  color: showCompleted ? 'var(--color-primary)' : 'var(--color-muted)',
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
                <div key={i} className="h-16 rounded-[16px] animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
              ))}
            </div>
          ) : tasksList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(93,107,47,.10)', color: 'var(--color-primary)' }}>
                <CheckCircle2 size={28} />
              </div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>No tasks found</p>
              <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Process emails in your inbox to extract action items automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending tasks */}
              {pending.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-3" style={{ color: 'var(--color-muted)' }}>
                    Pending — {pending.length}
                  </div>
                  {pending.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-[16px] transition-all duration-200"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task.id, task.isCompleted)}
                          className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all hover:scale-110"
                          style={{ border: '2px solid var(--color-border)', backgroundColor: 'transparent' }}
                          aria-label="Mark complete"
                        >
                          <span />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>
                            {task.taskDescription}
                          </p>
                          {task.email && (
                            <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>
                              From: <span className="font-semibold">{task.email.sender}</span> · {task.email.subject}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 p-1.5 rounded-lg transition-all hover:opacity-70"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
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
                  <div className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-3" style={{ color: 'var(--color-muted)' }}>
                    Completed — {completed.length}
                  </div>
                  {completed.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-[16px] opacity-50 transition-all"
                      style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task.id, task.isCompleted)}
                          className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
                          style={{ border: '2px solid var(--color-primary)', backgroundColor: 'rgba(93,107,47,.10)', color: 'var(--color-primary)' }}
                          aria-label="Mark incomplete"
                        >
                          <CheckCircle2 size={11} />
                        </button>
                        <p className="text-[13px] line-through" style={{ color: 'var(--color-muted)' }}>
                          {task.taskDescription}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 p-1.5 rounded-lg hover:opacity-70"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
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
            style={{ backgroundColor: 'var(--color-ink)', border: '1px solid var(--color-ink)', boxShadow: '5px 5px 0 var(--color-accent)', fontFamily: 'var(--font-body)', color: '#fff' }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                <Zap size={20} style={{ color: 'var(--color-primary)' }} />
                Routing Rules
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
                DSL-powered decision rules. Define conditions, actions, and priority routing for your inbox.
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-[10px] transition-all"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(93,107,47,.25)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(93,107,47,.35)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(93,107,47,.25)';
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
                onMouseEnter={e => { if (rule.enabled) { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = rule.enabled ? 'var(--shadow-card)' : 'none'; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: rule.enabled ? 'rgba(93,107,47,.12)' : 'rgba(0,0,0,.06)', color: rule.enabled ? 'var(--color-primary)' : 'var(--color-muted)' }}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                        {rule.name}
                      </span>
                      <span className="text-[11px] ml-auto" style={{ color: 'var(--color-muted)' }}>
                        {rule.executions} runs
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest shrink-0 pt-0.5 rounded" style={{ color: 'var(--color-muted)', minWidth: '40px' }}>IF</span>
                        <code className="text-[12px] font-mono" style={{ color: 'var(--color-ink)' }}>{rule.condition}</code>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest shrink-0 pt-0.5" style={{ color: 'var(--color-muted)', minWidth: '40px' }}>THEN</span>
                        <code className="text-[12px] font-mono" style={{ color: 'var(--color-primary)' }}>{rule.action}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setRulesList(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-full transition-all"
                      style={{
                        border: '1px solid var(--color-border)',
                        backgroundColor: rule.enabled ? 'rgba(93,107,47,.10)' : 'transparent',
                        color: rule.enabled ? 'var(--color-primary)' : 'var(--color-muted)',
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
          <div className="p-4 flex items-start gap-3 rounded-[16px]" style={{ border: '1px solid rgba(93,107,47,.15)', backgroundColor: 'rgba(93,107,47,.04)' }}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>Rules run on every incoming email</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Evaluated top-to-bottom. First matching rule wins. Define custom DSL conditions in the rule editor.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-medium shadow-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-hover)', color: 'var(--color-ink)' }}>
          <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
              Workspace Overview
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
            </h2>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
              InboxOS has resolved 87 tasks today automatically. Your inbox is clean.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'; }}
            >
              Diagnostics
            </button>
            <button className="px-4 py-2 text-[13px] font-semibold rounded-[10px] flex items-center gap-1.5 transition-all"
              style={{ backgroundColor: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 14px rgba(93,107,47,.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(93,107,47,.35)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(93,107,47,.25)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <Play size={12} fill="currentColor" />
              <span>Run Pipeline</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-semibold text-black font-black flex items-center gap-2">
                <Inbox size={16} className="text-blue-600" />
                <span>Smart Inbound Streams</span>
              </h3>
            </div>

            <EmailList />
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-black font-black flex items-center gap-2 px-2">
                <Filter size={16} className="text-blue-600" />
                <span>Active Routing Rules</span>
              </h3>

              <div className="neu-card rounded-2xl p-4 border border-black space-y-3.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-black border border-black">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">
                        OTP Auto-Extract
                      </p>
                      <p className="text-[9px] text-gray-600 font-bold">
                        Fast-path codes to clipboard
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500 text-black border border-black border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-black border border-black">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">
                        Finance Alert Channel
                      </p>
                      <p className="text-[9px] text-gray-600 font-bold">
                        Route invoices to WhatsApp
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500 text-black border border-black border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-black border border-black">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-gray-700 font-bold" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">
                        Newsletter Digest
                      </p>
                      <p className="text-[9px] text-gray-600 font-bold">
                        Compile weekly updates
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500 text-black border border-black border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <button className="w-full py-2.5 rounded-xl bg-white border border-black hover:bg-white border border-black shadow-[2px_2px_0_0_#111] text-xs font-semibold text-blue-600 border border-black transition-all text-center block">
                  Manage Rules DSL
                </button>
              </div>
            </div>

            <DeadlinesWidget />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-black font-black flex items-center gap-2 px-2">
                <TrendingUp size={16} className="text-blue-600" />
                <span>Decision Pipeline Load</span>
              </h3>

              <div className="neu-card rounded-2xl p-5 border border-black space-y-4">
                <div className="h-16 flex items-end gap-1.5">
                  {[
                    45, 60, 30, 80, 65, 95, 40, 50, 75, 90, 85, 30, 45, 60, 85,
                    95, 70, 55, 60, 90,
                  ].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-indigo-500/30 rounded-t transition-all hover:bg-indigo-500"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-600 font-bold border-t-4 border-black pt-3">
                  <span>12 AM</span>
                  <span>12 PM</span>
                  <span>11 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default function App() {
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
