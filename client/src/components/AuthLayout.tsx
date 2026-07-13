import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Inbox,
  Cpu,
  Zap,
  Send,
  CheckCircle2,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

interface Testimonial {
  text: string;
  author: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    text: "I haven't manually organized email in weeks. InboxOS handles it all.",
    author: 'Alex Carter',
    role: 'Startup Founder',
  },
  {
    text: 'InboxOS catches critical deadlines and logs tasks before I even open my mail.',
    author: 'Elena Rostova',
    role: 'CS Student',
  },
  {
    text: 'My inbox finally works like an operating system. Self-hosting with local Ollama is a game changer.',
    author: 'Marcus Vance',
    role: 'DevOps Engineer',
  },
];

const featureChips = [
  'AI Understanding',
  'Smart Routing',
  'Deadline Detection',
  'WhatsApp Alerts',
  'Calendar Automation',
  'Local AI',
  'Privacy First',
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(0);

  // Day/Night toggle state (synced with HTML tag and localStorage)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    return systemPrefersDark;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(testimonialInterval);
  }, []);

  useEffect(() => {
    const pipelineInterval = setInterval(() => {
      setPipelineStep((prev) => (prev + 1) % 5);
    }, 2800);
    return () => clearInterval(pipelineInterval);
  }, []);

  useEffect(() => {
    document.body.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden select-none bg-[#FAF7F2] dark:bg-zinc-950 text-[#1D1D1D] dark:text-zinc-100 transition-colors duration-200"
    >
      {/* ── Background Patterns & Blur Circles (Applied globally) ───────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle engineering grid pattern overlay */}
        <div className="absolute inset-0 engineering-grid opacity-[0.05]" />

        {/* Ambient Blur Circles (Olive and Gold) */}
        <div className="absolute top-[-10%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-[#5F6B38]/4 to-[#E2B65C]/4 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-[#E2B65C]/4 to-[#5F6B38]/4 blur-[100px]" />
      </div>

      {/* ── Left Showcase Panel (Slide from left) ─────────────────────────────────── */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[58%] flex-col justify-between p-16 relative overflow-hidden bg-gradient-to-br from-white via-[#FAF7F2] to-[#EAE5DA] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border-r border-[#EAE5DA] dark:border-zinc-800 min-h-screen z-10"
      >
        {/* Internal Subtle grid pattern */}
        <div className="absolute inset-0 engineering-grid opacity-[0.06] pointer-events-none" />

        {/* Floating abstract glass shapes */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[18%] right-[8%] w-16 h-16 rounded-[16px] bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.01)] pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, 16, 0], rotate: [0, -6, 0] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-[20%] left-[6%] w-24 h-24 rounded-[22px] bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.01)] pointer-events-none"
        />

        {/* Branding */}
        <div className="flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-[34px] h-[34px] rounded-[14px] bg-[#5F6B38] shadow-sm">
              <Sparkles size={16} strokeWidth={1.5} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#1D1D1D] dark:text-zinc-100 leading-none">
                InboxOS
              </h2>
              <span className="text-[9px] font-bold text-[#5F6B38] tracking-widest uppercase block mt-0.5">
                AI Operating System
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 text-[#6B7280] dark:text-zinc-400 rounded-full shadow-sm">
            Open Source
          </span>
        </div>

        {/* Main Content Area */}
        <div className="my-auto space-y-8 max-w-xl text-left z-10 relative">
          {/* Header */}
          <h1 className="text-4xl md:text-[44px] font-extrabold tracking-tight text-[#1D1D1D] dark:text-zinc-100 leading-[1.1]">
            Your inbox should{' '}
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
              think before you do.
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm text-[#6B7280] dark:text-zinc-400 leading-relaxed max-w-lg">
            InboxOS parses and understands every incoming email. It
            automatically calculates priorities, isolates tasks, schedules
            calendar events, and escalates critical notifications to Slack or
            WhatsApp based on your routing logic.
          </p>

          {/* Pipeline Card (Redesigned White Card) */}
          <div className="bg-white dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-[22px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#5F6B38]/3 blur-2xl rounded-full" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAE5DA] dark:border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Cpu size={12} strokeWidth={1.5} className="text-[#5F6B38]" />
                <span>Dynamic Pipeline Agent</span>
              </span>
              <span className="text-[#5F6B38] flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#5F6B38] animate-ping" />
                <span>Active Thread</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 relative">
              {[
                {
                  step: 0,
                  icon: <Inbox size={14} strokeWidth={1.5} />,
                  label: 'Ingest',
                  val: 'Parsing body...',
                },
                {
                  step: 1,
                  icon: <Cpu size={14} strokeWidth={1.5} />,
                  label: 'AI Analyze',
                  val: '94% Urgent',
                },
                {
                  step: 2,
                  icon: <Zap size={14} strokeWidth={1.5} />,
                  label: 'Rules DSL',
                  val: 'Trigger: Alert',
                },
                {
                  step: 3,
                  icon: <Send size={14} strokeWidth={1.5} />,
                  label: 'Dispatch',
                  val: 'Sent Slack',
                },
              ].map((node) => {
                const isActive = pipelineStep === node.step;
                const isPassed = pipelineStep >= node.step;
                return (
                  <div
                    key={node.step}
                    className={`p-2.5 text-center rounded-[16px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-sm ${
                      isActive
                        ? 'bg-[#5F6B38]/5 dark:bg-[#778b46]/10 border-[#5F6B38]/30 dark:border-[#778b46]/30 shadow-sm scale-[1.02]'
                        : 'bg-transparent border-[#EAE5DA] dark:border-zinc-800'
                    }`}
                  >
                    <div
                      className={`mx-auto h-7 w-7 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                        isActive
                          ? 'bg-[#5F6B38] dark:bg-[#778b46] text-white shadow-sm'
                          : isPassed
                            ? 'bg-[#5F6B38]/10 dark:bg-[#778b46]/20 text-[#5F6B38] dark:text-[#778b46]'
                            : 'bg-[#FAF7F2] dark:bg-zinc-800 text-[#9CA3AF] dark:text-zinc-500'
                      }`}
                    >
                      {node.icon}
                    </div>
                    <p className="text-[10px] font-bold text-[#1D1D1D] dark:text-zinc-200">
                      {node.label}
                    </p>
                    <p className="text-[8px] truncate mt-0.5 text-[#6B7280] dark:text-zinc-400 font-mono">
                      {isPassed ? node.val : 'Idle...'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Pipeline Completed Notification */}
            <AnimatePresence>
              {pipelineStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20"
                >
                  <div className="h-8 w-8 rounded-full bg-[#5F6B38]/10 flex items-center justify-center mb-2 animate-bounce">
                    <CheckCircle2
                      size={18}
                      strokeWidth={1.5}
                      className="text-[#5F6B38]"
                    />
                  </div>
                  <h5 className="text-xs font-bold text-[#1D1D1D] dark:text-zinc-200">
                    Email Action Handled
                  </h5>
                  <p className="text-[10px] mt-0.5 text-[#6B7280] dark:text-zinc-400">
                    Thread parsed, rule resolved, notifications dispatched in
                    0.8s.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feature Tags (Rounded Pills with soft Olive backgrounds) */}
          <div className="flex flex-wrap gap-2 pt-2">
            {featureChips.map((chip, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -2 }}
                className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 bg-[#5F6B38]/5 dark:bg-[#778b46]/10 text-[#5F6B38] dark:text-[#778b46] rounded-full border border-[#5F6B38]/10 dark:border-[#778b46]/20 flex items-center gap-1.5 select-none transition-colors hover:bg-[#5F6B38]/10 dark:hover:bg-[#778b46]/20"
              >
                <Check size={11} strokeWidth={2} className="text-[#5F6B38]" />
                <span>{chip}</span>
              </motion.span>
            ))}
          </div>
        </div>

        {/* Testimonials Quote Card (Small floating card at bottom of left panel) */}
        <div className="w-full border-t border-[#EAE5DA] dark:border-zinc-800 pt-6 mt-auto z-10 relative">
          <div className="bg-white dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-[16px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] max-w-md">
            <div className="min-h-[64px] flex flex-col justify-between text-left relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-[11px] italic font-medium leading-relaxed text-[#6B7280] dark:text-zinc-400">
                    "{testimonials[activeTestimonial].text}"
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#1D1D1D] dark:text-zinc-200">
                      {testimonials[activeTestimonial].author}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                      {testimonials[activeTestimonial].role}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Right Auth Panel ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[42%] flex flex-col justify-center items-center p-6 md:p-12 relative bg-[#FAF7F2] dark:bg-zinc-950 min-h-screen z-10">
        {/* Day/Night Toggle at top right */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-10 h-10 rounded-[14px] border border-[#EAE5DA] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#6B7280] dark:text-zinc-400 hover:text-[#1D1D1D] dark:hover:text-zinc-200 hover:bg-[#FAF7F2] dark:hover:bg-zinc-800 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm"
            aria-label="Toggle theme placeholder"
          >
            {isDarkMode ? (
              <Moon
                size={18}
                strokeWidth={1.5}
                className="rotate-12 transition-transform duration-300"
              />
            ) : (
              <Sun
                size={18}
                strokeWidth={1.5}
                className="transition-transform duration-300"
              />
            )}
          </button>
        </div>

        {/* Authentication Card Wrapper (Slide from right, Fade + Slide Up) */}
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="w-full max-w-[440px] bg-white dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-6 md:p-12 relative flex flex-col"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
