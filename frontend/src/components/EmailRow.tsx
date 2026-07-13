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
  status?: string;
  is_read?: boolean;
  category?: string;
  createdAt?: string;
  received_at?: string;
  received?: string;
  similarity?: number;
  analysis?: {
    category: string;
    priority_score: number;
    urgency_score: number;
    actionability_score: number;
    summary: string;
    suggested_reply?: string;
    deadlines?: string[];
  };
}

interface EmailRowProps {
  email: EmailData;
  onClick?: (id: string) => void;
}

export const EmailRow = React.memo(function EmailRow({
  email,
  onClick,
}: EmailRowProps) {
  const isUnread =
    email.is_read === false ||
    email.status === 'UNREAD' ||
    (email.status === undefined &&
      email.is_read === undefined &&
      email.received !== undefined &&
      email.status !== 'READ');

  const senderName = email.sender_name || email.sender.split('@')[0];
  const senderEmail = email.sender;
  const subject = email.subject || '(No Subject)';

  const category = (
    email.analysis?.category ||
    email.category ||
    'personal'
  ).toLowerCase();
  const priorityScore = email.analysis?.priority_score || 50;

  const summary =
    email.analysis?.summary ||
    email.body_text ||
    email.body ||
    'No summary generated.';

  const rawDate =
    email.received_at || email.createdAt || email.received || 'Recently';
  const displayDate = React.useMemo(() => {
    if (!rawDate) return '';
    if (
      rawDate.includes('ago') ||
      rawDate.includes('today') ||
      rawDate.includes('PM') ||
      rawDate.includes('AM')
    )
      return rawDate;
    try {
      const date = new Date(rawDate);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return rawDate;
    }
  }, [rawDate]);

  // Premium soft badge styles — no harsh black borders
  const getCategoryStyle = (cat: string): React.CSSProperties => {
    switch (cat) {
      case 'urgent':
        return { backgroundColor: 'rgba(217,104,87,.12)', color: '#D96857' };
      case 'job':
        return { backgroundColor: 'rgba(139,92,246,.12)', color: '#7C3AED' };
      case 'finance':
        return { backgroundColor: 'rgba(63,167,106,.12)', color: '#3FA76A' };
      case 'meeting':
        return { backgroundColor: 'rgba(59,130,246,.10)', color: '#3B82F6' };
      case 'otp':
        return { backgroundColor: 'rgba(217,164,65,.12)', color: '#D9A441' };
      case 'newsletter':
        return { backgroundColor: 'rgba(112,112,112,.10)', color: '#707070' };
      case 'support':
        return { backgroundColor: 'rgba(59,130,246,.10)', color: '#3B82F6' };
      case 'academic':
        return { backgroundColor: 'rgba(93,107,47,.12)', color: '#5D6B2F' };
      case 'work':
        return { backgroundColor: 'rgba(93,107,47,.12)', color: '#5D6B2F' };
      default:
        return { backgroundColor: 'rgba(228,184,92,.12)', color: '#C49030' };
    }
  };

  const getPriorityStyle = (score: number): React.CSSProperties => {
    if (score > 85)
      return { backgroundColor: 'rgba(217,104,87,.12)', color: '#D96857' };
    if (score > 65)
      return { backgroundColor: 'rgba(217,164,65,.12)', color: '#D9A441' };
    return { backgroundColor: 'rgba(112,112,112,.08)', color: '#9E9585' };
  };

  return (
    <div
      onClick={() => onClick?.(email.id)}
      className="px-4 py-3.5 cursor-pointer flex gap-4 transition-all duration-200 rounded-[16px]"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: isUnread
          ? '1px solid rgba(93,107,47,.20)'
          : '1px solid var(--color-border)',
        boxShadow: isUnread
          ? '0 2px 12px rgba(93,107,47,.08)'
          : 'var(--shadow-sm)',
        marginBottom: '6px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLElement).style.borderColor =
          'rgba(93,107,47,.25)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = isUnread
          ? '0 2px 12px rgba(93,107,47,.08)'
          : 'var(--shadow-sm)';
        el.style.transform = '';
        el.style.borderColor = isUnread
          ? 'rgba(93,107,47,.20)'
          : 'var(--color-border)';
      }}
    >
      {/* Unread indicator */}
      <div className="flex flex-col justify-center items-center shrink-0 w-2">
        {isUnread ? (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        ) : (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        )}
      </div>

      {/* ── Main Row Metadata ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Row Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-4 mb-1.5">
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2.5 min-w-0 flex-1">
            <div className="flex items-center justify-between md:justify-start gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[13px] truncate"
                  style={{
                    fontWeight: isUnread ? 700 : 500,
                    color: 'var(--color-ink)',
                  }}
                >
                  {senderName}
                </span>
                <span
                  className="text-[11px] truncate hidden sm:inline"
                  style={{
                    color: 'var(--color-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  &lt;{senderEmail}&gt;
                </span>
              </div>

              {/* Mobile-only Date/Score */}
              <div className="flex items-center gap-1.5 md:hidden shrink-0">
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {displayDate}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={getPriorityStyle(priorityScore)}
                >
                  {priorityScore}
                </span>
              </div>
            </div>

            <span
              className="hidden md:inline"
              style={{ color: 'var(--color-border)', fontSize: 10 }}
            >
              •
            </span>

            {/* Subject */}
            <h4
              className="text-[13px] truncate"
              style={{
                fontWeight: isUnread ? 600 : 400,
                color: isUnread ? 'var(--color-ink)' : 'var(--color-muted)',
              }}
            >
              {subject}
            </h4>
          </div>

          {/* Desktop Date & Score */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span
              className="text-[11px]"
              style={{ color: 'var(--color-muted)' }}
            >
              {displayDate}
            </span>
            {email.similarity !== undefined && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: 'rgba(63,167,106,.12)',
                  color: 'var(--color-success)',
                }}
              >
                {(email.similarity * 100).toFixed(0)}% Match
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={getPriorityStyle(priorityScore)}
            >
              {priorityScore}
            </span>
          </div>
        </div>

        {/* Summary preview */}
        <p
          className="text-[12px] leading-relaxed line-clamp-2 pr-4 mb-2.5"
          style={{ color: 'var(--color-muted)' }}
        >
          {summary}
        </p>

        {/* Row Footer: badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
              style={getCategoryStyle(category)}
            >
              {category}
            </span>
            {priorityScore > 85 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: 'rgba(217,104,87,.12)',
                  color: '#D96857',
                }}
              >
                <ShieldAlert size={9} />
                <span>Urgent</span>
              </span>
            )}
          </div>

          <div style={{ color: 'var(--color-muted)', opacity: 0.6 }}>
            {isUnread ? <Mail size={12} /> : <MailOpen size={12} />}
          </div>
        </div>
      </div>
    </div>
  );
});
