import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmailList } from './components/EmailList';
import { ComposeModal } from './components/ComposeModal';
import { LandingPage } from './components/LandingPage';
import { SocketProvider, useSocket } from './context/SocketContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
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
  Bell
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive, icon }) => {
  return (
    <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:translate-y-[-2px]">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        <div className="p-2 rounded-xl bg-white/5 text-indigo-400">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {change}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
    </div>
  );
};

// Extracted Dashboard Component to protect via ProtectedRoute
const DashboardContent: React.FC = () => {
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
    if (path.endsWith('/settings') || path.includes('/settings/')) return 'settings';
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

  // Synced backend settings fields
  const [signature, setSignature] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Load preferences from backend settings API
  useEffect(() => {
    if (activeTab !== 'settings') return;

    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me/settings`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme || 'dark');
          setSignature(data.signature || '');
          setAutoReply(!!data.autoReply);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };

    loadSettings();
  }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          theme,
          signature: signature || null,
          autoReply
        }),
        credentials: 'include'
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
    { title: 'Total Ingested', value: '1,284', change: '+12%', isPositive: true, icon: <Inbox size={18} /> },
    { title: 'Urgent Action Required', value: '4', change: '-25%', isPositive: true, icon: <ShieldAlert size={18} className="text-amber-400 animate-pulse" /> },
    { title: 'Auto-resolved / Closed', value: '84%', change: '+3.5%', isPositive: true, icon: <CheckCircle2 size={18} className="text-emerald-400" /> },
    { title: 'Average Action Time', value: '1.2m', change: '-12%', isPositive: true, icon: <Clock size={18} /> },
  ];

  if (activeTab === 'settings') {
    return (
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-600/95 border border-indigo-500/30 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
            <Sparkles size={14} className="text-amber-300" />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div className="text-left">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                System Preferences <Sliders className="text-indigo-400 animate-pulse" size={18} />
              </h2>
              <p className="text-xs text-gray-400">
                Configure your AI operating system settings, LLM integration, and outbound channels.
              </p>
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-bounce">
                <CheckCircle2 size={14} />
                <span>Changes saved successfully</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            
            {/* Preferences sub-navigation */}
            <div className="md:col-span-1 flex flex-col gap-1.5">
              {[
                { id: 'profile', label: 'General Profile', icon: <User size={16} /> },
                { id: 'ai', label: 'AI Intelligence', icon: <Bot size={16} /> },
                { id: 'integrations', label: 'Connections', icon: <Mail size={16} /> },
                { id: 'notifications', label: 'Alert Rules', icon: <Bell size={16} /> },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setSettingsSubTab(subTab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all border text-left ${
                    settingsSubTab === subTab.id
                      ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                      : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {subTab.icon}
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* Form card */}
            <div className="md:col-span-3 glass border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
              
              {settingsSubTab === 'profile' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <h3 className="text-sm font-semibold text-white">General & Account Profile</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                        placeholder="Alex Chen"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                        placeholder="alex@inboxos.app"
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Signature</label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                        placeholder="Sent from InboxOS"
                      />
                    </div>
                    <div className="space-y-2 col-span-1 flex items-center pt-5">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoReply}
                          onChange={(e) => setAutoReply(e.target.checked)}
                          className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/30"
                        />
                        <span className="text-xs font-semibold text-gray-300">Enable Auto Reply</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-5 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-300">Theme Preferences</h4>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Interface Theme: <span className="text-indigo-400 capitalize">{theme}</span></p>
                        <p className="text-[10px] text-gray-500">Toggle between dark and light themes.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 text-[10px] font-bold transition-all uppercase tracking-wider"
                      >
                        Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'ai' && (
                <form onSubmit={handleSave} className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">AI Processor Model</h3>
                    <p className="text-[11px] text-gray-500">Choose the LLM engine that parses, scores, and classifies incoming streams.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">AI Provider</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full bg-[#131625] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                      >
                        <option value="openai">OpenAI GPT-4o API (Cloud)</option>
                        <option value="gemini">Google Gemini 1.5 Pro API (Cloud)</option>
                        <option value="ollama">Ollama Llama 3 (Local Self-Hosted)</option>
                      </select>
                    </div>

                    {aiProvider === 'openai' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">OpenAI API Key</label>
                        <input
                          type="password"
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                          placeholder="sk-proj-..."
                        />
                      </div>
                    )}

                    {aiProvider === 'gemini' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gemini API Key</label>
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                          placeholder="AIzaSy..."
                        />
                      </div>
                    )}

                    {aiProvider === 'ollama' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ollama Connection URL</label>
                        <input
                          type="url"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                          placeholder="http://localhost:11434"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save AI Config'}
                    </button>
                  </div>
                </form>
              )}

              {settingsSubTab === 'integrations' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Inbox Connections</h3>
                    <p className="text-[11px] text-gray-500">Enable ingestion sources or connection webhooks to monitor and fetch mail.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Gmail */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Gmail Account</p>
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /> Connected
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setGmailConnected(!gmailConnected)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          gmailConnected 
                            ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                        }`}
                      >
                        {gmailConnected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {/* Outlook */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Outlook / Exchange</p>
                          <p className="text-[10px] text-gray-500">Not Connected</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setOutlookConnected(!outlookConnected)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          outlookConnected 
                            ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                        }`}
                      >
                        {outlookConnected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {/* Telegram Bot */}
                    <div className="border-t border-white/5 pt-5 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-300">Telegram Control Channel</h4>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                            <Radio size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">Telegram Ingestion Bot</p>
                            <p className={`text-[10px] flex items-center gap-1 font-medium ${telegramConnected ? 'text-emerald-400' : 'text-gray-500'}`}>
                              {telegramConnected ? (
                                <>
                                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /> Active
                                </>
                              ) : 'Inactive'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setTelegramConnected(!telegramConnected)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                            telegramConnected 
                              ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                          }`}
                        >
                          {telegramConnected ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>

                      {telegramConnected && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bot Token</label>
                          <input
                            type="password"
                            value={telegramToken}
                            onChange={(e) => setTelegramToken(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
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
                    <h3 className="text-sm font-semibold text-white mb-1">Notification Routing Rules</h3>
                    <p className="text-[11px] text-gray-500">Configure thresholds and channels where InboxOS alerts you about incoming emails.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Push Alerts */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Dashboard Banner Alerts</p>
                        <p className="text-[10px] text-gray-500">Display popup overlays when matching tasks run.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPushEnabled(!pushEnabled)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          pushEnabled 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 border-white/5 text-gray-500'
                        }`}
                      >
                        {pushEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Telegram Delivery */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Telegram Escalation</p>
                        <p className="text-[10px] text-gray-500">Forward high-urgency notifications directly to your chat.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTelegramAlerts(!telegramAlerts)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          telegramAlerts 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 border-white/5 text-gray-500'
                        }`}
                      >
                        {telegramAlerts ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">WhatsApp Urgent Alerts</p>
                        <p className="text-[10px] text-gray-500">Use Twilio to SMS high importance tasks or billing alerts.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${
                          whatsappAlerts 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 border-white/5 text-gray-500'
                        }`}
                      >
                        {whatsappAlerts ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Priority Slider */}
                    <div className="border-t border-white/5 pt-5 space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
                        <span>Minimum Priority Alert Score</span>
                        <span className="text-indigo-400 font-extrabold">{minPriority}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={minPriority}
                        onChange={(e) => setMinPriority(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <p className="text-[10px] text-gray-500">
                        Only emails with AI importance rating at or above {minPriority} will trigger instant push notifications.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isSaving ? 'Saving...' : 'Save Rules'}
                    </button>
                  </div>
                </form>
              )}

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
    >
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-600/95 border border-indigo-500/30 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          <Sparkles size={14} className="text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Workspace Overview <Sparkles size={16} className="text-indigo-400" />
            </h2>
            <p className="text-xs text-gray-400">
              InboxOS has resolved **87** tasks today automatically. Your inbox is clean.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/5 transition-all">
              Diagnostics
            </button>
            <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all glow-accent">
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
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Inbox size={16} className="text-indigo-400" />
                <span>Smart Inbound Streams</span>
              </h3>
            </div>

            <EmailList />
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 px-2">
                <Filter size={16} className="text-indigo-400" />
                <span>Active Routing Rules</span>
              </h3>

              <div className="glass rounded-2xl p-4 border border-white/5 space-y-3.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">OTP Auto-Extract</p>
                      <p className="text-[9px] text-gray-500">Fast-path codes to clipboard</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-indigo-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Finance Alert Channel</p>
                      <p className="text-[9px] text-gray-500">Route invoices to WhatsApp</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Newsletter Digest</p>
                      <p className="text-[9px] text-gray-500">Compile weekly updates</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-indigo-400 border border-white/5 transition-all text-center block">
                  Manage Rules DSL
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 px-2">
                <TrendingUp size={16} className="text-indigo-400" />
                <span>Decision Pipeline Load</span>
              </h3>

              <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="h-16 flex items-end gap-1.5">
                  {[45, 60, 30, 80, 65, 95, 40, 50, 75, 90, 85, 30, 45, 60, 85, 95, 70, 55, 60, 90].map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-indigo-500/30 rounded-t transition-all hover:bg-indigo-500" 
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-white/5 pt-3">
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
