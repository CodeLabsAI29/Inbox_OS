import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Avatar } from './Avatar';
import {
  Sparkles,
  Inbox,
  Cpu,
  Zap,
  Send,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Smartphone,
  Calendar,
  ChevronRight,
  TrendingUp,
  Lock,
  Check,
  Minus,
  Sun,
  Moon,
} from 'lucide-react';

// Custom SVG replacement for Github Icon
const GithubIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Custom SVG replacement for Slack Icon
const SlackIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
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

// Custom SVG replacement for Discord Icon
const DiscordIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
  </svg>
);

// Custom SVG replacement for LinkedIn Icon
const LinkedinIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// Custom SVG replacement for X Icon (Twitter)
const XIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Reusable Circular Social Icon Link component
const SocialIcon: React.FC<{
  href: string;
  children: React.ReactNode;
  ariaLabel: string;
}> = ({ href, children, ariaLabel }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={ariaLabel}
    className="w-8 h-8 rounded-full border border-[#EAE5DA] bg-white text-[#6B7280] flex items-center justify-center transition-all duration-300 hover:bg-[#5F6B38] hover:text-white hover:border-[#5F6B38] hover:-translate-y-0.5 active:scale-95"
  >
    {children}
  </a>
);

// Mock Mockups for Interactive Inbox Demo
interface MockEmail {
  id: string;
  sender: string;
  avatar: string;
  avatarUrl?: string;
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
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    time: '2 mins ago',
    subject: 'Urgent: Project Sync Schedule Change',
    snippet:
      'Hey team, client wants to review the design Wednesday at 2pm instead of Thursday. Can we adjust?',
    priority: 94,
    category: 'meeting',
    summary:
      'Sarah requested rescheduling the weekly design sync to Wednesday at 2:00 PM due to a sudden client request.',
    reasoning:
      'High priority due to time-sensitive meeting rescheduling and direct client dependency.',
    actionItems: [
      'Move Project Sync in Google Calendar',
      'Confirm availability with dev team',
    ],
    deadline: 'Wednesday, 2:00 PM',
    suggestedAction: 'calendar',
  },
  {
    id: '2',
    sender: 'AWS Billing (billing@aws.com)',
    avatar: 'AW',
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    time: '1 hour ago',
    subject: 'June 2026 Invoice #8937492',
    snippet:
      'Your invoice for June 2026 usage ($1,420.50) is now available. Automatic payment will be processed.',
    priority: 55,
    category: 'finance',
    summary:
      'Monthly AWS infrastructure billing statement generated. Total charges: $1,420.50, to be auto-debited.',
    reasoning:
      'Medium priority finance communication. Standard recurring invoice requiring standard logging.',
    actionItems: [
      'Log AWS invoice in monthly spreadsheet',
      'Verify usage variance (+8% vs last month)',
    ],
    suggestedAction: 'task',
  },
  {
    id: '3',
    sender: 'Google Security (security@google.com)',
    avatar: 'GS',
    time: '3 hours ago',
    subject: 'Critical Security Alert: New sign-in detected',
    snippet:
      'A new sign-in was detected on a Linux device from Frankfurt, Germany. Please verify this request.',
    priority: 98,
    category: 'support',
    summary:
      'Critical alert indicating unrecognized login attempt on your corporate Google Account from Germany.',
    reasoning:
      'Maximum priority due to potential account compromise and unauthorized access detection.',
    actionItems: [
      'Trigger WhatsApp escalation message to security officer',
      'Lock down temporary sessions',
    ],
    suggestedAction: 'whatsapp',
  },
];

const sectionVariants: any = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      staggerChildren: 0.06,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Light/Dark toggle state synced with localStorage and html class
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark', 'dark-theme');
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Active section tracking state
  const [activeSection, setActiveSection] = useState<string>('');

  // Interactive Inbox Simulator States
  const [selectedEmail, setSelectedEmail] = useState<MockEmail>(mockEmails[0]);
  const [executedAction, setExecutedAction] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState(false);

  // Interactive Pipeline Step States
  const [activePipelineStep, setActivePipelineStep] = useState<number | null>(
    null
  );

  // Hero Living AI Loop States
  const [heroLoopStep, setHeroLoopStep] = useState(0);

  // Scroll parallax configurations
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 600], [0, -35]);

  // Handle landing page active class on body to avoid polluting global layout
  useEffect(() => {
    document.body.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  // Listen to scrolling to smaller height and opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll Observer for navigation links highlighting
  useEffect(() => {
    const sections = ['features', 'pipeline', 'demo', 'comparison'];
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
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
        setExecutedAction(
          'Calendar event created successfully for Wednesday at 2:00 PM.'
        );
      } else if (type === 'whatsapp') {
        setExecutedAction(
          'WhatsApp security alert dispatched to +1 (555) 0192.'
        );
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
    <div className="bg-[#FAF7F2] text-[#1D1D1D] font-sans min-h-screen relative overflow-x-hidden selection:bg-[#5F6B38]/10 selection:text-[#5F6B38]">
      {/* ── Background Patterns & Aurora Gradients ────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle engineering grid pattern overlay */}
        <div className="absolute inset-0 engineering-grid opacity-100" />

        {/* Glowing Auroras (Soft Olive & Gold) */}
        <div className="absolute top-[-10%] left-[10%] w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full bg-gradient-to-tr from-[#5F6B38]/3 to-[#E2B65C]/3 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#E2B65C]/3 to-[#5F6B38]/3 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#E2B65C]/3 to-[#5F6B38]/3 blur-[120px]" />
      </div>

      {/* ── Navigation Bar ────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[250ms] ease-in-out flex items-center ${
          isScrolled
            ? 'h-[60px] bg-white/80 border-b border-[#EAE5DA] shadow-[0_8px_30px_rgba(95,107,56,0.04)]'
            : 'h-[76px] bg-white/65 border-b border-[#EAE5DA]/20'
        } backdrop-blur-md`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="flex items-center justify-center w-[34px] h-[34px] rounded-[14px] bg-[#5F6B38] shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95">
              <Sparkles size={16} strokeWidth={1.5} className="text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm font-bold tracking-tight text-[#1D1D1D] leading-none">
                InboxOS
              </h1>
              <span className="text-[9px] font-bold text-[#5F6B38] tracking-widest uppercase block mt-0.5">
                AI Operating System
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-9 text-[15px] font-medium text-[#6B7280]">
            <a
              href="#features"
              className={`group relative py-1.5 transition-colors duration-200 hover:text-[#5F6B38] ${
                activeSection === 'features'
                  ? 'text-[#5F6B38] font-semibold'
                  : ''
              }`}
            >
              Features
              {activeSection === 'features' ? (
                <motion.span
                  layoutId="activeUnderline"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#5F6B38]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : (
                <span className="absolute left-1/2 bottom-0 w-0 h-0.5 bg-[#5F6B38]/40 transition-all duration-200 group-hover:w-1/2 group-hover:-translate-x-1/2" />
              )}
            </a>
            <a
              href="#pipeline"
              className={`group relative py-1.5 transition-colors duration-200 hover:text-[#5F6B38] ${
                activeSection === 'pipeline'
                  ? 'text-[#5F6B38] font-semibold'
                  : ''
              }`}
            >
              How it Works
              {activeSection === 'pipeline' ? (
                <motion.span
                  layoutId="activeUnderline"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#5F6B38]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : (
                <span className="absolute left-1/2 bottom-0 w-0 h-0.5 bg-[#5F6B38]/40 transition-all duration-200 group-hover:w-1/2 group-hover:-translate-x-1/2" />
              )}
            </a>
            <a
              href="#demo"
              className={`group relative py-1.5 transition-colors duration-200 hover:text-[#5F6B38] ${
                activeSection === 'demo' ? 'text-[#5F6B38] font-semibold' : ''
              }`}
            >
              Interactive Demo
              {activeSection === 'demo' ? (
                <motion.span
                  layoutId="activeUnderline"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#5F6B38]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : (
                <span className="absolute left-1/2 bottom-0 w-0 h-0.5 bg-[#5F6B38]/40 transition-all duration-200 group-hover:w-1/2 group-hover:-translate-x-1/2" />
              )}
            </a>
            <a
              href="#comparison"
              className={`group relative py-1.5 transition-colors duration-200 hover:text-[#5F6B38] ${
                activeSection === 'comparison'
                  ? 'text-[#5F6B38] font-semibold'
                  : ''
              }`}
            >
              InboxOS vs Standard
              {activeSection === 'comparison' ? (
                <motion.span
                  layoutId="activeUnderline"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#5F6B38]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : (
                <span className="absolute left-1/2 bottom-0 w-0 h-0.5 bg-[#5F6B38]/40 transition-all duration-200 group-hover:w-1/2 group-hover:-translate-x-1/2" />
              )}
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative py-1.5 transition-colors duration-200 hover:text-[#5F6B38]"
            >
              Open Source
              <span className="absolute left-1/2 bottom-0 w-0 h-0.5 bg-[#5F6B38]/40 transition-all duration-200 group-hover:w-1/2 group-hover:-translate-x-1/2" />
            </a>
          </nav>

          {/* Nav CTAs & Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-[14px] border border-[#EAE5DA] bg-white text-[#6B7280] hover:text-[#1D1D1D] hover:bg-[#FAF7F2] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              aria-label="Toggle theme placeholder"
            >
              {isDarkMode ? (
                <Sun
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-300"
                />
              ) : (
                <Moon
                  size={18}
                  strokeWidth={1.5}
                  className="rotate-12 transition-transform duration-300"
                />
              )}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="h-[48px] px-6 text-[15px] font-semibold text-white bg-[#5F6B38] hover:bg-[#4F5A2F] rounded-[16px] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(95,107,56,0.25)] active:scale-95 duration-200 flex items-center justify-center"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[#6B7280] hover:text-[#1D1D1D] transition-colors relative w-10 h-10 flex items-center justify-center"
            aria-label="Toggle mobile menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between relative">
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed inset-x-4 top-[84px] bg-white/95 border border-[#EAE5DA] shadow-xl rounded-[22px] z-40 p-6 flex flex-col gap-5 md:hidden backdrop-blur-md overflow-hidden"
          >
            <nav className="flex flex-col gap-4 text-left">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium py-1 transition-colors duration-200 ${
                  activeSection === 'features'
                    ? 'text-[#5F6B38] font-semibold'
                    : 'text-[#6B7280]'
                }`}
              >
                Features
              </a>
              <a
                href="#pipeline"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium py-1 transition-colors duration-200 ${
                  activeSection === 'pipeline'
                    ? 'text-[#5F6B38] font-semibold'
                    : 'text-[#6B7280]'
                }`}
              >
                How it Works
              </a>
              <a
                href="#demo"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium py-1 transition-colors duration-200 ${
                  activeSection === 'demo'
                    ? 'text-[#5F6B38] font-semibold'
                    : 'text-[#6B7280]'
                }`}
              >
                Interactive Demo
              </a>
              <a
                href="#comparison"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium py-1 transition-colors duration-200 ${
                  activeSection === 'comparison'
                    ? 'text-[#5F6B38] font-semibold'
                    : 'text-[#6B7280]'
                }`}
              >
                InboxOS vs Standard
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-medium py-1 text-[#6B7280] hover:text-[#5F6B38]"
              >
                Open Source
              </a>
            </nav>
            <hr className="border-[#EAE5DA]" />
            <div className="flex gap-4 items-center">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-10 h-10 rounded-[14px] border border-[#EAE5DA] bg-white text-[#6B7280] hover:text-[#1D1D1D] hover:bg-[#FAF7F2] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label="Toggle theme placeholder"
              >
                {isDarkMode ? (
                  <Sun size={18} strokeWidth={1.5} />
                ) : (
                  <Moon size={18} strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="flex-1 h-[48px] text-[15px] font-semibold text-white bg-[#5F6B38] hover:bg-[#4F5A2F] rounded-[16px] transition-all hover:shadow-[0_4px_20px_rgba(95,107,56,0.15)] active:scale-95 duration-200 flex items-center justify-center"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 max-w-[1280px] mx-auto z-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-7 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5F6B38]/5 border border-[#5F6B38]/10 rounded-full text-[#5F6B38] font-bold text-[10px] tracking-wider uppercase">
              <Sparkles size={11} strokeWidth={1.5} />
              <span>Introducing the Decision & Execution Layer</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[64px] font-bold tracking-tight text-[#1D1D1D] leading-[1.1] lg:max-w-2xl">
              Email that{' '}
              <span
                className="text-[#5F6B38]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #5F6B38, #E2B65C, #5F6B38)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                understands, decides,
              </span>{' '}
              and acts for you.
            </h1>

            <p className="text-[18px] text-[#6B7280] leading-relaxed max-w-lg">
              InboxOS transforms Gmail and Outlook into an intelligent operating
              system. It reads incoming streams, parses action items, runs
              custom routing rules, and executes workflows
              automatically—scheduling calendar events, raising tasks, and
              sending critical alerts.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={() => navigate('/login')}
                className="group h-[48px] px-6 text-[15px] font-semibold text-white bg-[#5F6B38] hover:bg-[#4F5A2F] rounded-[16px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(95,107,56,0.25)] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="transition-transform duration-200 group-hover:translate-x-[5px]"
                />
              </button>
              <a
                href="#demo"
                className="group h-[48px] px-6 text-[15px] font-semibold text-[#5F6B38] bg-white border border-[#5F6B38] hover:bg-[#FAF7F2] rounded-[16px] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>Watch Live Demo</span>
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className="transition-transform duration-200 group-hover:translate-x-[5px]"
                />
              </a>
            </div>

            <p className="text-[10px] font-semibold text-[#6B7280]/60">
              Open source & self-hostable. Supports local AI models via Ollama.
            </p>
          </div>

          {/* Right Hero Visual: Living AI Pipeline Loop with animations & parallax */}
          <motion.div
            style={{ y: yParallax }}
            className="lg:col-span-6 relative flex justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -4, 0],
              }}
              transition={{
                opacity: { duration: 0.8 },
                scale: { duration: 0.8 },
                y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="w-full max-w-[480px] bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(95,107,56,0.02)] rounded-[22px] p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_15px_30px_rgba(95,107,56,0.06)] hover:border-[#5F6B38]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5F6B38]/3 blur-2xl rounded-full" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DA] mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#5F6B38] animate-ping" />
                  <span className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">
                    Live Pipeline Flow
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 bg-[#FAF7F2] rounded text-[#6B7280] font-bold uppercase border border-[#EAE5DA]">
                  OpenAI Model Active
                </span>
              </div>

              {/* Pipeline Nodes */}
              <div className="space-y-4">
                {/* Node 1: Inbound Email */}
                <motion.div
                  animate={{
                    scale: heroLoopStep === 0 ? 1.01 : 1,
                    x: heroLoopStep === 0 ? 4 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 p-3 rounded-[16px] border transition-all duration-[250ms] ${
                    heroLoopStep === 0
                      ? 'bg-[#5F6B38]/5 border-[#5F6B38] shadow-[0_8px_20px_rgba(95,107,56,0.03)]'
                      : 'bg-white border-[#EAE5DA] shadow-[0_4px_12px_rgba(95,107,56,0.01)]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors duration-250 ${heroLoopStep === 0 ? 'bg-[#5F6B38] text-white shadow-sm' : 'bg-[#FAF7F2] text-[#6B7280] border border-[#EAE5DA]'}`}
                  >
                    <Inbox size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase">
                      Step 1: Ingestion
                    </p>
                    <p className="text-xs font-semibold text-[#1D1D1D] truncate">
                      {heroLoopStep >= 0
                        ? 'Sarah requested moving sync to Wed 2pm...'
                        : 'Awaiting incoming email...'}
                    </p>
                  </div>
                  {heroLoopStep === 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5F6B38] animate-ping" />
                  )}
                </motion.div>

                {/* Connector Line 1 */}
                <div className="h-3 ml-6 w-0.5 bg-[#EAE5DA] relative">
                  {heroLoopStep === 1 && (
                    <motion.div
                      initial={{ top: 0 }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-[#5F6B38] shadow-sm"
                    />
                  )}
                </div>

                {/* Node 2: AI Parser / Intelligence */}
                <motion.div
                  animate={{
                    scale: heroLoopStep === 1 ? 1.01 : 1,
                    x: heroLoopStep === 1 ? 4 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 p-3 rounded-[16px] border transition-all duration-[250ms] ${
                    heroLoopStep === 1
                      ? 'bg-[#5F6B38]/5 border-[#5F6B38] shadow-[0_8px_20px_rgba(95,107,56,0.03)]'
                      : 'bg-white border-[#EAE5DA] shadow-[0_4px_12px_rgba(95,107,56,0.01)]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors duration-250 ${heroLoopStep === 1 ? 'bg-[#5F6B38] text-white shadow-sm' : 'bg-[#FAF7F2] text-[#6B7280] border border-[#EAE5DA]'}`}
                  >
                    <Cpu size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase">
                      Step 2: AI Analysis
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-[#1D1D1D]">
                        Priority Score:
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border transition-colors duration-200 ${
                          heroLoopStep >= 1
                            ? 'bg-[#5F6B38]/10 text-[#5F6B38] border-[#5F6B38]/20'
                            : 'bg-white text-[#6B7280] border-[#EAE5DA]'
                        }`}
                      >
                        {heroLoopStep >= 1 ? '94% Urgent' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Connector Line 2 */}
                <div className="h-3 ml-6 w-0.5 bg-[#EAE5DA] relative">
                  {heroLoopStep === 2 && (
                    <motion.div
                      initial={{ top: 0 }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-[#5F6B38] shadow-sm"
                    />
                  )}
                </div>

                {/* Node 3: Rules & Decision Engine */}
                <motion.div
                  animate={{
                    scale: heroLoopStep === 2 ? 1.01 : 1,
                    x: heroLoopStep === 2 ? 4 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 p-3 rounded-[16px] border transition-all duration-[250ms] ${
                    heroLoopStep === 2
                      ? 'bg-[#5F6B38]/5 border-[#5F6B38] shadow-[0_8px_20px_rgba(95,107,56,0.03)]'
                      : 'bg-white border-[#EAE5DA] shadow-[0_4px_12px_rgba(95,107,56,0.01)]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors duration-250 ${heroLoopStep === 2 ? 'bg-[#5F6B38] text-white shadow-sm' : 'bg-[#FAF7F2] text-[#6B7280] border border-[#EAE5DA]'}`}
                  >
                    <Zap size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase">
                      Step 3: Decision Engine
                    </p>
                    <p className="text-xs font-semibold text-[#1D1D1D]">
                      {heroLoopStep >= 2
                        ? 'Trigger Rule: [Meeting Request Update]'
                        : 'Awaiting reasoning matching...'}
                    </p>
                  </div>
                </motion.div>

                {/* Connector Line 3 */}
                <div className="h-3 ml-6 w-0.5 bg-[#EAE5DA] relative">
                  {heroLoopStep === 3 && (
                    <motion.div
                      initial={{ top: 0 }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-[-2px] h-1.5 w-1.5 rounded-full bg-[#5F6B38] shadow-sm"
                    />
                  )}
                </div>

                {/* Node 4: Automatic Actions & Output */}
                <motion.div
                  animate={{
                    scale: heroLoopStep === 3 ? 1.01 : 1,
                    x: heroLoopStep === 3 ? 4 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 p-3 rounded-[16px] border transition-all duration-[250ms] ${
                    heroLoopStep === 3
                      ? 'bg-[#5F6B38]/5 border-[#5F6B38] shadow-[0_8px_20px_rgba(95,107,56,0.03)]'
                      : 'bg-white border-[#EAE5DA] shadow-[0_4px_12px_rgba(95,107,56,0.01)]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors duration-250 ${heroLoopStep === 3 ? 'bg-[#5F6B38] text-white shadow-sm' : 'bg-[#FAF7F2] text-[#6B7280] border border-[#EAE5DA]'}`}
                  >
                    <Send size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase">
                      Step 4: Automation Dispatch
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`p-1 rounded bg-white text-[#6B7280] flex items-center gap-1 border border-[#EAE5DA] transition-colors duration-200 ${
                          heroLoopStep >= 3
                            ? 'text-[#5F6B38] bg-[#5F6B38]/5 border-[#5F6B38]/20'
                            : ''
                        }`}
                      >
                        <Calendar size={10} strokeWidth={1.5} />
                      </span>
                      <span
                        className={`p-1 rounded bg-white text-[#6B7280] flex items-center gap-1 border border-[#EAE5DA] transition-colors duration-200 ${
                          heroLoopStep >= 3
                            ? 'text-[#E2B65C] bg-[#E2B65C]/5 border-[#E2B65C]/20'
                            : ''
                        }`}
                      >
                        <Smartphone size={10} strokeWidth={1.5} />
                      </span>
                      <span
                        className={`p-1 rounded bg-white text-[#6B7280] flex items-center gap-1 border border-[#EAE5DA] transition-colors duration-200 ${
                          heroLoopStep >= 3
                            ? 'text-blue-500 bg-blue-500/5 border-blue-500/20'
                            : ''
                        }`}
                      >
                        <SlackIcon size={10} />
                      </span>
                    </div>
                  </div>
                </motion.div>
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
                    <div className="h-12 w-12 rounded-full bg-[#5F6B38]/10 text-[#5F6B38] flex items-center justify-center mb-3 animate-bounce">
                      <CheckCircle2 size={24} strokeWidth={1.5} />
                    </div>
                    <h4 className="text-sm font-bold text-[#1D1D1D]">
                      Email Pipeline Resolved
                    </h4>
                    <p className="text-[11px] text-[#6B7280] mt-1 max-w-[280px] leading-relaxed">
                      Sarah's email was analyzed. Calendar updated, team
                      notified in Slack. All actions logged in 0.8 seconds.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Floating Statistics ────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-6 md:p-8 shadow-[0_8px_30px_rgba(95,107,56,0.02)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center"
            >
              <p className="text-3xl font-extrabold tracking-tight text-[#5F6B38]">
                1,000+
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                Emails Processed/Day
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center"
            >
              <p className="text-3xl font-extrabold tracking-tight text-[#1D1D1D]">
                98%
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                Classification Rate
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center"
            >
              <p className="text-3xl font-extrabold tracking-tight text-[#5F6B38]">
                6+
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                Delivery Channels
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center"
            >
              <p className="text-3xl font-extrabold tracking-tight text-[#1D1D1D]">
                &lt;60s
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                Escalation Alert Time
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center flex flex-col justify-center items-center"
            >
              <p className="text-sm font-extrabold tracking-tight text-[#5F6B38] flex items-center justify-center gap-1">
                <Zap size={13} strokeWidth={1.5} className="animate-pulse" />
                <span>Decision Engine</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                AI Powered Rules
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-center flex flex-col justify-center items-center"
            >
              <p className="text-sm font-extrabold tracking-tight text-[#1D1D1D] flex items-center justify-center gap-1">
                <Lock size={13} strokeWidth={1.5} />
                <span>Privacy First</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                Local AI supported
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Interactive Pipeline Steps Section ─────────────────────────────────── */}
      <motion.section
        id="pipeline"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-[44px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
              Every email goes through an intelligent pipeline.
            </h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              InboxOS acts as a middle-tier decision engine. Below is the
              precise 5-layer pipeline that runs in under a second for every
              message. Click any step to inspect the details.
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
                  'Raw EML file sanitization',
                ],
              },
              {
                num: 2,
                title: 'AI Intelligence',
                desc: 'Structured models evaluate priority context, summarize message bodies, and extract deadlines.',
                details: [
                  'Context Comprehension',
                  'Priority Score (0-100)',
                  'Deadline Extraction',
                  'Action Item Isolation',
                ],
              },
              {
                num: 3,
                title: 'Decision Engine',
                desc: 'Evaluates matched entities against custom user-defined boolean routing rules.',
                details: [
                  'User Rules DSL Parser',
                  'Logical Routing Nodes',
                  'Time-of-day execution windows',
                  'AI feedback loops',
                ],
              },
              {
                num: 4,
                title: 'Automation Queue',
                desc: 'Triggers programmatic tasks, books calendar syncs, and organizes email labels.',
                details: [
                  'Celery Async Worker queue',
                  'Google Calendar booking',
                  'Auto-task generation',
                  'Gmail label orchestration',
                ],
              },
              {
                num: 5,
                title: 'Delivery Channel',
                desc: 'Dispatches real-time summary notifications to your custom communication dashboards.',
                details: [
                  'Slack Incoming Webhooks',
                  'Telegram Escalations',
                  'WhatsApp Urgent SMS alerts',
                  'Live WebSockets interface',
                ],
              },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                onClick={() =>
                  setActivePipelineStep(activePipelineStep === idx ? null : idx)
                }
                className={`p-5 rounded-[22px] border cursor-pointer text-left relative transition-all duration-[250ms] ${
                  activePipelineStep === idx
                    ? 'bg-white border-[#5F6B38] shadow-[0_20px_40px_rgba(95,107,56,0.08)] ring-2 ring-[#5F6B38]/5'
                    : 'bg-white border-[#EAE5DA] shadow-[0_8px_30px_rgba(95,107,56,0.02)] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#6B7280] border border-[#EAE5DA]">
                    Step {step.num}
                  </span>
                  {activePipelineStep === idx ? (
                    <span className="text-xs font-bold text-[#5F6B38]">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#6B7280]/60 font-semibold">
                      Click to expand
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[#1D1D1D] mb-1">
                  {step.title}
                </h3>
                <p className="text-[11px] text-[#6B7280] leading-relaxed mb-3">
                  {step.desc}
                </p>

                {/* Collapsible Details */}
                <AnimatePresence>
                  {activePipelineStep === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-[#EAE5DA] pt-3 mt-3"
                    >
                      <p className="text-[9px] font-bold text-[#6B7280]/70 uppercase mb-2">
                        Technologies / Sub-services
                      </p>
                      <ul className="space-y-1">
                        {step.details.map((d, i) => (
                          <li
                            key={i}
                            className="text-[10px] text-[#6B7280] flex items-center gap-1.5"
                          >
                            <CheckCircle2
                              size={10}
                              strokeWidth={1.5}
                              className="text-[#5F6B38]"
                            />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Feature Grid Section ───────────────────────────────────────────────── */}
      <motion.section
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-[44px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
              Out of the box capabilities
            </h2>
            <p className="text-xs text-[#6B7280]">
              Unlike normal clients, InboxOS runs an asynchronous engine
              executing specialized backend workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <Cpu
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                🧠 AI Email Understanding
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                InboxOS leverages advanced language models to perform true
                semantic reasoning, going far beyond standard email summaries.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <ShieldAlert
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                ⚡ Instant Prioritization
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Sorts incoming mails by priority (0–100) instantly. Surfaces
                deadline-critical items while holding back newsletters.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <Calendar
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                📅 Deadline Detection
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Auto-extracts dates and target timelines from body text.
                Converts email threads to actionable calendar invites.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <CheckCircle2
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                ✅ Task Generation
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Identifies actions and tasks buried in complex email chains,
                inserting them directly into your workflow queue.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <Smartphone
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                📲 WhatsApp & SMS Alerts
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Escalates high-priority messages (e.g. system outage reports)
                directly to SMS/WhatsApp, bypassing inbox clutter.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <TrendingUp
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                📈 Analytics & Insight
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Monitors pipeline execution timings, classification accuracies,
                volume metrics, and rule resolution rates over time.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <Lock
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                🔒 Local Privacy First
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Fully integrates with Ollama. Allows parsing confidential mail
                streams entirely on local, offline compute instances.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA] text-[#5F6B38] flex items-center justify-center mb-4 transition-all duration-[250ms] group-hover:border-[#5F6B38]">
                <Zap
                  size={18}
                  strokeWidth={1.5}
                  className="transition-transform duration-[250ms] group-hover:rotate-[5deg]"
                />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1D] mb-2">
                ⚙ Modular SDK Abstraction
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Easily write new connector drivers and custom execution actions
                utilizing the standardized InboxOS Plugin SDK layer.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Interactive Demo Section ───────────────────────────────────────────── */}
      <motion.section
        id="demo"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-[44px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
              Click through a live pipeline simulation.
            </h2>
            <p className="text-sm text-[#6B7280]">
              Select one of the mock emails in the folder to see how the
              intelligence layer reasons, logs, and triggers actions.
            </p>
          </div>

          {/* Demo container Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Simulated Inbox Folder */}
            <div className="lg:col-span-5 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] p-5 flex flex-col justify-start">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DA] mb-4">
                <span className="text-xs font-bold text-[#1D1D1D] uppercase flex items-center gap-1.5">
                  <Inbox
                    size={14}
                    strokeWidth={1.5}
                    className="text-[#5F6B38]"
                  />
                  <span>Simulated Inbound Stream</span>
                </span>
                <span className="text-[10px] text-[#6B7280]/60 font-semibold">
                  3 unread messages
                </span>
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
                    className={`w-full text-left p-3.5 rounded-[14px] border transition-all duration-200 flex gap-3 ${
                      selectedEmail.id === email.id
                        ? 'bg-[#5F6B38]/5 border-[#5F6B38] shadow-[0_4px_15px_rgba(95,107,56,0.03)]'
                        : 'bg-transparent border-transparent hover:border-[#EAE5DA] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <Avatar
                      name={email.sender}
                      imageUrl={email.avatarUrl}
                      size={32}
                      className="rounded-full overflow-hidden"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-[#1D1D1D] truncate">
                          {email.sender.split(' ')[0]}
                        </p>
                        <span className="text-[9px] text-[#6B7280]/60 font-medium">
                          {email.time}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#1D1D1D] truncate mt-0.5">
                        {email.subject}
                      </p>
                      <p className="text-[10px] text-[#6B7280] truncate mt-0.5">
                        {email.snippet}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${
                            email.priority >= 90
                              ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                              : 'bg-[#FAF7F2] text-[#6B7280] border-[#EAE5DA]'
                          }`}
                        >
                          {email.priority}% Priority
                        </span>
                        <span className="text-[8px] font-bold bg-[#FAF7F2] text-[#6B7280] px-1.5 py-0.5 rounded border border-[#EAE5DA]">
                          {email.category}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Analysis Pane */}
            <div className="lg:col-span-7 bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] p-6 flex flex-col justify-between relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#E2B65C]/3 to-transparent blur-2xl rounded-full" />

              {/* Header info */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DA] mb-5 text-left">
                  <span className="text-xs font-bold text-[#1D1D1D] uppercase flex items-center gap-1.5">
                    <Cpu
                      size={14}
                      strokeWidth={1.5}
                      className="text-[#5F6B38] animate-pulse"
                    />
                    <span>AI Decision & Parsing Output</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#6B7280]/60 font-semibold">
                      Matched Rule:
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#FAF7F2] text-[#6B7280] rounded-lg font-bold uppercase border border-[#EAE5DA]">
                      Auto-escalate
                    </span>
                  </div>
                </div>

                {/* Content Panel */}
                <div className="space-y-4">
                  {/* AI Summary */}
                  <div>
                    <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">
                      AI Summary
                    </h4>
                    <p className="text-xs text-[#1D1D1D] leading-relaxed font-semibold mt-1">
                      {selectedEmail.summary}
                    </p>
                  </div>

                  {/* Reasoning & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-[#EAE5DA] py-3">
                    <div>
                      <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">
                        Reasoning & Logic
                      </h4>
                      <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                        {selectedEmail.reasoning}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">
                        Extracted Deadline
                      </h4>
                      <p className="text-[11px] text-[#5F6B38] font-bold mt-1.5 flex items-center gap-1">
                        <Clock size={11} strokeWidth={1.5} />
                        <span>
                          {selectedEmail.deadline ||
                            'No specific deadline found'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action Items */}
                  <div>
                    <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">
                      Extracted Action Items
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {selectedEmail.actionItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-[#1D1D1D] flex items-start gap-2"
                        >
                          <CheckCircle2
                            size={13}
                            strokeWidth={1.5}
                            className="text-[#5F6B38] mt-0.5 shrink-0"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Simulated Action Drawer */}
              <div className="border-t border-[#EAE5DA] pt-5 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase">
                      Suggested Automation Action
                    </p>
                    <p className="text-xs font-bold text-[#1D1D1D] mt-0.5">
                      {selectedEmail.suggestedAction === 'calendar' &&
                        '📅 Schedule calendar sync event'}
                      {selectedEmail.suggestedAction === 'task' &&
                        '📝 Append task item to developer backlog'}
                      {selectedEmail.suggestedAction === 'whatsapp' &&
                        '📲 Trigger instant WhatsApp notification'}
                    </p>
                  </div>

                  {/* Execute CTA */}
                  <button
                    onClick={() =>
                      handleSimulateAction(selectedEmail.suggestedAction)
                    }
                    disabled={actionProgress}
                    className="group h-10 px-4 rounded-[16px] bg-[#5F6B38] hover:bg-[#4F5A2F] disabled:bg-[#EAE5DA] disabled:text-[#6B7280] text-white font-semibold text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(95,107,56,0.25)] active:scale-95 flex items-center justify-center gap-2 self-end shrink-0"
                  >
                    {actionProgress ? (
                      <>
                        <div className="h-3.5 w-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={12} strokeWidth={1.5} />
                        <span>Run Pipeline Actions</span>
                        <ArrowRight
                          size={12}
                          className="transition-transform duration-200 group-hover:translate-x-[5px]"
                        />
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
                      className="p-3 bg-[#5F6B38]/5 border border-[#5F6B38]/20 rounded-xl text-[#5F6B38] text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle2
                        size={14}
                        strokeWidth={1.5}
                        className="text-[#5F6B38]"
                      />
                      <span>{executedAction}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Dashboard Mockup Section ───────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Dashboard Container */}
            <div className="lg:col-span-7 relative flex justify-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-full max-w-[540px] bg-[#0A0D1A] rounded-[22px] p-5 border border-[#EAE5DA] shadow-[0_8px_30px_rgba(95,107,56,0.02)] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_15px_30px_rgba(95,107,56,0.06)] hover:border-[#5F6B38]"
              >
                {/* Ambient glow */}
                <div className="absolute top-[20%] left-[20%] w-48 h-48 bg-[#5F6B38]/10 blur-[80px] rounded-full" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#5F6B38] flex items-center justify-center text-white font-bold text-xs">
                      OS
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      InboxOS Workspace
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#5F6B38]/10 border border-[#5F6B38]/20 text-[#5F6B38] font-bold uppercase">
                    Agent Engine Active
                  </span>
                </div>

                {/* Simulated metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Total Ingested
                    </p>
                    <p className="text-lg font-bold text-white mt-1">1,284</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Urgent Alerts
                    </p>
                    <p className="text-lg font-bold text-[#E2B65C] mt-1">4</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Auto-Resolved
                    </p>
                    <p className="text-lg font-bold text-[#5F6B38] mt-1">84%</p>
                  </div>
                </div>

                {/* Mock backlogs */}
                <div className="space-y-2 text-left">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-[#E2B65C]">
                        sarah@startup.co
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">
                        2 mins ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      Sarah requested moving sync to Wednesday at 2pm...
                    </p>
                    <p className="text-[9px] text-[#5F6B38] font-semibold mt-1.5 flex items-center gap-1">
                      <Check size={10} strokeWidth={1.5} />
                      <span>
                        AI Action: Scheduled calendar event Wednesday 2:00 PM
                      </span>
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 opacity-60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        billing@aws.com
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">
                        1 hour ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      Your invoice for June 2026 usage ($1,420.50) is now...
                    </p>
                    <p className="text-[9px] text-[#5F6B38] font-semibold mt-1.5 flex items-center gap-1">
                      <Check size={10} strokeWidth={1.5} />
                      <span>
                        AI Action: Created task backlogs in AWS logging
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Text description */}
            <div className="lg:col-span-5 text-left space-y-5">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1D1D1D] leading-tight">
                A unified diagnostic dashboard.
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                InboxOS processes emails in the background and logs all logical
                resolutions in real-time. Review matched rules, execute tasks
                manually, inspect connection logs, and edit routing scripts in
                one seamless dashboard interface.
              </p>

              <ul className="space-y-2.5 pt-2">
                <li className="flex items-start gap-2 text-xs font-semibold text-[#6B7280]">
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="text-[#5F6B38] mt-0.5 shrink-0"
                  />
                  <span>Real-time WebSocket streaming updates</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-semibold text-[#6B7280]">
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="text-[#5F6B38] mt-0.5 shrink-0"
                  />
                  <span>Rules engine diagnostic logs</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-semibold text-[#6B7280]">
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="text-[#5F6B38] mt-0.5 shrink-0"
                  />
                  <span>Connected email stream configurations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Open Source Section ────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Text Left */}
            <div className="lg:col-span-6 text-left space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] border border-[#EAE5DA] rounded-full text-[#6B7280] font-bold text-[9px] tracking-wider uppercase">
                <GithubIcon size={11} />
                <span>Open Source & Modular</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1D1D1D] leading-tight">
                Built in the open. Built for everyone.
              </h2>

              <p className="text-sm text-[#6B7280] leading-relaxed">
                InboxOS is completely open source and self-hostable. We decouple
                ingestion connectors from the reasoning code. Want custom rules
                or want to run entirely local LLMs? Check the codebase, deploy
                manually using Docker, or write a plugin utilizing the InboxOS
                SDK.
              </p>

              <div className="flex gap-3 pt-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-[48px] px-6 text-[15px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-[16px] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm flex items-center justify-center gap-2"
                >
                  <GithubIcon size={14} />
                  <span>Explore GitHub Repository</span>
                </a>
              </div>
            </div>

            {/* Interactive Monorepo Folder Tree Right */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="w-full max-w-[480px] bg-white border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] p-6 text-left font-mono text-[11px] text-[#1D1D1D] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#5F6B38]/3 blur-2xl rounded-full" />

                <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DA] mb-4 text-[#6B7280] font-bold text-[10px] uppercase">
                  <span>📁 Repository Monorepo Structure</span>
                  <span>inboxos/inboxos</span>
                </div>

                {/* Tree structure */}
                <div className="space-y-1.5 text-[#1D1D1D] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-[#5F6B38]">📁</span>
                    <span className="text-[#5F6B38] font-semibold">apps/</span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">api/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (FastAPI backend server)
                    </span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">web/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (Next.js / Vite dashboard)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#5F6B38]">📁</span>
                    <span className="text-[#5F6B38] font-semibold">
                      config/
                    </span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">docker/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (Compose stacks)
                    </span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">env/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (.env configuration options)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#5F6B38]">📁</span>
                    <span className="text-[#5F6B38] font-semibold">
                      packages/
                    </span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">rules/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (DSL parser utilities)
                    </span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[#6B7280]">📁</span>
                    <span className="text-[#1D1D1D]">plugins/</span>
                    <span className="text-[#6B7280]/70 text-[10px] italic">
                      (Ingestion SDK connector)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#EAE5DA]">
                    <span className="text-[#6B7280]">📄</span>
                    <span className="text-[#5F6B38] font-semibold">
                      docker-compose.yml
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">📄</span>
                    <span className="text-[#1D1D1D]">README.md</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Testimonials Section ───────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-[44px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
              Trusted by operators who run on email.
            </h2>
            <p className="text-sm text-[#6B7280]">
              See how operations leaders, recruiters, and startup founders are
              using email decision layers to save hours of manual check times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#5F6B38]/1 to-[#5F6B38]/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span className="absolute top-4 right-6 text-[80px] font-serif text-[#5F6B38]/10 group-hover:opacity-0 transition-opacity duration-300 select-none pointer-events-none leading-none">
                “
              </span>

              <p className="text-xs text-[#6B7280] leading-relaxed italic relative z-10">
                "InboxOS changed everything for us. Critical infrastructure
                downtime reports from our servers are picked up, analyzed, and
                escalated to our Slack and WhatsApp teams within 10 seconds. I
                don't need to check dashboards constantly anymore."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-[#EAE5DA] pt-4 relative z-10">
                <div className="rounded-full ring-2 ring-transparent group-hover:ring-[#5F6B38] transition-all duration-300 p-0.5 shrink-0">
                  <Avatar
                    name="Mark Henderson"
                    size={36}
                    className="rounded-full overflow-hidden"
                  />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#1D1D1D]">
                    Mark Henderson
                  </h5>
                  <p className="text-[10px] text-[#6B7280]/70">
                    Director of Systems, NetCorp
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#5F6B38]/1 to-[#5F6B38]/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span className="absolute top-4 right-6 text-[80px] font-serif text-[#5F6B38]/10 group-hover:opacity-0 transition-opacity duration-300 select-none pointer-events-none leading-none">
                “
              </span>

              <p className="text-xs text-[#6B7280] leading-relaxed italic relative z-10">
                "As a recruiter, my inbox gets flooded with hundreds of
                portfolios. InboxOS parses candidate sheets, calculates
                candidate match ratios using local Ollama model processing, and
                populates candidates directly inside my applicant spreadsheet
                automatically."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-[#EAE5DA] pt-4 relative z-10">
                <div className="rounded-full ring-2 ring-transparent group-hover:ring-[#5F6B38] transition-all duration-300 p-0.5 shrink-0">
                  <Avatar
                    name="Alisha Robinson"
                    size={36}
                    className="rounded-full overflow-hidden"
                  />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#1D1D1D]">
                    Alisha Robinson
                  </h5>
                  <p className="text-[10px] text-[#6B7280]/70">
                    Lead Recruiting Partner, TalentGrid
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group bg-white border border-[#EAE5DA] p-6 rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38] text-left flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#5F6B38]/1 to-[#5F6B38]/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span className="absolute top-4 right-6 text-[80px] font-serif text-[#5F6B38]/10 group-hover:opacity-0 transition-opacity duration-300 select-none pointer-events-none leading-none">
                “
              </span>

              <p className="text-xs text-[#6B7280] leading-relaxed italic relative z-10">
                "I run multiple businesses and used to miss invoice payment
                updates or customer calendar changes constantly. InboxOS routing
                rules process finance receipts to our accounting channels, while
                scheduling meetings automatically."
              </p>
              <div className="flex items-center gap-3 mt-6 border-t border-[#EAE5DA] pt-4 relative z-10">
                <div className="rounded-full ring-2 ring-transparent group-hover:ring-[#5F6B38] transition-all duration-300 p-0.5 shrink-0">
                  <Avatar
                    name="Thomas Loe"
                    size={36}
                    className="rounded-full overflow-hidden"
                  />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#1D1D1D]">
                    Thomas Loe
                  </h5>
                  <p className="text-[10px] text-[#6B7280]/70">
                    Serial Founder & Investor
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Comparison Section ─────────────────────────────────────────────────── */}
      <motion.section
        id="comparison"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="bg-white border border-[#EAE5DA] rounded-[22px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-[44px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
              Decoupling email from manual labor.
            </h2>
            <p className="text-sm text-[#6B7280]">
              A side-by-side comparison of old-school email management vs. the
              InboxOS active automation workflow.
            </p>
          </div>

          <div className="border border-[#EAE5DA] rounded-[22px] shadow-[0_8px_30px_rgba(95,107,56,0.02)] overflow-hidden text-left bg-white max-w-4xl mx-auto transition-all duration-[250ms] hover:-translate-y-[6px] hover:shadow-[0_20px_40px_rgba(95,107,56,0.08)] hover:border-[#5F6B38]">
            <table className="w-full text-left border-collapse rounded-t-[22px]">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EAE5DA]">
                  <th className="p-4 text-xs font-bold text-[#6B7280] uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={14} className="text-[#E2B65C]" />
                    <span>Capabilities</span>
                  </th>
                  <th className="p-4 text-xs font-bold text-[#6B7280]/80 uppercase tracking-widest">
                    Traditional Client
                  </th>
                  <th className="p-4 text-xs font-bold text-[#5F6B38] uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <Sparkles
                        size={14}
                        className="text-[#5F6B38] animate-pulse"
                      />
                      <span>InboxOS</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DA] text-xs text-[#1D1D1D] bg-white">
                <tr className="group hover:bg-[#FAF7F2]/60 transition-colors duration-250">
                  <td className="p-4 font-bold text-[#1D1D1D] border-l-4 border-l-transparent group-hover:border-l-[#5F6B38] transition-all duration-250">
                    Email Processing
                  </td>
                  <td className="p-4 text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Minus size={14} className="text-[#E2B65C] shrink-0" />
                      <span>Manually read and search everything</span>
                    </div>
                  </td>
                  <td className="p-4 text-[#5F6B38] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[#5F6B38] shrink-0"
                      />
                      <span>Parses content contextually using LLMs</span>
                    </span>
                  </td>
                </tr>

                <tr className="group hover:bg-[#FAF7F2]/60 transition-colors duration-250">
                  <td className="p-4 font-bold text-[#1D1D1D] border-l-4 border-l-transparent group-hover:border-l-[#5F6B38] transition-all duration-250">
                    Priority Evaluation
                  </td>
                  <td className="p-4 text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Minus size={14} className="text-[#E2B65C] shrink-0" />
                      <span>
                        Flat chronological listing / basic label rules
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-[#5F6B38] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[#5F6B38] shrink-0"
                      />
                      <span>Granular priority index score (0–100)</span>
                    </span>
                  </td>
                </tr>

                <tr className="group hover:bg-[#FAF7F2]/60 transition-colors duration-250">
                  <td className="p-4 font-bold text-[#1D1D1D] border-l-4 border-l-transparent group-hover:border-l-[#5F6B38] transition-all duration-250">
                    Automation Action
                  </td>
                  <td className="p-4 text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Minus size={14} className="text-[#E2B65C] shrink-0" />
                      <span>
                        Open separate calendars and manually copy/paste
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-[#5F6B38] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[#5F6B38] shrink-0"
                      />
                      <span>Automatically triggers API dispatches</span>
                    </span>
                  </td>
                </tr>

                <tr className="group hover:bg-[#FAF7F2]/60 transition-colors duration-250">
                  <td className="p-4 font-bold text-[#1D1D1D] border-l-4 border-l-transparent group-hover:border-l-[#5F6B38] transition-all duration-250">
                    Routing Rules Engine
                  </td>
                  <td className="p-4 text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Minus size={14} className="text-[#E2B65C] shrink-0" />
                      <span>Static string-matching sender filters</span>
                    </div>
                  </td>
                  <td className="p-4 text-[#5F6B38] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[#5F6B38] shrink-0"
                      />
                      <span>
                        DSL boolean scripts with dynamic condition maps
                      </span>
                    </span>
                  </td>
                </tr>

                <tr className="group hover:bg-[#FAF7F2]/60 transition-colors duration-250">
                  <td className="p-4 font-bold text-[#1D1D1D] border-l-4 border-l-transparent group-hover:border-l-[#5F6B38] transition-all duration-250">
                    Security & Privacy
                  </td>
                  <td className="p-4 text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Minus size={14} className="text-[#E2B65C] shrink-0" />
                      <span>Hosted servers store & index logs online</span>
                    </div>
                  </td>
                  <td className="p-4 text-[#5F6B38] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[#5F6B38] shrink-0"
                      />
                      <span>Self-hostable, runs entirely local models</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {/* ── Final CTA Section ──────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="max-w-[1280px] mx-auto px-6 md:px-12 my-[120px] z-10 relative"
      >
        <div className="text-center bg-[#5F6B38] border border-[#EAE5DA] rounded-[22px] p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />
          <div className="absolute top-0 left-0 right-0 h-48 bg-[#E2B65C]/20 to-transparent blur-3xl" />

          <div className="relative z-10 space-y-7">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-none text-white">
              Stop managing email.
              <br />
              <span className="opacity-90">Start running an AI Inbox.</span>
            </h2>
            <p className="text-sm text-indigo-100/80 leading-relaxed max-w-lg mx-auto">
              Ready to decouple from manual email sorting? Get started with our
              hosted sandbox account or deploy the Docker repository on your own
              server.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 max-w-md mx-auto">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto h-[48px] px-6 text-[15px] font-semibold text-[#5F6B38] bg-white hover:bg-slate-50 rounded-[16px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,255,255,0.25)] active:scale-95 flex items-center justify-center"
              >
                Get Started Free
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto h-[48px] px-6 text-[15px] font-semibold text-white bg-transparent border border-white/30 hover:bg-white/10 rounded-[16px] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <GithubIcon size={14} />
                <span>Explore GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Footer Section ─────────────────────────────────────────────────────── */}
      <footer className="bg-[#FAF7F2] text-[#6B7280] pt-28 pb-20 px-8 border-t border-[#EAE5DA] z-10 relative">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Logo Section */}
            <div className="col-span-2 space-y-6 text-left flex flex-col justify-start">
              {/* Logo */}
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#5F6B38] shadow-sm">
                  <Sparkles
                    size={14}
                    strokeWidth={1.5}
                    className="text-white"
                  />
                </div>
                <h4 className="text-sm font-bold text-[#1D1D1D]">InboxOS</h4>
              </div>

              {/* Company description */}
              <p className="text-xs text-[#6B7280]/85 leading-relaxed max-w-xs">
                The decision and execution layer sitting above Gmail and
                Outlook. Built open source with privacy as a first class
                concern.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-3 pt-2">
                <SocialIcon href="https://github.com" ariaLabel="GitHub">
                  <GithubIcon size={16} />
                </SocialIcon>
                <SocialIcon href="https://discord.com" ariaLabel="Discord">
                  <DiscordIcon size={16} />
                </SocialIcon>
                <SocialIcon href="https://linkedin.com" ariaLabel="LinkedIn">
                  <LinkedinIcon size={16} />
                </SocialIcon>
                <SocialIcon href="https://twitter.com" ariaLabel="Twitter / X">
                  <XIcon size={14} />
                </SocialIcon>
              </div>
            </div>

            {/* Link Columns */}
            <div className="text-left">
              <h5 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6B7280]/80 mb-5">
                Product
              </h5>
              <ul className="space-y-3 text-[14px]">
                <li>
                  <a
                    href="#features"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pipeline"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    AI Pipeline
                  </a>
                </li>
                <li>
                  <a
                    href="#demo"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Interactive Demo
                  </a>
                </li>
                <li>
                  <a
                    href="#comparison"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Comparisons
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6B7280]/80 mb-5">
                Developers
              </h5>
              <ul className="space-y-3 text-[14px]">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Monorepo Guide
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Plugin SDK
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Rules DSL Docs
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6B7280]/80 mb-5">
                Resources
              </h5>
              <ul className="space-y-3 text-[14px]">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Self-Host Guide
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Docker Stacks
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Ollama Local Setup
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    API Docs
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <h5 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6B7280]/80 mb-5">
                Licensing
              </h5>
              <ul className="space-y-3 text-[14px]">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    MIT License
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B7280] hover:text-[#5F6B38] hover:translate-x-[4px] duration-200 transition-all flex items-center"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-[#EAE5DA] flex flex-col md:flex-row items-center justify-between text-xs text-[#6B7280]/60 gap-6">
            <div>
              <p>&copy; 2026 InboxOS.</p>
            </div>
            <div className="flex gap-6 items-center">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#5F6B38] transition-colors duration-200 font-medium text-[#6B7280]/70"
              >
                MIT License
              </a>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAE5DA]" />
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#5F6B38] transition-colors duration-200 font-medium text-[#6B7280]/70"
              >
                Privacy
              </a>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAE5DA]" />
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#5F6B38] transition-colors duration-200 font-medium text-[#6B7280]/70"
              >
                Terms
              </a>
            </div>
            <div className="flex items-center">
              <span className="px-2.5 py-1 text-[11px] font-bold text-[#E2B65C] bg-[#E2B65C]/5 rounded-full border border-[#E2B65C]/20 select-none">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
