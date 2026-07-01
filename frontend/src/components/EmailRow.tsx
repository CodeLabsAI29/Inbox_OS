import React from 'react';
import { ShieldAlert, MailOpen, Mail } from 'lucide-react';

export interface EmailData {
  id: string;
  sender: string;
  sender_name?: string;
  recipient?: string;
  subject: string;
  body?: string;
  body_text?: string;
  status?: string; // 'UNREAD' or 'READ' from Node backend
  is_read?: boolean; // from Python backend
  category?: string; // from Node backend
  createdAt?: string; // from Node backend
  received_at?: string; // from Python backend
  received?: string; // from UI mock data
  analysis?: {
    category: string;
    priority_score: number;
    urgency_score: number;
    actionability_score: number;
    summary: string;
    suggested_reply?: string;
  };
}

interface EmailRowProps {
  email: EmailData;
  onClick?: (id: string) => void;
}

export const EmailRow = React.memo(function EmailRow({ email, onClick }: EmailRowProps) {
  // Normalize fields between Node and Python backends
  const isUnread = 
    email.is_read === false || 
    email.status === 'UNREAD' || 
    (email.status === undefined && email.is_read === undefined && email.received !== undefined && email.status !== 'READ');

  const senderName = email.sender_name || email.sender.split('@')[0];
  const senderEmail = email.sender;
  const subject = email.subject || '(No Subject)';
  
  const category = (email.analysis?.category || email.category || 'personal').toLowerCase();
  const priorityScore = email.analysis?.priority_score || 50;
  
  const summary = email.analysis?.summary || email.body_text || email.body || 'No summary generated.';
  
  // Normalize dates
  const rawDate = email.received_at || email.createdAt || email.received || 'Recently';
  const displayDate = React.useMemo(() => {
    if (!rawDate) return '';
    if (rawDate.includes('ago') || rawDate.includes('today') || rawDate.includes('PM') || rawDate.includes('AM')) return rawDate;
    try {
      const date = new Date(rawDate);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return rawDate;
    }
  }, [rawDate]);

  // Visual categorization badge definitions
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'urgent':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'job':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'finance':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'meeting':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'otp':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'newsletter':
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      case 'support':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'work':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
  };

  return (
    <div 
      onClick={() => onClick?.(email.id)}
      className={`glass rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex gap-4 ${
        isUnread 
          ? 'border-indigo-500/20 bg-indigo-500/[0.02] shadow-[0_4px_20px_-2px_rgba(99,102,241,0.05)]' 
          : 'border-white/5 bg-white/[0.01]'
      } hover:border-white/10 hover:bg-white/5 active:scale-[0.99]`}
    >
      
      {/* ── Unread Glow & Left Highlight Indicator ────────────────────────────────── */}
      <div className="flex flex-col justify-center items-center shrink-0 w-2.5">
        {isUnread ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
        )}
      </div>

      {/* ── Main Row Metadata & Information ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        
        {/* Row Header: Sender details, subject & date/score */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-4 mb-2">
          
          {/* Left Side: Sender & Subject (stacked on mobile, inline on desktop) */}
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0 flex-1">
            {/* Sender and mobile-only Date/Score */}
            <div className="flex items-center justify-between md:justify-start gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                  {senderName}
                </span>
                <span className="text-[10px] text-gray-500 truncate hidden sm:inline">
                  &lt;{senderEmail}&gt;
                </span>
              </div>
              
              {/* Mobile-only Date/Score (aligned top-right) */}
              <div className="flex items-center gap-2 md:hidden shrink-0">
                <span className="text-[10px] text-gray-500">{displayDate}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                  priorityScore > 85 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : priorityScore > 65 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'bg-white/5 text-gray-400'
                }`}>
                  {priorityScore}
                </span>
              </div>
            </div>

            {/* Separator dot on desktop between sender and subject */}
            <span className="hidden md:inline text-gray-600 text-[10px]">•</span>

            {/* Subject */}
            <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-gray-100' : 'text-gray-300'}`}>
              {subject}
            </h4>
          </div>

          {/* Desktop-only Date & Score */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <span className="text-[10px] text-gray-500">{displayDate}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
              priorityScore > 85 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                : priorityScore > 65 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'bg-white/5 text-gray-400'
            }`}>
              Score: {priorityScore}
            </span>
          </div>
        </div>

        {/* Row Summary / Body Preview */}
        <p className="text-[11px] text-gray-400 leading-normal line-clamp-2 pr-4 mb-3">
          {summary}
        </p>

        {/* Row Footer: AI Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${getCategoryStyles(category)}`}>
              {category}
            </span>
            {priorityScore > 85 && (
              <span className="text-[9px] font-semibold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                <ShieldAlert size={10} />
                <span>Urgent Action</span>
              </span>
            )}
          </div>
          
          {/* Read/Unread Icon toggle visual */}
          <div className="text-gray-500 hover:text-gray-300 transition-colors">
            {isUnread ? <Mail size={12} /> : <MailOpen size={12} />}
          </div>
        </div>

      </div>

    </div>
  );
});

