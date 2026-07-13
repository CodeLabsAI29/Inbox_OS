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
  Trash2,
  Receipt,
  TrendingDown,
} from 'lucide-react';
import { type EmailData } from './EmailRow';
import { useCompose } from '../context/ComposeContext';
import { API_BASE, authenticatedFetch } from '../config';

// Detailed mock data containing body_html with potentially dangerous scripts (to verify sanitization)
const DETAILED_MOCK_EMAILS: Record<string, EmailData & { body_html?: string }> =
  {
    e1: {
      id: 'e1',
      sender: 'security@google.com',
      sender_name: 'Google Security',
      subject: 'Critical security alert for your linked account',
      body_text:
        'We detected a login attempt from a new device in Tokyo, Japan. Please verify if this was you by entering the verification code: 490102.',
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
        summary:
          'Google security alert notifying user of a login attempt in Tokyo, requesting verification via OTP code 490102.',
      },
    },
    e2: {
      id: 'e2',
      sender: 'billing@stripe.com',
      sender_name: 'Stripe Billing',
      subject: 'Your Stripe Invoice #INV-88902 is ready',
      body_text:
        'Your monthly billing cycle has ended. A payment of $120.00 will be auto-debited from your visa ending in 4242 on July 5th. Review your invoice details.',
      body_html: `
      <div style="font-family: sans-serif; padding: 24px; color: #1f2937;">
        <img src="https://stripe.com/img/v3/home/twitter.png" width="40" alt="Stripe" style="margin-bottom: 20px;" />
        <h3 style="color: #635bff; margin: 0 0 10px 0;">Invoice #INV-88902</h3>
        <p>Hi there, your invoice for modern computing resources for the billing cycle ending June 30 is ready. Your credit card ending in 4242 will be charged <strong>$120.00 USD</strong> on July 5, 2026.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb; text-align: left;">
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
        summary:
          'Stripe invoice details for monthly billing cycle. Total charge is $120.00 USD, scheduled for auto-debit on July 5, 2026.',
      },
    },
    e3: {
      id: 'e3',
      sender: 'stripe-jobs@stripe.com',
      sender_name: 'Stripe Recruiting',
      subject: 'Technical Coding Interview - Software Engineer Intern',
      body_text:
        'Thank you for your application to Stripe. We would like to invite you for a 45-minute technical coding interview. Please use this calendar link to pick a slot before Friday.',
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
        summary:
          'Invitation to schedule a 45-minute technical interview for the SWE Intern position at Stripe. Deadline is Friday.',
      },
    },
    e4: {
      id: 'e4',
      sender: 'prof.sharma@university.edu',
      sender_name: 'Prof. Sharma (DBMS)',
      subject: 'DBMS Mini-Project Submission Deadline Tonight',
      body_text:
        'Dear students, this is a final reminder that the database management system mini-project submission portal closes tonight at 11:59 PM. Absolutely no extensions will be granted.',
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
        summary:
          'Urgent reminder from Prof. Sharma regarding the DBMS Mini-Project deadline at 11:59 PM tonight, emphasizing strict grading constraints and no extensions.',
      },
    },
  };

interface EmailViewerProps {
  emailId: string;
  onBack: () => void;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({
  emailId,
  onBack,
}) => {
  const { openCompose } = useCompose();
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>(
    {}
  );

  // Fetch full email details via TanStack Query
  const { data, isLoading, isError } = useQuery<
    EmailData & { body_html?: string }
  >({
    queryKey: ['email-detail', emailId],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/api/emails/${emailId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('API Details endpoint failed');
      }
      return response.json();
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  // Fallback to detailed mock records if API request fails
  const email =
    data || DETAILED_MOCK_EMAILS[emailId] || DETAILED_MOCK_EMAILS['e1'];

  // Google Calendar Integration hooks
  const { data: calendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/api/integrations/google_calendar/status`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) return { connected: false };
      return response.json();
    },
  });

  const { data: calendarEvents, refetch: refetchEvents } = useQuery<any[]>({
    queryKey: ['email-calendar-events', emailId],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/api/actions/calendar/events/${emailId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const triggerCalendarSync = async () => {
    setSyncingCalendar(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/actions/calendar/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailId }),
          credentials: 'include',
        }
      );
      if (response.ok) {
        refetchEvents();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to sync calendar event');
      }
    } catch (e) {
      console.error(e);
      alert('Network error triggering calendar sync');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const connectCalendar = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/integrations/google_calendar/auth`,
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        alert('Failed to initialize Google Calendar authentication');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to calendar authentication endpoint');
    }
  };

  // Load expenses for this email
  const { data: expenses, refetch: refetchExpenses } = useQuery<any[]>({
    queryKey: ['email-expenses', emailId],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/api/expenses/email/${emailId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  const [extractingExpense, setExtractingExpense] = useState(false);

  const triggerExpenseExtraction = async () => {
    setExtractingExpense(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/expenses/extract/${emailId}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (response.ok) {
        refetchExpenses();
      } else {
        const err = await response.json();
        alert(err.error || 'No expense data could be parsed from this email.');
      }
    } catch (e) {
      console.error(e);
      alert('Error triggering expense extraction.');
    } finally {
      setExtractingExpense(false);
    }
  };

  // Handle checked action items local toggle
  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse select-none">
        <div
          className="h-8 w-36"
          style={{ backgroundColor: '#e5e5e5', border: '1px solid #bbb' }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 p-6 space-y-5"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #111',
              boxShadow: '6px 6px 0 #111',
            }}
          >
            <div className="h-8 w-3/4" style={{ backgroundColor: '#e0e0e0' }} />
            <div className="h-10 w-full" style={{ backgroundColor: '#eee' }} />
            <div
              className="h-48 w-full"
              style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}
            />
          </div>
          <div
            className="p-5 h-64"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #111',
              boxShadow: '6px 6px 0 #111',
            }}
          />
        </div>
      </div>
    );
  }

  if (isError && !email) {
    return (
      <div
        className="p-8 text-center flex flex-col items-center justify-center gap-4 rounded-[22px]"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(217,104,87,.20)',
          boxShadow: '0 4px 20px rgba(217,104,87,.10)',
        }}
      >
        <AlertTriangle size={32} style={{ color: 'var(--color-danger)' }} />
        <h4
          className="text-[14px] font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          Ingest Details Missing
        </h4>
        <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
          Failed to retrieve raw mail and context parameters.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-[13px] font-medium flex items-center gap-1.5 transition-all rounded-[10px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--color-muted)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--color-primary)';
            (e.currentTarget as HTMLElement).style.color =
              'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--color-border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)';
          }}
        >
          <ArrowLeft size={12} />
          <span>Back to Ingests</span>
        </button>
      </div>
    );
  }

  // Sanitize the HTML body using DOMPurify before dangerously setting innerHTML
  const rawBodyHtml =
    email.body_html ||
    `<div style="font-family: sans-serif; white-space: pre-wrap; color: #333; line-height: 1.6;">${email.body_text || email.body || ''}</div>`;
  const sanitizedHtml = DOMPurify.sanitize(rawBodyHtml, {
    ALLOWED_TAGS: [
      'div',
      'p',
      'b',
      'i',
      'em',
      'strong',
      'a',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'br',
      'img',
      'strong',
    ],
    ALLOWED_ATTR: ['href', 'style', 'src', 'alt', 'width', 'height', 'target'],
  });

  const priorityScore = email.analysis?.priority_score || 50;

  // Mock extracted action items for visual sidebar completeness
  const actionItems = (() => {
    if (email.id === 'e1') {
      return [
        {
          desc: 'Confirm security code 490102 on Google accounts security portal',
          date: 'Immediate',
        },
        {
          desc: 'Inspect current active session details in Google settings',
          date: 'Today',
        },
      ];
    } else if (email.id === 'e2') {
      return [
        {
          desc: 'Verify Visa card ending in 4242 has sufficient balance for Vercel auto-debit',
          date: 'By July 5',
        },
        {
          desc: 'Forward Stripe payment receipt to company ledger accounts',
          date: 'By July 10',
        },
      ];
    } else if (email.id === 'e3') {
      return [
        {
          desc: 'Choose a 45-minute technical coding interview slot via Calendly',
          date: 'By Friday 5 PM',
        },
        {
          desc: 'Prepare algorithm, data structures, and complexity revision sheets',
          date: 'Ongoing',
        },
      ];
    } else if (email.id === 'e4') {
      return [
        {
          desc: 'Compile mini-project database code into static ZIP format',
          date: 'By Tonight 11:59 PM',
        },
        {
          desc: 'Submit Normal Form justifications doc to LMS submission panel',
          date: 'By Tonight 11:59 PM',
        },
      ];
    }
    return [
      { desc: 'Review mail content for important details', date: 'As needed' },
      { desc: 'Draft response to sender details', date: 'Within 24 hours' },
    ];
  })();

  return (
    <div className="space-y-5">
      {/* ── Header Action Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium min-h-[40px] transition-all rounded-[10px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--color-muted)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--color-primary)';
            (e.currentTarget as HTMLElement).style.color =
              'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--color-border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)';
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Inbound</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(93,107,47,.10)',
              color: 'var(--color-primary)',
            }}
          >
            ID: {email.id}
          </span>
        </div>
      </div>

      {/* ── Main Split Panel Layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left Column: Email Content Viewport ─── */}
        <section
          className="lg:col-span-2 overflow-hidden flex flex-col min-h-[500px] rounded-[22px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Ingest metadata header */}
          <div
            className="px-6 py-5"
            style={{
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'rgba(93,107,47,.04)',
            }}
          >
            <h1
              className="text-[16px] font-semibold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              {email.subject}
            </h1>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold shrink-0 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                  }}
                >
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-bold truncate"
                    style={{
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {email.sender_name || email.sender.split('@')[0]}
                  </p>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: '#555', fontFamily: 'var(--font-mono)' }}
                  >
                    {email.sender}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p
                  className="text-[10px] font-medium"
                  style={{ color: '#555', fontFamily: 'var(--font-mono)' }}
                >
                  {email.received_at
                    ? new Date(email.received_at).toLocaleString()
                    : email.createdAt
                      ? new Date(email.createdAt).toLocaleString()
                      : email.received || 'Recently'}
                </p>
                <p
                  className="text-[9px] font-bold mt-0.5"
                  style={{
                    color: 'var(--color-accent-cta)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  to: {email.recipient || 'me@inboxos.dev'}
                </p>
              </div>
            </div>
          </div>

          {/* Sanitized HTML Body Frame */}
          <div
            className="p-6 flex-1 overflow-y-auto"
            style={{ backgroundColor: '#FAFAF7' }}
          >
            <div
              className="prose max-w-none text-xs leading-relaxed"
              style={{ color: '#222' }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>
        </section>

        {/* ── Right Column: AI Insights Sidebar ─── */}
        <aside className="space-y-4">
          {/* AI Panel Wrapper */}
          <div
            className="p-5 space-y-5 rounded-[22px]"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between pb-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={15} style={{ color: 'var(--color-primary)' }} />
                <h3
                  className="text-[13px] font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                >
                  AI Decision Analysis
                </h3>
              </div>
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'var(--color-success)' }}
                ></span>
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-success)' }}
                ></span>
              </span>
            </div>

            {/* AI Summary */}
            <div className="space-y-2">
              <h4
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#666', fontFamily: 'var(--font-body)' }}
              >
                One-Sentence Summary
              </h4>
              <div
                className="p-3"
                style={{
                  backgroundColor: '#FFFDF5',
                  border: '1px solid var(--color-ink)',
                }}
              >
                <p
                  className="text-xs leading-normal"
                  style={{
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {email.analysis?.summary ||
                    'AI system has classified this thread. Action items extracted below.'}
                </p>
              </div>
            </div>

            {/* Decision Metrics */}
            <div className="space-y-2">
              <h4
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#666', fontFamily: 'var(--font-body)' }}
              >
                Decision Metrics
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    icon: <Flame size={13} />,
                    label: 'Priority',
                    value: `${priorityScore}`,
                    color: 'var(--color-danger)',
                  },
                  {
                    icon: <Clock size={13} />,
                    label: 'Urgency',
                    value: `${email.analysis?.urgency_score || 50}`,
                    color: 'var(--color-warning)',
                  },
                  {
                    icon: <ClipboardList size={13} />,
                    label: 'Action',
                    value: `${email.analysis?.actionability_score || 50}`,
                    color: 'var(--color-info)',
                  },
                ].map(({ icon, label, value, color }) => (
                  <div
                    key={label}
                    className="p-2 text-center rounded-[12px]"
                    style={{
                      backgroundColor: `${color}1A`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <div
                      className="mx-auto mb-1 flex justify-center"
                      style={{ color }}
                    >
                      {icon}
                    </div>
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-[13px] font-bold mt-0.5"
                      style={{ color }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Deadlines */}
            {email.analysis?.deadlines &&
              email.analysis.deadlines.length > 0 && (
                <div
                  className="space-y-2"
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '14px',
                  }}
                >
                  <h4
                    className="text-[11px] font-medium flex items-center gap-1.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    <Calendar
                      size={11}
                      style={{ color: 'var(--color-primary)' }}
                    />
                    <span>Deadlines</span>
                  </h4>
                  <div className="space-y-1.5">
                    {email.analysis.deadlines.map(
                      (deadlineStr: string, idx: number) => {
                        const formattedDate = (() => {
                          try {
                            const date = new Date(deadlineStr);
                            if (isNaN(date.getTime())) return deadlineStr;
                            return date.toLocaleString();
                          } catch {
                            return deadlineStr;
                          }
                        })();
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 rounded-[10px]"
                            style={{
                              backgroundColor: 'rgba(217,164,65,.08)',
                              border: '1px solid rgba(217,164,65,.20)',
                            }}
                          >
                            <Calendar
                              size={13}
                              className="shrink-0"
                              style={{ color: 'var(--color-warning)' }}
                            />
                            <div className="min-w-0">
                              <p
                                className="text-[12px] leading-normal font-medium"
                                style={{ color: 'var(--color-ink)' }}
                              >
                                {formattedDate}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

            {/* Extracted Action Items */}
            <div
              className="space-y-2"
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '14px',
              }}
            >
              <h4
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-muted)' }}
              >
                Extracted Action Items
              </h4>
              <div className="space-y-1.5">
                {actionItems.map((action, idx) => {
                  const isChecked = checkedActions[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className="flex items-start gap-3 p-3 cursor-pointer rounded-[10px] transition-all"
                      style={{
                        backgroundColor: isChecked
                          ? 'rgba(63,167,106,.10)'
                          : 'var(--color-surface)',
                        border: `1px solid ${isChecked ? 'rgba(63,167,106,.25)' : 'var(--color-border)'}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            'var(--color-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            'var(--color-border)';
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="mt-0.5 shrink-0"
                        style={{
                          color: isChecked
                            ? 'var(--color-success)'
                            : 'var(--color-muted)',
                        }}
                      >
                        {isChecked ? (
                          <CheckCircle2 size={14} fill="currentColor" />
                        ) : (
                          <CheckSquare size={14} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className="text-[12px] leading-normal"
                          style={{
                            textDecoration: isChecked ? 'line-through' : 'none',
                            color: isChecked
                              ? 'var(--color-muted)'
                              : 'var(--color-ink)',
                          }}
                        >
                          {action.desc}
                        </p>
                        <span
                          className="text-[10px] flex items-center gap-1.5 mt-1"
                          style={{
                            color: isChecked
                              ? 'var(--color-success)'
                              : 'var(--color-primary)',
                          }}
                        >
                          <Calendar size={9} />
                          <span>{action.date}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div
              className="space-y-2"
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '14px',
              }}
            >
              <div className="flex items-center justify-between">
                <h4
                  className="text-[11px] font-medium flex items-center gap-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <Calendar
                    size={11}
                    style={{ color: 'var(--color-primary)' }}
                  />
                  <span>Upcoming Meetings</span>
                </h4>
                {calendarStatus?.connected && (
                  <button
                    onClick={triggerCalendarSync}
                    disabled={syncingCalendar}
                    className="text-[11px] font-medium disabled:opacity-50"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {syncingCalendar ? 'Syncing...' : 'Sync +'}
                  </button>
                )}
              </div>

              {!calendarStatus?.connected ? (
                <div
                  className="p-3 space-y-2 text-center rounded-[12px]"
                  style={{
                    backgroundColor: 'rgba(217,104,87,.06)',
                    border: '1px solid rgba(217,104,87,.20)',
                  }}
                >
                  <p
                    className="text-[11px] leading-normal"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Google Calendar not linked.
                  </p>
                  <button
                    onClick={connectCalendar}
                    className="w-full py-1.5 text-[12px] font-medium rounded-[8px]"
                    style={{
                      backgroundColor: 'var(--color-danger)',
                      color: '#fff',
                    }}
                  >
                    Link Google Calendar
                  </button>
                </div>
              ) : calendarEvents && calendarEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {calendarEvents.map((evt, idx) => {
                    const isPending = evt.status === 'pending';
                    const isFailed = evt.status === 'failed';
                    const statusColor = isPending
                      ? 'var(--color-warning)'
                      : isFailed
                        ? 'var(--color-danger)'
                        : 'var(--color-success)';
                    return (
                      <div
                        key={idx}
                        className="p-3 space-y-2 rounded-[12px]"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p
                            className="text-[12px] font-medium leading-normal truncate"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {evt.title}
                          </p>
                          <span
                            className="text-[10px] px-2 py-0.5 font-medium rounded-full shrink-0"
                            style={{
                              backgroundColor: `${statusColor}1A`,
                              color: statusColor,
                            }}
                          >
                            {isPending
                              ? 'Pending'
                              : isFailed
                                ? 'Failed'
                                : 'Synced'}
                          </span>
                        </div>
                        <div
                          className="text-[11px] space-y-1"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          <p className="flex items-center gap-1.5">
                            <Clock size={10} />
                            <span>
                              {new Date(evt.startTime).toLocaleString()}
                            </span>
                          </p>
                          {evt.location && (
                            <p className="truncate">📍 {evt.location}</p>
                          )}
                        </div>
                        {evt.meetingLink && (
                          <a
                            href={evt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full justify-center items-center py-1.5 text-[12px] font-medium rounded-[8px]"
                            style={{
                              backgroundColor: 'var(--color-primary)',
                              color: '#fff',
                            }}
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="p-3 text-center rounded-[12px]"
                  style={{
                    backgroundColor: 'rgba(93,107,47,.04)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <p
                    className="text-[11px] leading-normal mb-2"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    No calendar events extracted yet.
                  </p>
                  <button
                    onClick={triggerCalendarSync}
                    disabled={syncingCalendar}
                    className="py-1.5 px-4 text-[12px] font-medium rounded-[8px] disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                    }}
                  >
                    {syncingCalendar ? 'Extracting...' : 'Extract & Create'}
                  </button>
                </div>
              )}
            </div>

            {/* Extracted Expenses */}
            <div
              className="space-y-2"
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '14px',
              }}
            >
              <div className="flex items-center justify-between">
                <h4
                  className="text-[11px] font-medium flex items-center gap-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <Receipt
                    size={11}
                    style={{ color: 'var(--color-success)' }}
                  />
                  <span>Extracted Expenses</span>
                </h4>
                {expenses && expenses.length > 0 && (
                  <button
                    onClick={triggerExpenseExtraction}
                    disabled={extractingExpense}
                    className="text-[11px] font-medium disabled:opacity-50"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {extractingExpense ? 'Re-extracting...' : 'Re-extract'}
                  </button>
                )}
              </div>

              {expenses && expenses.length > 0 ? (
                <div className="space-y-1.5">
                  {expenses.map((exp, idx) => {
                    const isRecur = exp.isRecurring;
                    const displaySymbol =
                      exp.currency === 'JPY'
                        ? '¥'
                        : exp.currency === 'EUR'
                          ? '€'
                          : exp.currency === 'GBP'
                            ? '£'
                            : '$';
                    return (
                      <div
                        key={idx}
                        className="p-3 space-y-2 rounded-[12px]"
                        style={{
                          backgroundColor: 'rgba(63,167,106,.06)',
                          border: '1px solid rgba(63,167,106,.18)',
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p
                              className="text-[12px] font-medium leading-normal truncate max-w-[120px]"
                              style={{ color: 'var(--color-ink)' }}
                            >
                              {exp.merchantName || 'Unknown Merchant'}
                            </p>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: 'var(--color-muted)' }}
                            >
                              {exp.category || 'other'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isRecur && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 font-semibold rounded-full flex items-center gap-0.5"
                                style={{
                                  backgroundColor: 'rgba(63,167,106,.15)',
                                  color: 'var(--color-success)',
                                }}
                              >
                                <TrendingDown size={8} /> Recurring
                              </span>
                            )}
                            <span
                              className="text-[10px]"
                              style={{
                                color: 'var(--color-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {exp.paymentMethod || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex justify-between items-center p-2 rounded-[8px]"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div>
                            <span
                              className="text-xs font-bold"
                              style={{
                                fontFamily: 'var(--font-display)',
                                color: 'var(--color-ink)',
                              }}
                            >
                              {displaySymbol}
                              {exp.amount?.toFixed(2)}
                            </span>
                            <span
                              className="text-[10px] font-mono ml-1"
                              style={{ color: '#666' }}
                            >
                              {exp.currency}
                            </span>
                          </div>
                          {exp.currency !== 'USD' && exp.amountUsd && (
                            <span
                              className="text-[9px]"
                              style={{
                                color: '#888',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              ~${exp.amountUsd.toFixed(2)} USD
                            </span>
                          )}
                        </div>

                        <div
                          className="text-[9px] flex justify-between"
                          style={{
                            color: '#888',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          <span>
                            Tx:{' '}
                            {exp.date
                              ? new Date(exp.date).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>

                        {exp.items &&
                          Array.isArray(exp.items) &&
                          exp.items.length > 0 && (
                            <div
                              className="mt-1 space-y-1"
                              style={{
                                borderTop: '1.5px solid var(--color-ink)',
                                paddingTop: '8px',
                              }}
                            >
                              <p
                                className="text-[8px] font-bold uppercase tracking-wide"
                                style={{ color: '#888' }}
                              >
                                Line Items
                              </p>
                              <div className="max-h-[100px] overflow-y-auto pr-1 space-y-1">
                                {exp.items.map((item: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex justify-between text-[10px] px-2 py-0.5"
                                    style={{
                                      backgroundColor: '#f0f0f0',
                                      color: '#444',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    <span className="truncate max-w-[130px]">
                                      {item.name}
                                      {item.quantity > 1
                                        ? ` x${item.quantity}`
                                        : ''}
                                    </span>
                                    <span
                                      className="font-bold shrink-0"
                                      style={{ color: 'var(--color-ink)' }}
                                    >
                                      {displaySymbol}
                                      {item.unitPrice
                                        ? item.unitPrice.toFixed(2)
                                        : '0.00'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="p-3 text-center"
                  style={{
                    backgroundColor: '#f9f9f9',
                    border: '1px solid var(--color-ink)',
                  }}
                >
                  <p
                    className="text-[11px] leading-normal mb-2"
                    style={{ color: '#666', fontFamily: 'var(--font-body)' }}
                  >
                    No expense data extracted yet.
                  </p>
                  <button
                    onClick={triggerExpenseExtraction}
                    disabled={extractingExpense}
                    className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-success)',
                      border: '1px solid var(--color-ink)',
                      color: '#fff',
                    }}
                  >
                    {extractingExpense
                      ? 'Extracting...'
                      : 'Detect & Extract Expense'}
                  </button>
                </div>
              )}
            </div>

            {/* Reply Draft Suggestion */}
            {email.analysis?.suggested_reply && (
              <div
                className="space-y-2"
                style={{
                  borderTop: '1px solid var(--color-ink)',
                  paddingTop: '16px',
                }}
              >
                <h4
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#666', fontFamily: 'var(--font-body)' }}
                >
                  AI Draft Suggestion
                </h4>
                <div
                  className="p-3"
                  style={{
                    backgroundColor: '#F0F5FF',
                    border: '1px solid var(--color-ink)',
                  }}
                >
                  <p
                    className="text-[11px] italic leading-relaxed"
                    style={{ color: '#444', fontFamily: 'var(--font-body)' }}
                  >
                    "{email.analysis.suggested_reply}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() =>
                openCompose({
                  to: email.sender,
                  subject: `Re: ${email.subject}`,
                  body: email.analysis?.suggested_reply || '',
                })
              }
              className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all min-h-[44px]"
              style={{
                backgroundColor: 'var(--color-accent-cta)',
                border: '1px solid var(--color-ink)',
                boxShadow: 'var(--shadow-offset-sm)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform =
                  'translate(4px,4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  'var(--shadow-offset-sm)';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              Reply Draft
            </button>
            <button
              onClick={() => alert('Archived Inbound.')}
              className="px-4 py-3 flex items-center justify-center min-h-[44px] min-w-[44px] transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-ink)',
                boxShadow: 'var(--shadow-offset-sm)',
                color: 'var(--color-ink)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform =
                  'translate(4px,4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  'var(--shadow-offset-sm)';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
