import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmailRow, type EmailData } from './EmailRow';
import { EmailSkeletonList } from './EmailSkeleton';
import {
  Inbox,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { EmailViewer } from './EmailViewer';
import { EmptyState } from './EmptyState';
import { useSocket } from '../context/SocketContext';
import { API_BASE, authenticatedFetch } from '../config';

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

interface EmailListProps {
  gmailConnected?: boolean;
  onConnectGmail?: () => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  gmailConnected = true,
  onConnectGmail,
}) => {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isAiSearch, setIsAiSearch] = useState<boolean>(false);
  const [aiResults, setAiResults] = useState<EmailData[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const { socket } = useSocket();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<
    EmailData[]
  >({
    queryKey: ['emails', categoryFilter, currentPage, pageSize],
    queryFn: async () => {
      const url = `${API_BASE}/api/emails?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}${
        categoryFilter !== 'all' ? `&category=${categoryFilter}` : ''
      }`;
      const response = await authenticatedFetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('API Endpoint not available');
      const json = await response.json();
      if (
        json &&
        typeof json === 'object' &&
        'emails' in json &&
        Array.isArray(json.emails)
      ) {
        return json.emails;
      }
      if (Array.isArray(json)) return json;
      throw new Error('Invalid API response format');
    },
    gcTime: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 5,
  });

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

  const emailsList = data;

  const handleSelectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedEmailId(null);
  }, []);

  const filteredEmails = useMemo(() => {
    const list = emailsList || [];
    return list.filter((email) => {
      const matchesCategory =
        categoryFilter === 'all' ||
        (
          email.analysis?.category ||
          email.category ||
          'personal'
        ).toLowerCase() === categoryFilter.toLowerCase();
      const subjectMatches = email.subject
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const senderMatches =
        email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (email.sender_name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const summaryMatches = (email.analysis?.summary || email.body_text || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return (
        matchesCategory && (subjectMatches || senderMatches || summaryMatches)
      );
    });
  }, [emailsList, categoryFilter, searchQuery]);

  const totalItems = filteredEmails.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedEmails = useMemo(
    () => filteredEmails.slice(startIndex, endIndex),
    [filteredEmails, startIndex, endIndex]
  );

  useEffect(() => {
    if (!isAiSearch) {
      setAiResults([]);
      return;
    }
    if (!searchQuery.trim()) {
      setAiResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE}/api/rag/search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery, limit: pageSize }),
            credentials: 'include',
          }
        );
        if (response.ok) {
          const data = await response.json();
          setAiResults(data);
        }
      } catch (error) {
        console.error('Error fetching AI search results:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isAiSearch, pageSize]);

  const displayedEmails = useMemo(() => {
    if (isAiSearch && searchQuery.trim()) return aiResults;
    return paginatedEmails;
  }, [isAiSearch, searchQuery, aiResults, paginatedEmails]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    },
    [totalPages]
  );

  const handleCategoryChange = useCallback((catId: string) => {
    setCategoryFilter(catId);
    setCurrentPage(1);
  }, []);

  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (wrapperRef.current?.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || pullStartY === null) return;
    const diff = e.touches[0].clientY - pullStartY;
    if (diff > 0) setPullDistance(Math.min(diff / 2, 120));
  };
  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) refetch();
    setPullStartY(null);
    setIsPulling(false);
    setPullDistance(0);
  };

  if (selectedEmailId) {
    return <EmailViewer emailId={selectedEmailId} onBack={handleBackToList} />;
  }

  // Premium pill tab helper
  const neuTabBtn = (isActive: boolean): React.CSSProperties => ({
    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
    color: isActive ? '#fff' : 'var(--color-muted)',
    border: isActive
      ? '1px solid transparent'
      : '1px solid var(--color-border)',
    boxShadow: isActive ? '0 4px 14px rgba(93,107,47,.20)' : 'var(--shadow-sm)',
    fontWeight: 500,
    fontSize: '12px',
    borderRadius: '100px',
    padding: '5px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div
      ref={wrapperRef}
      className="space-y-3"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance}px)` }}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex justify-center items-center h-8 transition-opacity duration-200"
          style={{ opacity: pullDistance > 0 ? 1 : 0 }}
        >
          <RefreshCw
            size={20}
            className={isFetching ? 'animate-spin' : ''}
            style={{ color: 'var(--color-ink)' }}
          />
        </div>
      )}

      {/* ── Filter Tabs & Options Header ───────────────────────────────────── */}
      <div className="flex flex-row items-center justify-between gap-4 w-full overflow-x-auto scrollbar-none pb-2 shrink-0">
        {/* Horizontal Category Tabs */}
        <div className="flex flex-row items-center gap-1.5 shrink-0">
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                style={neuTabBtn(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'rgba(93,107,47,.06)';
                    (e.currentTarget as HTMLElement).style.color =
                      'var(--color-ink)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'var(--color-surface)';
                    (e.currentTarget as HTMLElement).style.color =
                      'var(--color-muted)';
                  }
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Options */}
        <div className="flex items-center gap-2 shrink-0">
          <label
            className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 font-medium text-[12px] rounded-full transition-all"
            style={{
              backgroundColor: isAiSearch
                ? 'rgba(93,107,47,.10)'
                : 'var(--color-surface)',
              color: isAiSearch ? 'var(--color-primary)' : 'var(--color-muted)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <input
              type="checkbox"
              checked={isAiSearch}
              onChange={(e) => {
                setIsAiSearch(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            <span>AI Search</span>
          </label>

          <div className="relative w-[180px] sm:w-[240px]">
            <Search
              size={14}
              className="absolute left-3 top-3"
              style={{ color: '#777' }}
            />
            <input
              type="text"
              placeholder={
                isAiSearch ? 'AI-powered search...' : 'Search local inbox...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="neu-input pl-9 text-xs"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            title="Refresh Ingests"
            aria-label="Refresh Ingests"
            className="p-2 flex items-center justify-center rounded-[8px] transition-all disabled:opacity-50 shrink-0"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              boxShadow: 'var(--shadow-sm)',
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
              (e.currentTarget as HTMLElement).style.color =
                'var(--color-muted)';
            }}
          >
            <RefreshCw
              size={14}
              className={`${isLoading || isFetching ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ── Inbox List Display ──────────────────────────────────────────────── */}
      {isLoading ? (
        <EmailSkeletonList count={pageSize} />
      ) : isError ? (
        <div
          className="p-8 text-center flex flex-col items-center justify-center gap-3 rounded-[22px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(217,104,87,.20)',
            boxShadow: '0 4px 20px rgba(217,104,87,.10)',
          }}
        >
          <AlertCircle size={32} style={{ color: 'var(--color-danger)' }} />
          <div>
            <h4
              className="text-[14px] font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              Pipeline Sync Error
            </h4>
            <p
              className="text-[12px] mt-1"
              style={{ color: 'var(--color-muted)' }}
            >
              Failed to read email list from decision API.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all"
            style={{
              backgroundColor: 'var(--color-danger)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(217,104,87,.30)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 6px 20px rgba(217,104,87,.40)';
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 14px rgba(217,104,87,.30)';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            Retry Connection
          </button>
        </div>
      ) : !gmailConnected ? (
        <div
          className="p-8 text-center flex flex-col items-center justify-center gap-4 rounded-[22px] py-16"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="w-16 h-16 flex items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(219,68,85,.10)',
              color: 'var(--color-danger)',
            }}
          >
            <Mail size={32} />
          </div>
          <div>
            <h4
              className="text-[16px] font-bold text-black"
              style={{ color: 'var(--color-ink)' }}
            >
              Connect Your Gmail Account
            </h4>
            <p
              className="text-[13px] mt-1.5 max-w-[400px] mx-auto text-gray-600"
              style={{ color: 'var(--color-muted)' }}
            >
              InboxOS needs authorization to read and sync your emails. Connect
              your Google account to get started.
            </p>
          </div>
          <button
            onClick={onConnectGmail}
            className="px-5 py-2.5 text-[13px] font-semibold rounded-[10px] transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(93,107,47,.25)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 6px 20px rgba(93,107,47,.35)';
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 14px rgba(93,107,47,.25)';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            Connect Gmail
          </button>
        </div>
      ) : paginatedEmails.length === 0 ? (
        <EmptyState
          title="Zero Mail Load"
          description="No emails match the category or filter query."
          icon={Inbox}
        />
      ) : (
        <div className="space-y-0">
          {isSearching && (
            <div
              className="text-center py-2.5 text-[12px] font-medium rounded-[10px] flex items-center justify-center gap-2 mb-3"
              style={{
                backgroundColor: 'rgba(93,107,47,.06)',
                border: '1px solid rgba(93,107,47,.15)',
                color: 'var(--color-primary)',
              }}
            >
              <RefreshCw size={13} className="animate-spin" />
              <span>Analyzing semantics…</span>
            </div>
          )}
          {displayedEmails.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              onClick={handleSelectEmail}
            />
          ))}
        </div>
      )}

      {/* ── Pagination Footer Controls ─────────────────────────────────────── */}
      {filteredEmails.length > 0 && (
        <div
          className="flex flex-col sm:flex-row gap-4 items-center justify-between px-2 pt-4"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            fontSize: '12px',
          }}
        >
          <div
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: 'var(--color-muted)' }}
          >
            <span>Showing</span>
            <span
              className="font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              {startIndex + 1}
            </span>
            <span>to</span>
            <span
              className="font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              {endIndex}
            </span>
            <span>of</span>
            <span
              className="font-semibold"
              style={{ color: 'var(--color-ink)' }}
            >
              {totalItems}
            </span>
            <span>records</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[12px]"
                style={{ color: 'var(--color-muted)' }}
              >
                Limit:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Previous page"
                className="p-2 rounded-[8px] transition-all disabled:opacity-30 disabled:pointer-events-none"
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
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-muted)';
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <div
                className="flex items-center gap-1 font-medium px-2 text-[12px]"
                style={{ color: 'var(--color-ink)' }}
              >
                <span>{currentPage}</span>
                <span style={{ color: 'var(--color-muted)' }}>/</span>
                <span>{totalPages}</span>
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Next page"
                className="p-2 rounded-[8px] transition-all disabled:opacity-30 disabled:pointer-events-none"
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
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-muted)';
                }}
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
