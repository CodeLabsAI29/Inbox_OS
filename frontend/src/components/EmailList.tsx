import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmailRow, type EmailData } from './EmailRow';
import { EmailSkeletonList } from './EmailSkeleton';
import { 
  Inbox, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Search, 
  RefreshCw
} from 'lucide-react';
import { EmailViewer } from './EmailViewer';
import { EmptyState } from './EmptyState';
import { useSocket } from '../context/SocketContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Comprehensive mock data list to fall back on if backend is down/missing endpoint
const FALLBACK_MOCK_EMAILS: EmailData[] = [
  {
    id: 'e1',
    sender: 'security@google.com',
    sender_name: 'Google Security',
    subject: 'Critical security alert for your linked account',
    body_text: 'We detected a login attempt from a new device in Tokyo, Japan. Please verify if this was you by entering the verification code: 490102.',
    category: 'otp',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    analysis: { category: 'otp', priority_score: 98, urgency_score: 98, actionability_score: 95, summary: 'Google Security verification OTP code 490102 for new login attempt.' }
  },
  {
    id: 'e2',
    sender: 'billing@stripe.com',
    sender_name: 'Stripe Billing',
    subject: 'Your Stripe Invoice #INV-88902 is ready',
    body_text: 'Your monthly billing cycle has ended. A payment of $120.00 will be auto-debited from your visa ending in 4242 on July 5th. Review your invoice details.',
    category: 'finance',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    analysis: { category: 'finance', priority_score: 82, urgency_score: 75, actionability_score: 60, summary: 'Stripe monthly invoice of $120.00 to be auto-debited on July 5th.' }
  },
  {
    id: 'e3',
    sender: 'stripe-jobs@stripe.com',
    sender_name: 'Stripe Recruiting',
    subject: 'Technical Coding Interview - Software Engineer Intern',
    body_text: 'Thank you for your application to Stripe. We would like to invite you for a 45-minute technical coding interview. Please use this calendar link to pick a slot before Friday.',
    category: 'job',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    analysis: { category: 'job', priority_score: 88, urgency_score: 90, actionability_score: 95, summary: 'Invitation for a Stripe Software Engineer Intern technical interview slot scheduling.' }
  },
  {
    id: 'e4',
    sender: 'prof.sharma@university.edu',
    sender_name: 'Prof. Sharma (DBMS)',
    subject: 'DBMS Mini-Project Submission Deadline Tonight',
    body_text: 'Dear students, this is a final reminder that the database management system mini-project submission portal closes tonight at 11:59 PM. Absolutely no extensions will be granted.',
    category: 'academic',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    analysis: { category: 'academic', priority_score: 95, urgency_score: 98, actionability_score: 98, summary: 'DBMS project submission deadline reminder for 11:59 PM tonight.' }
  },
  {
    id: 'e5',
    sender: 'support@github.com',
    sender_name: 'GitHub Support',
    subject: '[GitHub] Password reset confirmation request',
    body_text: 'We received a request to reset your GitHub password. Please copy this verification code: 889104, or click the link below to change your credentials.',
    category: 'otp',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    analysis: { category: 'otp', priority_score: 96, urgency_score: 95, actionability_score: 95, summary: 'GitHub password reset verification OTP code: 889104.' }
  },
  {
    id: 'e6',
    sender: 'newsletter@tldr.tech',
    sender_name: 'TLDR Tech Newsletter',
    subject: 'TLDR: Apple\'s AI roadmap, Tesla self-driving beta, and Vite 6 updates',
    body_text: 'Good morning! In today\'s issue, we cover Apple\'s newly announced private cloud compute security architecture, Tesla\'s rollout of FSD v12.5, and Vite 6.0 stable benchmarks.',
    category: 'newsletter',
    status: 'READ',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    analysis: { category: 'newsletter', priority_score: 15, urgency_score: 10, actionability_score: 5, summary: 'Daily tech digest including Apple AI, Tesla FSD, and Vite 6 releases.' }
  },
  {
    id: 'e7',
    sender: 'design-sync@figma.com',
    sender_name: 'Figma Teams',
    subject: 'Alex Carter invited you to edit "InboxOS Glassmorphic UI"',
    body_text: 'Alex Carter has invited you to collaborate on the "InboxOS Glassmorphic UI Design System" draft. Click to open in your Figma workspace and view changes.',
    category: 'meeting',
    status: 'READ',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    analysis: { category: 'meeting', priority_score: 75, urgency_score: 50, actionability_score: 65, summary: 'Collaboration invite for InboxOS UI design file on Figma from Alex Carter.' }
  },
  {
    id: 'e8',
    sender: 'hiring@startupxyz.com',
    sender_name: 'Hiring Team (StartupXYZ)',
    subject: 'Job Offer: Frontend Engineer at StartupXYZ',
    body_text: 'Dear candidate, we are thrilled to offer you the position of Frontend Engineer. We are proposing a package of 18 LPA plus performance equity. Please respond by July 3.',
    category: 'job',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    analysis: { category: 'job', priority_score: 97, urgency_score: 85, actionability_score: 98, summary: 'Job offer for Frontend Engineer position at StartupXYZ, respond by July 3.' }
  },
  {
    id: 'e9',
    sender: 'weekly-digest@udemy.com',
    sender_name: 'Udemy Support',
    subject: 'Payment receipt: Course subscription invoice',
    body_text: 'Your payment of INR 2,499 for Course: "Modern Frontend Architecture Masterclass" was successfully processed via Razorpay. Receipt ID: rec-88902.',
    category: 'finance',
    status: 'READ',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    analysis: { category: 'finance', priority_score: 65, urgency_score: 30, actionability_score: 10, summary: 'Course purchase receipt for INR 2,499 from Udemy processed successfully.' }
  },
  {
    id: 'e10',
    sender: 'alerts@ops-genie.com',
    sender_name: 'Operations Alerts',
    subject: 'CRITICAL: production database CPU load > 98%',
    body_text: 'Warning: Node replica pg-node-3 CPU utilization has crossed 98% threshold for more than 5 minutes. Autoscale group is initializing replicas. Restart or scale pools immediately.',
    category: 'urgent',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    analysis: { category: 'urgent', priority_score: 99, urgency_score: 99, actionability_score: 95, summary: 'Critical warning of production database high CPU load exceeding 98% threshold.' }
  },
  {
    id: 'e11',
    sender: 'team-calendar@inboxos.dev',
    sender_name: 'InboxOS Sync',
    subject: 'Design Review & Backlog Grooming Session',
    body_text: 'Hi all, please accept the invite for our design sync and grooming session tomorrow at 10 AM. We will review task board columns, rule syntax DSL, and next deployment phases.',
    category: 'meeting',
    status: 'READ',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    analysis: { category: 'meeting', priority_score: 72, urgency_score: 60, actionability_score: 50, summary: 'Invite for team design review and backlog grooming sync tomorrow at 10 AM.' }
  },
  {
    id: 'e12',
    sender: 'noreply@razorpay.com',
    sender_name: 'Razorpay Billing',
    subject: 'Razorpay Payment Receipt: Subscription renewal',
    body_text: 'Payment of ₹999.00 to Vercel Hosting was processed successfully. Ref ID: pay_901842. Thank you for using Razorpay.',
    category: 'finance',
    status: 'READ',
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    analysis: { category: 'finance', priority_score: 60, urgency_score: 20, actionability_score: 10, summary: 'Payment receipt of ₹999 to Vercel processed via Razorpay.' }
  },
  {
    id: 'e13',
    sender: 'professor.sinha@university.edu',
    sender_name: 'Prof. Sinha (Compiler Design)',
    subject: 'Compiler Design Mid-Term grades posted',
    body_text: 'Hi, the grades for the compiler design mid-term examination have been published on the academic portal. If you have grading discrepancy queries, please schedule a sync.',
    category: 'academic',
    status: 'READ',
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    analysis: { category: 'academic', priority_score: 68, urgency_score: 40, actionability_score: 30, summary: 'Compiler design grades published on academic portal.' }
  },
  {
    id: 'e14',
    sender: 'weekly@medium.com',
    sender_name: 'Medium Digests',
    subject: 'Top stories in Frontend Engineering and AI Agents',
    body_text: 'Here is your weekly selection of articles: "Building fully agentic systems," "React Server Components inside static contexts," and "Tailwind CSS v4 design variables."',
    category: 'newsletter',
    status: 'READ',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    analysis: { category: 'newsletter', priority_score: 10, urgency_score: 5, actionability_score: 5, summary: 'Weekly Medium article digests for AI and Frontend architectures.' }
  },
  {
    id: 'e15',
    sender: 'support@openai.com',
    sender_name: 'OpenAI Developer Platform',
    subject: 'Your API usage quota update for GPT-4o-mini usage',
    body_text: 'We are writing to notify you that your usage tier has been upgraded to Tier 3, allowing higher rate limits of 10,000 requests per minute. Review your API dashboards.',
    category: 'support',
    status: 'READ',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    analysis: { category: 'support', priority_score: 70, urgency_score: 40, actionability_score: 30, summary: 'OpenAI API usage tier upgraded to Tier 3 with higher RPM rate limits.' }
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Ingests' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'finance', label: 'Finance' },
  { id: 'job', label: 'Jobs' },
  { id: 'otp', label: 'Security (OTP)' },
  { id: 'meeting', label: 'Syncs' },
  { id: 'newsletter', label: 'Newsletters' },
  { id: 'academic', label: 'Academic' },
];

export const EmailList: React.FC = () => {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const { socket } = useSocket();

  // TanStack Query to fetch list from API
  const { data, isLoading, isError, refetch, isFetching } = useQuery<EmailData[]>({
    queryKey: ['emails', categoryFilter, currentPage, pageSize],
    queryFn: async () => {
      // Endpoint is either /api/emails (Node backend mapping) or /emails (Python FastAPI mapping)
      const url = `${API_BASE}/api/emails?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}${
        categoryFilter !== 'all' ? `&category=${categoryFilter}` : ''
      }`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('API Endpoint not available');
      }
      
      const json = await response.json();
      if (json && typeof json === 'object' && 'emails' in json && Array.isArray(json.emails)) {
        return json.emails;
      }
      if (Array.isArray(json)) {
        return json;
      }
      throw new Error('Invalid API response format');
    },
    // Fail silently to mock data fallback so frontend is functional out of the box
    gcTime: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 5,
  });

  // Listen for real-time incoming emails and refetch from backend
  useEffect(() => {
    if (!socket) return;

    const handleNewEmail = (payload: any) => {
      console.log('[WebSocket] Real-time email received:', payload);
      refetch();
    };

    socket.on('email.received', handleNewEmail);

    return () => {
      socket.off('email.received', handleNewEmail);
    };
  }, [socket, refetch]);

  // Fallback to mock data if API fails
  const emailsList = data || FALLBACK_MOCK_EMAILS;

  // Click handler for email selection (passed to EmailRow)
  const handleSelectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
  }, []);

  // Back to list click handler (passed to EmailViewer)
  const handleBackToList = useCallback(() => {
    setSelectedEmailId(null);
  }, []);

  // Filter local data (Search & Tabs)
  const filteredEmails = useMemo(() => {
    return emailsList.filter(email => {
      // 1. Tab category filter
      const matchesCategory = 
        categoryFilter === 'all' || 
        (email.analysis?.category || email.category || 'personal').toLowerCase() === categoryFilter.toLowerCase();
      
      // 2. Search query filter
      const subjectMatches = email.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const senderMatches = email.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (email.sender_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const summaryMatches = (email.analysis?.summary || email.body_text || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSearch = subjectMatches || senderMatches || summaryMatches;

      return matchesCategory && matchesSearch;
    });
  }, [emailsList, categoryFilter, searchQuery]);

  // Paging computations
  const totalItems = filteredEmails.length;
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);
  
  // Slice current page records
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedEmails = useMemo(() => {
    return filteredEmails.slice(startIndex, endIndex);
  }, [filteredEmails, startIndex, endIndex]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategoryFilter(catId);
    setCurrentPage(1); // Reset page on category filter change
  }, []);

  // Intercept rendering if an email is selected
  if (selectedEmailId) {
    return (
      <EmailViewer 
        emailId={selectedEmailId} 
        onBack={handleBackToList} 
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── Filter Tabs & Options Header ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        
        {/* Horizontal Category Tabs */}
        <div className="flex flex-wrap gap-2 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`text-xs px-4 py-2.5 rounded-xl transition-all duration-200 shrink-0 font-medium ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold glow-accent'
                    : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Local Search Input & Options */}
        <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
          <div className="relative flex-1 xl:flex-none xl:w-[260px]">
            <Search size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search local inbox..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all duration-200"
            />
          </div>

          <button 
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            title="Refresh Ingests"
            aria-label="Refresh Ingests"
            className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={`${isLoading || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* ── Inbox List Display ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <EmailSkeletonList count={pageSize} />
      ) : isError ? (
        <div className="glass rounded-2xl p-8 border border-rose-500/20 text-center flex flex-col items-center justify-center gap-3">
          <AlertCircle size={32} className="text-rose-400" />
          <div>
            <h4 className="text-sm font-semibold text-white">Pipeline Sync Error</h4>
            <p className="text-xs text-gray-400 mt-1">Failed to read email list from decision API.</p>
          </div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold border border-rose-500/20 transition-all"
          >
            Retry Connection
          </button>
        </div>
      ) : paginatedEmails.length === 0 ? (
        <EmptyState
          title="Zero Mail Load"
          description="No emails match the category or filter query."
          icon={Inbox}
        />
      ) : (
        <div className="space-y-3">
          {/* Email row renders */}
          {paginatedEmails.map((email) => (
            <EmailRow 
              key={email.id} 
              email={email} 
              onClick={handleSelectEmail}
            />
          ))}
        </div>
      )}

      {/* ── Pagination Footer Controls ────────────────────────────────────────── */}
      {filteredEmails.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-2 pt-4 border-t border-white/5 text-xs text-gray-400">
          
          {/* Records description */}
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-semibold text-gray-200">{startIndex + 1}</span>
            <span>to</span>
            <span className="font-semibold text-gray-200">{endIndex}</span>
            <span>of</span>
            <span className="font-semibold text-gray-200">{totalItems}</span>
            <span>records</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4">
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span>Limit:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white/5 border border-white/5 text-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500/40 text-xs cursor-pointer font-medium"
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size} className="bg-bg-elevated text-gray-200">
                    {size} rows
                  </option>
                ))}
              </select>
            </div>

            {/* Paging Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Previous page"
                className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1 font-semibold text-gray-200 px-1">
                <span>Page</span>
                <span className="text-white font-bold">{currentPage}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Next page"
                className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              >
                <ChevronRight size={14} />
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
