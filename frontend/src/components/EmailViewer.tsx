import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  User, 
  Clock, 
  ClipboardList,
  Flame,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { type EmailData } from './EmailRow';
import { useCompose } from '../context/ComposeContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Detailed mock data containing body_html with potentially dangerous scripts (to verify sanitization)
const DETAILED_MOCK_EMAILS: Record<string, EmailData & { body_html?: string }> = {
  e1: {
    id: 'e1',
    sender: 'security@google.com',
    sender_name: 'Google Security',
    subject: 'Critical security alert for your linked account',
    body_text: 'We detected a login attempt from a new device in Tokyo, Japan. Please verify if this was you by entering the verification code: 490102.',
    body_html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #d93025; margin-bottom: 16px;">New Sign-in Alert</h2>
        <p>A new sign-in attempt was detected on your account from a device in <strong>Tokyo, Japan</strong>.</p>
        <div style="background: #fff; border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 14px; margin: 0 0 8px 0; color: #555;">Verification Code</p>
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1a73e8;">490102</span>
        </div>
        <p>If this was not you, please secure your account immediately. <a href="https://accounts.google.com/security" style="color: #1a73e8; text-decoration: none;">Secure Account &rarr;</a></p>
        <!-- XSS injection attempt check -->
        <script>alert("Hacked! XSS Triggered!");</script>
        <img src="doesnotexist" onerror="console.log('XSS attempt via image onerror trigger!')" style="display:none;" />
      </div>
    `,
    category: 'otp',
    createdAt: new Date().toISOString(),
    analysis: {
      category: 'otp',
      priority_score: 98,
      urgency_score: 98,
      actionability_score: 95,
      summary: 'Google security alert notifying user of a login attempt in Tokyo, requesting verification via OTP code 490102.'
    }
  },
  e2: {
    id: 'e2',
    sender: 'billing@stripe.com',
    sender_name: 'Stripe Billing',
    subject: 'Your Stripe Invoice #INV-88902 is ready',
    body_text: 'Your monthly billing cycle has ended. A payment of $120.00 will be auto-debited from your visa ending in 4242 on July 5th. Review your invoice details.',
    body_html: `
      <div style="font-family: sans-serif; padding: 24px; color: #1f2937;">
        <img src="https://stripe.com/img/v3/home/twitter.png" width="40" alt="Stripe" style="margin-bottom: 20px;" />
        <h3 style="color: #635bff; margin: 0 0 10px 0;">Invoice #INV-88902</h3>
        <p>Hi there, your invoice for modern computing resources for the billing cycle ending June 30 is ready. Your credit card ending in 4242 will be charged <strong>$120.00 USD</strong> on July 5, 2026.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
              <th style="padding: 8px 0;">Description</th>
              <th style="padding: 8px 0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #4b5563;">Database Instance (Active Pools)</td>
              <td style="padding: 8px 0; text-align: right;">$100.00</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #4b5563;">Network Bandwidth egress</td>
              <td style="padding: 8px 0; text-align: right;">$20.00</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 13px; color: #6b7280;">If you have any questions, reach out to our team at support@stripe.com.</p>
      </div>
    `,
    category: 'finance',
    createdAt: new Date().toISOString(),
    analysis: {
      category: 'finance',
      priority_score: 82,
      urgency_score: 75,
      actionability_score: 60,
      summary: 'Stripe invoice details for monthly billing cycle. Total charge is $120.00 USD, scheduled for auto-debit on July 5, 2026.'
    }
  },
  e3: {
    id: 'e3',
    sender: 'stripe-jobs@stripe.com',
    sender_name: 'Stripe Recruiting',
    subject: 'Technical Coding Interview - Software Engineer Intern',
    body_text: 'Thank you for your application to Stripe. We would like to invite you for a 45-minute technical coding interview. Please use this calendar link to pick a slot before Friday.',
    body_html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; padding: 24px;">
        <h2 style="color: #635bff; margin-top: 0;">Congratulations!</h2>
        <p>Dear Candidate,</p>
        <p>Thank you for applying to the <strong>Software Engineer Intern</strong> role at Stripe. We reviewed your resume and would love to invite you to schedule your technical coding round.</p>
        <p>The interview will be conducted via Zoom and will last approximately 45 minutes, focusing on algorithm design, data structures, and system efficiency.</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="https://calendly.com/stripe-hiring" style="background-color: #635bff; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Schedule Interview Slot &rarr;</a>
        </div>
        <p style="font-size: 13px; color: #dc2626;"><strong>Action Required:</strong> Please schedule your slot by Friday at 5 PM EST.</p>
        <p>Best regards,<br/>The Stripe Recruiting Team</p>
      </div>
    `,
    category: 'job',
    createdAt: new Date().toISOString(),
    analysis: {
      category: 'job',
      priority_score: 88,
      urgency_score: 90,
      actionability_score: 95,
      summary: 'Invitation to schedule a 45-minute technical interview for the SWE Intern position at Stripe. Deadline is Friday.'
    }
  },
  e4: {
    id: 'e4',
    sender: 'prof.sharma@university.edu',
    sender_name: 'Prof. Sharma (DBMS)',
    subject: 'DBMS Mini-Project Submission Deadline Tonight',
    body_text: 'Dear students, this is a final reminder that the database management system mini-project submission portal closes tonight at 11:59 PM. Absolutely no extensions will be granted.',
    body_html: `
      <div style="font-family: serif; font-size: 16px; line-height: 1.6; padding: 20px; border-left: 4px solid #d93025; background: #fff8f8;">
        <h3 style="color: #d93025; margin-top: 0;">URGENT ACADEMIC NOTICE</h3>
        <p>Dear Class,</p>
        <p>This is a final reminder that your <strong>DBMS Mini-Project submission portal</strong> is closing tonight, <strong>June 30 at 11:59 PM</strong>. Files must be uploaded to the university LMS portal.</p>
        <p>The grading rubric requires:</p>
        <ul>
          <li>Full SQL DDL/DML schema definitions</li>
          <li>Normal Form justifications (1NF, 2NF, 3NF, BCNF)</li>
          <li>React/Express application codebase ZIP link</li>
        </ul>
        <p style="color: #d93025; font-weight: bold;">Absolutely no late extensions or email submissions will be accepted. Zero credit will be assigned to late uploads.</p>
        <p>Best,<br/>Prof. Sharma</p>
      </div>
    `,
    category: 'academic',
    createdAt: new Date().toISOString(),
    analysis: {
      category: 'academic',
      priority_score: 95,
      urgency_score: 98,
      actionability_score: 98,
      summary: 'Urgent reminder from Prof. Sharma regarding the DBMS Mini-Project deadline at 11:59 PM tonight, emphasizing strict grading constraints and no extensions.'
    }
  }
};

interface EmailViewerProps {
  emailId: string;
  onBack: () => void;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ emailId, onBack }) => {
  const { openCompose } = useCompose();
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  // Fetch full email details via TanStack Query
  const { data, isLoading, isError } = useQuery<EmailData & { body_html?: string }>({
    queryKey: ['email-detail', emailId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/emails/${emailId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('API Details endpoint failed');
      }
      return response.json();
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  // Fallback to detailed mock records if API request fails
  const email = data || DETAILED_MOCK_EMAILS[emailId] || DETAILED_MOCK_EMAILS['e1'];

  // Handle checked action items local toggle
  const toggleAction = (idx: number) => {
    setCheckedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-6 w-32 bg-white/5 rounded-lg mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="h-8 w-3/4 bg-white/10 rounded-lg" />
            <div className="h-10 w-full bg-white/5 rounded-lg" />
            <div className="h-48 w-full bg-white/5 rounded-2xl" />
          </div>
          <div className="glass rounded-2xl p-6 border border-white/5 h-64 bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  if (isError && !email) {
    return (
      <div className="glass rounded-2xl p-8 border border-rose-500/20 text-center flex flex-col items-center justify-center gap-3">
        <AlertTriangle size={32} className="text-rose-400" />
        <h4 className="text-sm font-semibold text-white">Ingest Details Missing</h4>
        <p className="text-xs text-gray-400">Failed to retrieve raw mail and context parameters.</p>
        <button 
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-white/5 text-gray-200 border border-white/5 text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-1.5"
        >
          <ArrowLeft size={12} />
          <span>Back to Ingests</span>
        </button>
      </div>
    );
  }

  // Sanitize the HTML body using DOMPurify before dangerously setting innerHTML
  const rawBodyHtml = email.body_html || `<div style="font-family: sans-serif; white-space: pre-wrap; color: #d1d5db; line-height: 1.6;">${email.body_text || email.body || ''}</div>`;
  const sanitizedHtml = DOMPurify.sanitize(rawBodyHtml, {
    ALLOWED_TAGS: ['div', 'p', 'b', 'i', 'em', 'strong', 'a', 'span', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'img', 'strong'],
    ALLOWED_ATTR: ['href', 'style', 'src', 'alt', 'width', 'height', 'target']
  });

  const priorityScore = email.analysis?.priority_score || 50;

  // Mock extracted action items for visual sidebar completeness
  const actionItems = (() => {
    if (email.id === 'e1') {
      return [
        { desc: 'Confirm security code 490102 on Google accounts security portal', date: 'Immediate' },
        { desc: 'Inspect current active session details in Google settings', date: 'Today' }
      ];
    } else if (email.id === 'e2') {
      return [
        { desc: 'Verify Visa card ending in 4242 has sufficient balance for Vercel auto-debit', date: 'By July 5' },
        { desc: 'Forward Stripe payment receipt to company ledger accounts', date: 'By July 10' }
      ];
    } else if (email.id === 'e3') {
      return [
        { desc: 'Choose a 45-minute technical coding interview slot via Calendly', date: 'By Friday 5 PM' },
        { desc: 'Prepare algorithm, data structures, and complexity revision sheets', date: 'Ongoing' }
      ];
    } else if (email.id === 'e4') {
      return [
        { desc: 'Compile mini-project database code into static ZIP format', date: 'By Tonight 11:59 PM' },
        { desc: 'Submit Normal Form justifications doc to LMS submission panel', date: 'By Tonight 11:59 PM' }
      ];
    }
    return [
      { desc: 'Review mail content for important details', date: 'As needed' },
      { desc: 'Draft response to sender details', date: 'Within 24 hours' }
    ];
  })();

  return (
    <div className="space-y-6">
      
      {/* ── Header Action Bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Back to Inbound</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase bg-white/5 px-2.5 py-1 rounded border border-white/5">
            Ingest ID: {email.id}
          </span>
        </div>
      </div>

      {/* ── Main Split Panel Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ── Left Column: Email Content Viewport ────────────────────────────────── */}
        <section className="lg:col-span-2 glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
          
          {/* Ingest metadata header */}
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <h1 className="text-base font-bold text-white mb-3 tracking-tight">
              {email.subject}
            </h1>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 text-sm font-semibold shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-200 truncate">
                    {email.sender_name || email.sender.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">
                    {email.sender}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] text-gray-400 font-medium">
                  {email.received_at ? new Date(email.received_at).toLocaleString() : email.createdAt ? new Date(email.createdAt).toLocaleString() : email.received || 'Recently'}
                </p>
                <p className="text-[9px] text-indigo-400 font-semibold mt-0.5">
                  to: {email.recipient || 'me@inboxos.dev'}
                </p>
              </div>
            </div>
          </div>

          {/* Sanitized HTML Body Frame */}
          <div className="p-6 flex-1 bg-white/5 overflow-y-auto">
            <div 
              className="prose prose-invert max-w-none text-gray-300 text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>

        </section>

        {/* ── Right Column: AI Insights Sidebar ────────────────────────────────── */}
        <aside className="space-y-6">
          
          {/* AI Panel Wrapper - Elevated Background & Glass style */}
          <div className="glass bg-bg-elevated/75 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-5">
            
            {/* Header branding */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  AI Decision Analysis
                </h3>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {/* AI Summary Section */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                One-Sentence Summary
              </h4>
              <div className="glass-panel p-3.5 rounded-2xl border border-white/5 bg-indigo-500/[0.01]">
                <p className="text-xs text-gray-200 leading-normal">
                  {email.analysis?.summary || 'AI system has classified this thread. Action items extracted below.'}
                </p>
              </div>
            </div>

            {/* AI Decision Parameters / Metrics */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Decision Metrics
              </h4>
              <div className="grid grid-cols-3 gap-2">
                
                <div className="glass-panel p-2.5 rounded-xl border border-white/5 text-center">
                  <Flame size={14} className="text-rose-400 mx-auto mb-1.5" />
                  <p className="text-[9px] text-gray-400">Priority</p>
                  <p className="text-xs font-extrabold text-white mt-0.5">{priorityScore}/100</p>
                </div>

                <div className="glass-panel p-2.5 rounded-xl border border-white/5 text-center">
                  <Clock size={14} className="text-amber-400 mx-auto mb-1.5" />
                  <p className="text-[9px] text-gray-400">Urgency</p>
                  <p className="text-xs font-extrabold text-white mt-0.5">{email.analysis?.urgency_score || 50}/100</p>
                </div>

                <div className="glass-panel p-2.5 rounded-xl border border-white/5 text-center">
                  <ClipboardList size={14} className="text-indigo-400 mx-auto mb-1.5" />
                  <p className="text-[9px] text-gray-400">Action</p>
                  <p className="text-xs font-extrabold text-white mt-0.5">{email.analysis?.actionability_score || 50}/100</p>
                </div>

              </div>
            </div>

            {/* Extracted Action Items List */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Extracted Action Items
              </h4>
              <div className="space-y-2">
                {actionItems.map((action, idx) => {
                  const isChecked = checkedActions[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-gray-500' 
                          : 'bg-white/5 border-white/5 text-gray-200 hover:border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <button 
                        type="button"
                        className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-400' : 'text-gray-500'}`}
                      >
                        {isChecked ? <CheckCircle2 size={14} fill="currentColor" className="text-emerald-500" /> : <CheckSquare size={14} />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs leading-normal ${isChecked ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                          {action.desc}
                        </p>
                        <span className={`text-[9px] font-semibold flex items-center gap-1.5 mt-1.5 ${isChecked ? 'text-gray-500' : 'text-indigo-400'}`}>
                          <Calendar size={10} />
                          <span>{action.date}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reply Assist Draft suggestion */}
            {email.analysis?.suggested_reply && (
              <div className="space-y-2.5 border-t border-white/5 pt-4">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  AI Draft Suggestion
                </h4>
                <div className="glass-panel p-3.5 rounded-2xl border border-white/5 bg-indigo-500/[0.01]">
                  <p className="text-[11px] text-gray-300 italic leading-relaxed">
                    "{email.analysis.suggested_reply}"
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Quick Action buttons */}
          <div className="flex gap-3">
            <button 
              onClick={() => openCompose({
                to: email.sender,
                subject: `Re: ${email.subject}`,
                body: email.analysis?.suggested_reply || ''
              })}
              className="flex-1 py-3.5 text-xs font-semibold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-center transition-all glow-accent"
            >
              Reply Draft
            </button>
            <button 
              onClick={() => alert('Archived Inbound.')}
              className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>

        </aside>

      </div>

    </div>
  );
};
