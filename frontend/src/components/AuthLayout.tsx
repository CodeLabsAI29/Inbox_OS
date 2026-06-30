import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Inbox, 
  Cpu, 
  Zap, 
  Send, 
  CheckCircle2, 
  Check
} from 'lucide-react';

interface Testimonial {
  text: string;
  author: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    text: "I haven't manually organized email in weeks. InboxOS handles it all.",
    author: "Alex Carter",
    role: "Startup Founder"
  },
  {
    text: "InboxOS catches critical deadlines and logs tasks before I even open my mail.",
    author: "Elena Rostova",
    role: "CS Student"
  },
  {
    text: "My inbox finally works like an operating system. Self-hosting with local Ollama is a game changer.",
    author: "Marcus Vance",
    role: "DevOps Engineer"
  }
];

const featureChips = [
  "AI Understanding",
  "Smart Routing",
  "Deadline Detection",
  "WhatsApp Alerts",
  "Calendar Automation",
  "Local AI",
  "Privacy First"
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interactive testimonial state
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Loop step for simulated AI pipeline in left showcase
  const [pipelineStep, setPipelineStep] = useState(0);

  // Mouse move glow handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Testimonial rotation loop
  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(testimonialInterval);
  }, []);

  // Pipeline step loop
  useEffect(() => {
    const pipelineInterval = setInterval(() => {
      setPipelineStep((prev) => (prev + 1) % 5);
    }, 2800);
    return () => clearInterval(pipelineInterval);
  }, []);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen w-full bg-[#09090F] text-slate-100 flex flex-col lg:flex-row relative overflow-x-hidden font-sans select-none"
    >
      
      {/* ── Background Gradients & Noise ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-[#6D5DF6]/10 to-[#5B7CFF]/5 blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#6D5DF6]/5 to-[#5B7CFF]/10 blur-[130px]" />
        <div className="absolute top-[30%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-[#5B7CFF]/5 blur-[120px]" />

        {/* Mouse Follow Radial Glow */}
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-80"
          style={{
            background: 'radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(109, 93, 246, 0.07), transparent 40%)'
          }}
        />
      </div>

      {/* ── Left Showcase Panel (60% Width on Desktop) ─────────────────────────── */}
      <div className="w-full lg:w-[60%] flex flex-col justify-between p-8 lg:p-14 z-10 border-b lg:border-b-0 lg:border-r border-white/[0.04] relative">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-[#6D5DF6] to-[#5B7CFF] shadow-[0_0_20px_rgba(109,93,246,0.3)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white">InboxOS</h2>
              <span className="text-[9px] font-bold tracking-widest text-[#5B7CFF] uppercase block -mt-0.5">AI Operating System</span>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-400">
            Open Source
          </span>
        </div>

        {/* Core Showcase Hero */}
        <div className="my-12 lg:my-0 space-y-8 max-w-xl text-left">
          
          <h1 className="text-4xl md:text-5xl lg:text-5.5xl font-extrabold tracking-tight text-white leading-[1.08]">
            Your inbox should <span className="bg-gradient-to-r from-[#6D5DF6] via-[#5B7CFF] to-cyan-400 bg-clip-text text-transparent">think before you do.</span>
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
            InboxOS parses and understands every incoming email. It automatically calculates priorities, isolates tasks, schedules calendar events, and escalates critical notifications to Slack or WhatsApp based on your routing logic.
          </p>

          {/* Simulated Pipeline Visualization */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6D5DF6]/5 blur-xl rounded-full" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Dynamic Pipeline Agent</span>
              <span className="text-[#6D5DF6]">Active Thread</span>
            </div>

            <div className="grid grid-cols-4 gap-2 relative">
              {[
                { step: 0, icon: <Inbox size={14} />, label: "Ingest", val: "Parsing raw header..." },
                { step: 1, icon: <Cpu size={14} />, label: "AI Analyze", val: "Priority: 94% Urgent" },
                { step: 2, icon: <Zap size={14} />, label: "Rules DSL", val: "Trigger: Outage Rule" },
                { step: 3, icon: <Send size={14} />, label: "Action Dispatch", val: "Dispatched slack payload" }
              ].map((node) => (
                <div 
                  key={node.step}
                  className={`p-2.5 rounded-xl border text-center transition-all duration-300 ${
                    pipelineStep === node.step 
                      ? 'bg-white/[0.05] border-[#6D5DF6] shadow-[0_0_15px_rgba(109,93,246,0.15)] scale-[1.03]' 
                      : 'bg-transparent border-white/[0.03]'
                  }`}
                >
                  <div className={`mx-auto h-7 w-7 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                    pipelineStep === node.step ? 'bg-[#6D5DF6] text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                    {node.icon}
                  </div>
                  <p className="text-[10px] font-bold text-white">{node.label}</p>
                  <p className="text-[8px] text-slate-500 truncate mt-0.5">{pipelineStep >= node.step ? node.val : "Idle..."}</p>
                </div>
              ))}
            </div>

            {/* Pipeline Completed Notification */}
            <AnimatePresence>
              {pipelineStep === 4 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#09090F]/95 flex flex-col items-center justify-center p-4 text-center z-20"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 animate-bounce">
                    <CheckCircle2 size={18} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-200">Email Action Handled</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Thread parsed, rule resolved, notifications dispatched in 0.8s.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating Feature Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {featureChips.map((chip, idx) => (
              <motion.span 
                key={idx}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: idx * 0.4 }}
                className="text-[10px] font-semibold bg-white/[0.03] border border-white/[0.05] hover:border-white/10 hover:bg-white/5 px-2.5 py-1 rounded-full text-slate-300 transition-colors flex items-center gap-1 cursor-default"
              >
                <Check size={10} className="text-[#6D5DF6]" />
                <span>{chip}</span>
              </motion.span>
            ))}
          </div>

        </div>

        {/* Footer Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/[0.04] pt-8 mt-12 text-left">
          <div>
            <p className="text-2xl font-black text-white tracking-tight">98%</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Classification Rate</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">1,000+</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Emails Processed</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">6+</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Output Integrations</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">&lt;60s</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Alert Response Time</p>
          </div>
        </div>

      </div>

      {/* ── Right Authentication Panel (40% Width on Desktop) ─────────────────── */}
      <div className="w-full lg:w-[40%] flex flex-col justify-between p-8 lg:p-14 z-10 relative bg-black/20 backdrop-blur-xl">
        
        {/* Empty space for layout balance */}
        <div className="hidden lg:block h-6" />

        {/* The Form Portal */}
        <div className="w-full max-w-[400px] mx-auto py-8 lg:py-0">
          {children}
        </div>

        {/* Testimonials Slider */}
        <div className="w-full max-w-[400px] mx-auto border-t border-white/[0.04] pt-6 mt-8">
          <div className="min-h-[76px] flex flex-col justify-between text-left relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="space-y-2.5"
              >
                <div className="flex gap-1 text-[#6D5DF6]">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} size={10} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
                  "{testimonials[activeTestimonial].text}"
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white">
                    {testimonials[activeTestimonial].author}
                  </span>
                  <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider">
                    {testimonials[activeTestimonial].role}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
};
