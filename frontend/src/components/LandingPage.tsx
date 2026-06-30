import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Inbox, 
  Cpu, 
  Zap, 
  Send, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Smartphone, 
  Calendar, 
  Menu as MenuIcon,
  ChevronRight,
  TrendingUp,
  Lock, 
  MessageSquare,
  Check,
  Terminal
} from 'lucide-react';

// Custom SVG replacement for Github Icon because of lucide-react version compatibility
const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Custom SVG replacement for Slack Icon because of lucide-react version compatibility
const SlackIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="3" height="8" x="13" y="2" rx="1.5" />
    <path d="M19 8.5a1.5 1.5 0 1 1-3 0V7a1.5 1.5 0 1 1 3 0z" />
    <rect width="3" height="8" x="8" y="14" rx="1.5" />
    <path d="M5 15.5a1.5 1.5 0 1 1 3 0V17a1.5 1.5 0 1 1-3 0z" />
    <rect width="8" height="3" x="2" y="13" rx="1.5" />
    <path d="M8.5 19a1.5 1.5 0 1 1 0-3H10a1.5 1.5 0 1 1 0 3z" />
    <rect width="8" height="3" x="14" y="8" rx="1.5" />
    <path d="M15.5 5a1.5 1.5 0 1 1 0 3H14a1.5 1.5 0 1 1 0-3z" />
  </svg>
);

// Mock Mockups for Interactive Inbox Demo
interface MockEmail {
  id: string;
  sender: string;
  avatar: string;
  time: string;
  subject: string;
  snippet: string;
  priority: number;
  category: 'meeting' | 'finance' | 'support' | 'personal';
  summary: string;
  reasoning: string;
  actionItems: string[];
  deadline?: string;
  suggestedAction: 'calendar' | 'whatsapp' | 'task' | 'ignore';
}

const mockEmails: MockEmail[] = [
  {
    id: '1',
    sender: 'Sarah Jenkins (sarah@startup.co)',
    avatar: 'SJ',
    time: '2 mins ago',
    subject: 'Urgent: Project Sync Schedule Change',
    snippet: 'Hey team, client wants to review the design Wednesday at 2pm instead of Thursday. Can we adjust?',
    priority: 94,
    category: 'meeting',
    summary: 'Sarah requested rescheduling the weekly design sync to Wednesday at 2:00 PM due to a sudden client request.',
    reasoning: 'High priority due to time-sensitive meeting rescheduling and direct client dependency.',
    actionItems: [
      'Move Project Sync in Google Calendar',
      'Confirm availability with dev team'
    ],
    deadline: 'Wednesday, 2:00 PM',
    suggestedAction: 'calendar'
  },
  {
    id: '2',
    sender: 'AWS Billing (billing@aws.com)',
    avatar: 'AW',
    time: '1 hour ago',
    subject: 'June 2026 Invoice #8937492',
    snippet: 'Your invoice for June 2026 usage ($1,420.50) is now available. Automatic payment will be processed.',
    priority: 55,
    category: 'finance',
    summary: 'Monthly AWS infrastructure billing statement generated. Total charges: $1,420.50, to be auto-debited.',
    reasoning: 'Medium priority finance communication. Standard recurring invoice requiring standard logging.',
    actionItems: [
      'Log AWS invoice in monthly spreadsheet',
      'Verify usage variance (+8% vs last month)'
    ],
    suggestedAction: 'task'
  },
  {
    id: '3',
    sender: 'Google Security (security@google.com)',
    avatar: 'GS',
    time: '3 hours ago',
    subject: 'Critical Security Alert: New sign-in detected',
    snippet: 'A new sign-in was detected on a Linux device from Frankfurt, Germany. Please verify this request.',
    priority: 98,
    category: 'support',
    summary: 'Critical alert indicating unrecognized login attempt on your corporate Google Account from Germany.',
    reasoning: 'Maximum priority due to potential account compromise and unauthorized access detection.',
    actionItems: [
      'Trigger WhatsApp escalation message to security officer',
      'Lock down temporary sessions'
    ],
    suggestedAction: 'whatsapp'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Interactive Inbox Simulator States
  const [selectedEmail, setSelectedEmail] = useState<MockEmail>(mockEmails[0]);
  const [executedAction, setExecutedAction] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState(false);

  // Interactive Pipeline Step States
  const [activePipelineStep, setActivePipelineStep] = useState<number | null>(null);

  // Hero Living AI Loop States
  const [heroLoopStep, setHeroLoopStep] = useState(0);

  // Listen to scrolling to blur/fade Navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Running Hero living loop
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroLoopStep((prev) => (prev + 1) % 5);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateAction = (type: string) => {
    if (actionProgress) return;
    setActionProgress(true);
    setExecutedAction(null);

    setTimeout(() => {
      setActionProgress(false);
      if (type === 'calendar') {
        setExecutedAction('Calendar event created successfully for Wednesday at 2:00 PM.');
      } else if (type === 'whatsapp') {
        setExecutedAction('WhatsApp security alert dispatched to +1 (555) 0192.');
      } else if (type === 'task') {
        setExecutedAction('Action item added to InboxOS tasks.');
      } else {
        setExecutedAction('Email marked as resolved/archived.');
      }

      setTimeout(() => {
        setExecutedAction(null);
      }, 3500);
    }, 1200);
  };

  return (
    <div className="bg-[#fafafa] text-slate-900 font-sans min-h-screen relative overflow-x-hidden selection:bg-indigo-500/10 selection:text-indigo-600">
      
      {/* ── Background Patterns & Aurora Gradients ────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Glowing Auroras */}
        <div className="absolute top-[-10%] left-[10%] w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/5 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-cyan-500/5 to-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-purple-500/5 to-indigo-500/10 blur-[120px]" />
      </div>

      {/* ── Navigation Bar ────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm py-3.5' 
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                InboxOS
              </h1>
              <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase block -mt-0.5">
                AI Operating System
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pipeline" className="hover:text-slate-900 transition-colors">How it Works</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Interactive Demo</a>
            <a href="#comparison" className="hover:text-slate-900 transition-colors">InboxOS vs Standard</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">Open Source</a>
          </nav>

          {/* Nav CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 font-semibold"
            >
              <GithubIcon size={14} />
              <span>GitHub</span>
            </a>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-sm shadow-indigo-600/10 active:scale-95"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>

        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[60px] bg-white border-b border-slate-200 shadow-lg z-40 p-6 flex flex-col gap-4 md:hidden"
          >
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-1"
            >
              Features
            </a>
            <a 
              href="#pipeline" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-1"
            >
              How it Works
            </a>
            <a 
              href="#demo" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-1"
            >
              Interactive Demo
            </a>
            <a 
              href="#comparison" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-1"
            >
              InboxOS vs Standard
            </a>
            <hr className="border-slate-100" />
            <div className="flex gap-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 text-center text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5"
              >
                <GithubIcon size={14} />
                <span>GitHub</span>
              </a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="flex-1 py-3 text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-7 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 font-bold text-[10px] tracking-wider uppercase">
              <Sparkles size={11} />
              <span>Introducing the Decision & Execution Layer</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.08] lg:max-w-xl">
              Email that <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">understands, decides,</span> and acts for you.
            </h1>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-lg">
              InboxOS transforms Gmail and Outlook into an intelligent operating system. It reads incoming streams, parses action items, runs custom routing rules, and executes workflows automatically—scheduling calendar events, raising tasks, and sending critical alerts.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-98 flex items-center justify-center gap-2 font-bold"
              >
                <span>Get Started Free</span>
                <ArrowRight size={14} />
              </button>
              <a 
                href="#demo"
                className="px-6 py-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 rounded-2xl transition-all text-center flex items-center justify-center gap-2 font-bold"
              >
                <span>Watch Live Demo</span>
                <ChevronRight size={14} />
              </a>
            </div>

            <p className="text-[10px] font-semibold text-slate-400">
              Open source & self-hostable. Supports local AI models via Ollama.
            </p>
          </div>

          {/* Right Hero Visual: Living AI Pipeline Loop */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="w-full max-w-[480px] bg-white border border-slate-200/60 shadow-xl rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Live Pipeline Flow</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase">OpenAI Model Active</span>
              </div>

              {/* Pipeline Nodes */}
              <div className="space-y-4">
                
                {/* Node 1: Inbound Email */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  heroLoopStep === 0 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <div className={`p-2 rounded-lg ${heroLoopStep === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Inbox size={14} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Step 1: Ingestion</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {heroLoopStep >= 0 ? 'Sarah requested moving sync to Wed 2pm...' : 'Awaiting incoming email...'}
                    </p>
                  </div>
                  {heroLoopStep === 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                  )}
                </div>

                {/* Connector Line 1 */}
                <div className="h-3 ml-6 w-0.5 bg-slate-200 relative">
                  {heroLoopStep === 1 && (
                    <motion.div 
                      initial={{ top: 0 }} 
                      animate={{ top: '100%' }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-md"
                    />
                  )}
                </div>

                {/* Node 2: AI Parser / Intelligence */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  heroLoopStep === 1 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <div className={`p-2 rounded-lg ${heroLoopStep === 1 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                    <Cpu size={14} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Step 2: AI Analysis</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-800">Priority Score:</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        heroLoopStep >= 1 ? 'bg-rose-500/10 text-rose-600 border border-rose-100' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {heroLoopStep >= 1 ? '94% Urgent' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connector Line 2 */}
                <div className="h-3 ml-6 w-0.5 bg-slate-200 relative">
                  {heroLoopStep === 2 && (
                    <motion.div 
                      initial={{ top: 0 }} 
                      animate={{ top: '100%' }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-md"
                    />
                  )}
                </div>

                {/* Node 3: Rules & Decision Engine */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  heroLoopStep === 2 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <div className={`p-2 rounded-lg ${heroLoopStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Zap size={14} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Step 3: Decision Engine</p>
                    <p className="text-xs font-semibold text-slate-800">
                      {heroLoopStep >= 2 ? 'Trigger Rule: [Meeting Request Update]' : 'Awaiting reasoning matching...'}
                    </p>
                  </div>
                </div>

                {/* Connector Line 3 */}
                <div className="h-3 ml-6 w-0.5 bg-slate-200 relative">
                  {heroLoopStep === 3 && (
                    <motion.div 
                      initial={{ top: 0 }} 
                      animate={{ top: '100%' }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-md"
                    />
                  )}
                </div>

                {/* Node 4: Automatic Actions & Output */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  heroLoopStep === 3 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <div className={`p-2 rounded-lg ${heroLoopStep === 3 ? 'bg-indigo-600 text-white animate-bounce' : 'bg-slate-200 text-slate-500'}`}>
                    <Send size={14} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Step 4: Automation Dispatch</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`p-1 rounded bg-slate-100 text-slate-400 flex items-center gap-1 ${
                        heroLoopStep >= 3 ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : ''
                      }`}>
                        <Calendar size={10} />
                      </span>
                      <span className={`p-1 rounded bg-slate-100 text-slate-400 flex items-center gap-1 ${
                        heroLoopStep >= 3 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : ''
                      }`}>
                        <Smartphone size={10} />
                      </span>
                      <span className={`p-1 rounded bg-slate-100 text-slate-400 flex items-center gap-1 ${
                        heroLoopStep >= 3 ? 'text-blue-500 bg-blue-50 border border-blue-100' : ''
                      }`}>
                        <SlackIcon size={10} />
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Pipeline Success Overlay */}
              <AnimatePresence>
                {heroLoopStep === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 text-center z-20"
                  >
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 animate-bounce">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Email Pipeline Resolved</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                      Sarah's email was analyzed. Calendar updated, team notified in Slack. All actions logged in 0.8 seconds.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </section>

      {/* ── Floating Statistics ────────────────────────────────────────────────── */}
      <section className="py-12 bg-white/40 border-y border-slate-200/50 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            
            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
              <p className="text-3xl font-extrabold tracking-tight text-indigo-600">1,000+</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Emails Processed/Day</p>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">98%</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Classification Rate</p>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
              <p className="text-3xl font-extrabold tracking-tight text-indigo-600">6+</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Delivery Channels</p>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">&lt;60s</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Escalation Alert Time</p>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center flex flex-col justify-center items-center">
              <p className="text-sm font-extrabold tracking-tight text-indigo-600 flex items-center justify-center gap-1">
                <Zap size={13} className="animate-pulse" />
                <span>Decision Engine</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">AI Powered Rules</p>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center flex flex-col justify-center items-center">
              <p className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-1">
                <Lock size={13} />
                <span>Privacy First</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Local AI supported</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust Strip ────────────────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-b border-slate-200/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
            Supported Providers & Output Channels
          </p>
          
          {/* Logo marquee loop */}
          <div className="flex items-center justify-center flex-wrap gap-8 md:gap-12 opacity-60">
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <Inbox size={15} /> Gmail
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <Lock size={15} /> Outlook
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <SlackIcon size={15} /> Slack
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <Smartphone size={15} /> WhatsApp
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <Calendar size={15} /> Google Calendar
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <GithubIcon size={15} /> GitHub Actions
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <Terminal size={15} /> Custom IMAP
            </span>
            <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
              <MessageSquare size={15} /> Telegram
            </span>
          </div>

        </div>
      </section>

      {/* ── Interactive Pipeline Steps Section ─────────────────────────────────── */}
      <section id="pipeline" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Every email goes through an intelligent pipeline.
          </h2>
          <p className="text-sm text-slate-600">
            InboxOS acts as a middle-tier decision engine. Below is the precise 5-layer pipeline that runs in under a second for every message. Click any step to inspect the details.
          </p>
        </div>

        {/* Horizontal flow line layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          
          {[
            {
              num: 1,
              title: 'Ingestion Layer',
              desc: 'Securely monitors Gmail, Outlook, or IMAP over OAuth 2.0. Pulls multipart body files instantly.',
              details: [
                'OAuth 2.0 Client Tokens',
                'Cron Webhook Listeners',
                'IMAP Secure Sync',
                'Raw EML file sanitization'
              ]
            },
            {
              num: 2,
              title: 'AI Intelligence',
              desc: 'Structured models evaluate priority context, summarize message bodies, and extract deadlines.',
              details: [
                'Context Comprehension',
                'Priority Score (0-100)',
                'Deadline Extraction',
                'Action Item Isolation'
              ]
            },
            {
              num: 3,
              title: 'Decision Engine',
              desc: 'Evaluates matched entities against custom user-defined boolean routing rules.',
              details: [
                'User Rules DSL Parser',
                'Logical Routing Nodes',
                'Time-of-day execution windows',
                'AI feedback loops'
              ]
            },
            {
              num: 4,
              title: 'Automation Queue',
              desc: 'Triggers programmatic tasks, books calendar syncs, and organizes email labels.',
              details: [
                'Celery Async Worker queue',
                'Google Calendar booking',
                'Auto-task generation',
                'Gmail label orchestration'
              ]
            },
            {
              num: 5,
              title: 'Delivery Channel',
              desc: 'Dispatches real-time summary notifications to your custom communication dashboards.',
              details: [
                'Slack Incoming Webhooks',
                'Telegram Escalations',
                'WhatsApp Urgent SMS alerts',
                'Live WebSockets interface'
              ]
            }
          ].map((step, idx) => (
            <div 
              key={idx} 
              onClick={() => setActivePipelineStep(activePipelineStep === idx ? null : idx)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative ${
                activePipelineStep === idx 
                  ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/10' 
                  : 'bg-white/60 border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Step {step.num}
                </span>
                {activePipelineStep === idx ? (
                  <span className="text-xs font-bold text-indigo-600">Active</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold">Click to expand</span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-1">{step.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{step.desc}</p>

              {/* Collapsible Details */}
              <AnimatePresence>
                {activePipelineStep === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 pt-3 mt-3"
                  >
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Technologies / Sub-services</p>
                    <ul className="space-y-1">
                      {step.details.map((d, i) => (
                        <li key={i} className="text-[10px] text-slate-600 flex items-center gap-1.5">
                          <CheckCircle2 size={10} className="text-indigo-600" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

        </div>
      </section>

      {/* ── Feature Grid Section ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-slate-50 border-y border-slate-200/50 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Out of the box capabilities
            </h2>
            <p className="text-xs text-slate-500">
              Unlike normal clients, InboxOS runs an asynchronous engine executing specialized backend workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Cpu size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">🧠 AI Email Understanding</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                InboxOS leverages advanced language models to perform true semantic reasoning, going far beyond standard email summaries.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                <ShieldAlert size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">⚡ Instant Prioritization</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sorts incoming mails by priority (0–100) instantly. Surfaces deadline-critical items while holding back newsletters.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                <Calendar size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">📅 Deadline Detection</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Auto-extracts dates and target timelines from body text. Converts email threads to actionable calendar invites.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">✅ Task Generation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identifies actions and tasks buried in complex email chains, inserting them directly into your workflow queue.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Smartphone size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">📲 WhatsApp & SMS Alerts</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Escalates high-priority messages (e.g. system outage reports) directly to SMS/WhatsApp, bypassing inbox clutter.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <TrendingUp size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">📈 Analytics & Insight</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Monitors pipeline execution timings, classification accuracies, volume metrics, and rule resolution rates over time.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Lock size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">🔒 Local Privacy First</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fully integrates with Ollama. Allows parsing confidential mail streams entirely on local, offline compute instances.
              </p>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Zap size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">⚙ Modular SDK Abstraction</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Easily write new connector drivers and custom execution actions utilizing the standardized InboxOS Plugin SDK layer.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── Interactive Demo Section ───────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Click through a live pipeline simulation.
          </h2>
          <p className="text-sm text-slate-600">
            Select one of the mock emails in the folder to see how the intelligence layer reasons, logs, and triggers actions.
          </p>
        </div>

        {/* Demo container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Simulated Inbox Folder */}
          <div className="lg:col-span-5 bg-white border border-slate-200/60 shadow-sm rounded-3xl p-5 flex flex-col justify-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <Inbox size={14} className="text-indigo-600" />
                <span>Simulated Inbound Stream</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">3 unread messages</span>
            </div>

            {/* Email list */}
            <div className="space-y-2">
              {mockEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    setExecutedAction(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex gap-3 ${
                    selectedEmail.id === email.id
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                      : 'bg-transparent border-slate-100 hover:border-slate-200 hover:bg-slate-50/40'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedEmail.id === email.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {email.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-800 truncate">{email.sender.split(' ')[0]}</p>
                      <span className="text-[9px] text-slate-400 font-medium">{email.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{email.subject}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{email.snippet}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[8px] font-extrabold px-1 rounded uppercase tracking-wider ${
                        email.priority >= 90 
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-100' 
                          : 'bg-amber-500/10 text-amber-600 border border-amber-100'
                      }`}>
                        {email.priority}% Priority
                      </span>
                      <span className="text-[8px] font-bold bg-slate-100 text-slate-400 px-1 rounded uppercase">
                        {email.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Analysis Pane */}
          <div className="lg:col-span-7 bg-white border border-slate-200/60 shadow-md rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/5 to-transparent blur-2xl rounded-full" />
            
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5 text-left">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-600 animate-pulse" />
                  <span>AI Decision & Parsing Output</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-semibold">Matched Rule:</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold uppercase border border-slate-200">
                    Auto-escalate
                  </span>
                </div>
              </div>

              {/* Content Panel */}
              <div className="space-y-4">
                
                {/* AI Summary */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Summary</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
                    {selectedEmail.summary}
                  </p>
                </div>

                {/* Reasoning & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-slate-100 py-3">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reasoning & Logic</h4>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                      {selectedEmail.reasoning}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Extracted Deadline</h4>
                    <p className="text-[11px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{selectedEmail.deadline || 'No specific deadline found'}</span>
                    </p>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Extracted Action Items</h4>
                  <ul className="mt-2 space-y-1.5">
                    {selectedEmail.actionItems.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-indigo-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>

            {/* Simulated Action Drawer */}
            <div className="border-t border-slate-100 pt-5 mt-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Automation Action</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedEmail.suggestedAction === 'calendar' && '📅 Schedule calendar sync event'}
                    {selectedEmail.suggestedAction === 'task' && '📝 Append task item to developer backlog'}
                    {selectedEmail.suggestedAction === 'whatsapp' && '📲 Trigger instant WhatsApp notification'}
                  </p>
                </div>
                
                {/* Execute CTA */}
                <button
                  onClick={() => handleSimulateAction(selectedEmail.suggestedAction)}
                  disabled={actionProgress}
                  className="px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 self-end shrink-0"
                >
                  {actionProgress ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={12} />
                      <span>Run Pipeline Actions</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toast message inside Card */}
              <AnimatePresence>
                {executedAction && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{executedAction}</span>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

        </div>

      </section>

      {/* ── Dashboard Mockup Section ───────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-200/50 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Dashboard Container */}
            <div className="lg:col-span-7 relative flex justify-center">
              <div className="w-full max-w-[540px] bg-[#080b14] rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-[20%] left-[20%] w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full" />
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">OS</div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">InboxOS Workspace</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                    Agent Engine Active
                  </span>
                </div>

                {/* Simulated metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-left">
                    <p className="text-[9px] text-gray-400">Total Ingested</p>
                    <p className="text-sm font-bold text-white mt-1">1,284</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-left">
                    <p className="text-[9px] text-gray-400">Urgent Alerts</p>
                    <p className="text-sm font-bold text-amber-400 mt-1">4</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-left">
                    <p className="text-[9px] text-gray-400">Auto-Resolved</p>
                    <p className="text-sm font-bold text-white mt-1">84%</p>
                  </div>
                </div>

                {/* Mock backlogs */}
                <div className="space-y-2 text-left">
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-indigo-400">sarah@startup.co</span>
                      <span className="text-[9px] text-gray-500">2 mins ago</span>
                    </div>
                    <p className="text-xs font-bold text-gray-200">Sarah requested moving sync to Wednesday at 2pm...</p>
                    <p className="text-[9px] text-gray-400 mt-1">AI Action: Scheduled calendar event Wednesday 2:00 PM</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 opacity-80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-emerald-400">billing@aws.com</span>
                      <span className="text-[9px] text-gray-500">1 hour ago</span>
                    </div>
                    <p className="text-xs font-bold text-gray-200">Your invoice for June 2026 usage ($1,420.50) is now...</p>
                    <p className="text-[9px] text-gray-400 mt-1">AI Action: Created task backlogs in AWS logging</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Text description */}
            <div className="lg:col-span-5 text-left space-y-5">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                A unified diagnostic dashboard.
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                InboxOS processes emails in the background and logs all logical resolutions in real-time. Review matched rules, execute tasks manually, inspect connection logs, and edit routing scripts in one seamless dashboard interface.
              </p>
              
              <ul className="space-y-2.5 pt-2">
                <li className="flex items-start gap-2 text-xs font-medium text-slate-700">
                  <Check size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                  <span>Real-time WebSocket streaming updates</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-medium text-slate-700">
                  <Check size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                  <span>Rules engine diagnostic logs</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-medium text-slate-700">
                  <Check size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                  <span>Connected email stream configurations</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ── Open Source Section ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Left */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600 font-bold text-[9px] tracking-wider uppercase">
              <GithubIcon size={11} />
              <span>Open Source & Modular</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Built in the open. Built for everyone.
            </h2>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              InboxOS is completely open source and self-hostable. We decouple ingestion connectors from the reasoning code. Want custom rules or want to run entirely local LLMs? Check the codebase, deploy manually using Docker, or write a plugin utilizing the InboxOS SDK.
            </p>

            <div className="flex gap-3 pt-2">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-slate-955 text-white font-semibold text-xs transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <GithubIcon size={14} />
                <span>Explore GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Interactive Monorepo Folder Tree Right */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="w-full max-w-[480px] bg-slate-900 border border-white/10 rounded-2xl p-5 text-left font-mono text-[11px] text-gray-300 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
              
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 text-gray-400 font-bold text-[10px] uppercase">
                <span>📁 Repository Monorepo Structure</span>
                <span>inboxos/inboxos</span>
              </div>

              {/* Tree structure */}
              <div className="space-y-1.5 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-indigo-400 font-bold">apps/</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">api/</span>
                  <span className="text-gray-500 text-[10px] italic">(FastAPI backend server)</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">web/</span>
                  <span className="text-gray-500 text-[10px] italic">(Next.js / Vite dashboard)</span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">📁</span>
                  <span className="text-indigo-400 font-bold">config/</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">docker/</span>
                  <span className="text-gray-500 text-[10px] italic">(Compose stacks)</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">env/</span>
                  <span className="text-gray-500 text-[10px] italic">(.env configuration options)</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">📁</span>
                  <span className="text-indigo-400 font-bold">packages/</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">rules/</span>
                  <span className="text-gray-500 text-[10px] italic">(DSL parser utilities)</span>
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-200">plugins/</span>
                  <span className="text-gray-500 text-[10px] italic">(Ingestion SDK connector)</span>
                </div>
                
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                  <span className="text-gray-500">📄</span>
                  <span className="text-emerald-400 font-semibold">docker-compose.yml</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📄</span>
                  <span className="text-gray-400">README.md</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Testimonials Section ───────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-200/50 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Trusted by operators who run on email.
            </h2>
            <p className="text-sm text-slate-500">
              See how operations leaders, recruiters, and startup founders are using email decision layers to save hours of manual check times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "InboxOS changed everything for us. Critical infrastructure downtime reports from our servers are picked up, analyzed, and escalated to our Slack and WhatsApp teams within 10 seconds. I don't need to check dashboards constantly anymore."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-slate-100 pt-4">
                <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                  MH
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Mark Henderson</h5>
                  <p className="text-[10px] text-slate-400">Director of Systems, NetCorp</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "As a recruiter, my inbox gets flooded with hundreds of portfolios. InboxOS parses candidate sheets, calculates candidate match ratios using local Ollama model processing, and populates candidates directly inside my applicant spreadsheet automatically."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-slate-100 pt-4">
                <div className="h-9 w-9 rounded-full bg-violet-50 text-violet-600 font-bold flex items-center justify-center text-xs">
                  AR
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Alisha Robinson</h5>
                  <p className="text-[10px] text-slate-400">Lead Recruiting Partner, TalentGrid</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "I run multiple businesses and used to miss invoice payment updates or customer calendar changes constantly. InboxOS routing rules process finance receipts to our accounting channels, while scheduling meetings automatically."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-slate-100 pt-4">
                <div className="h-9 w-9 rounded-full bg-cyan-50 text-cyan-600 font-bold flex items-center justify-center text-xs">
                  TL
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Thomas Loe</h5>
                  <p className="text-[10px] text-slate-400">Serial Founder & Investor</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── Comparison Section ─────────────────────────────────────────────────── */}
      <section id="comparison" className="py-24 px-6 max-w-4xl mx-auto z-10 relative">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Decoupling email from manual labor.
          </h2>
          <p className="text-sm text-slate-500">
            A side-by-side comparison of old-school email management vs. the InboxOS active automation workflow.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden text-left">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Capabilities</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Traditional Email Client</th>
                <th className="p-4 text-xs font-bold text-indigo-600 uppercase tracking-widest">InboxOS Operating System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              
              <tr>
                <td className="p-4 font-bold text-slate-800">Email Processing</td>
                <td className="p-4 text-slate-500">Manually read and search everything</td>
                <td className="p-4 text-indigo-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Check size={14} /> Parses content contextually using LLMs</span>
                </td>
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-800">Priority Evaluation</td>
                <td className="p-4 text-slate-500">Flat chronological listing / basic label rules</td>
                <td className="p-4 text-indigo-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Check size={14} /> Granular priority index score (0–100)</span>
                </td>
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-800">Automation Action</td>
                <td className="p-4 text-slate-500">Open separate calendars and manually copy/paste</td>
                <td className="p-4 text-indigo-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Check size={14} /> Automatically triggers API dispatches</span>
                </td>
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-800">Routing Rules Engine</td>
                <td className="p-4 text-slate-500">Static string-matching sender filters</td>
                <td className="p-4 text-indigo-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Check size={14} /> DSL boolean scripts with dynamic condition maps</span>
                </td>
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-800">Security & Privacy</td>
                <td className="p-4 text-slate-500">Hosted servers store & index logs online</td>
                <td className="p-4 text-indigo-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Check size={14} /> Self-hostable, runs entirely local models</span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </section>

      {/* ── Final CTA Section ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 z-10 relative">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-tr from-indigo-900 to-violet-900 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl" />
          
          <div className="relative z-10 space-y-7">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
              Stop managing email.<br />Start running an AI Inbox.
            </h2>
            <p className="text-sm text-indigo-200/90 leading-relaxed max-w-lg mx-auto">
              Ready to decouple from manual email sorting? Get started with our hosted sandbox account or deploy the Docker repository on your own server.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-3.5 text-xs font-semibold text-indigo-955 bg-white hover:bg-slate-100 rounded-2xl transition-all shadow-lg active:scale-98"
              >
                Get Started Free
              </button>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <GithubIcon size={14} />
                <span>Explore GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer Section ─────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            
            {/* Logo details */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow">
                  <Sparkles size={14} className="text-white" />
                </div>
                <h4 className="text-sm font-bold text-white">InboxOS</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs text-left">
                The decision and execution layer sitting above Gmail and Outlook. Built open source with privacy as a first class concern.
              </p>
            </div>

            {/* Links columns */}
            <div className="text-left">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Product</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pipeline" className="hover:text-white transition-colors">AI Pipeline</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a></li>
                <li><a href="#comparison" className="hover:text-white transition-colors">Comparisons</a></li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Developers</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com" className="hover:text-white transition-colors">GitHub Repository</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Monorepo Guide</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Plugin SDK</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Rules DSL Documentation</a></li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Resources</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com" className="hover:text-white transition-colors">Self-Host Guide</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Docker Stacks</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Ollama Local Setup</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">API Docs</a></li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Licensing</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com" className="hover:text-white transition-colors">MIT License</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="https://github.com" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-600 gap-4">
            <p>&copy; {new Date().getFullYear()} InboxOS Open Source Contributors. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Slack Community</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
