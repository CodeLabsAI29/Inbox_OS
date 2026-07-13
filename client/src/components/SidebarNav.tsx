import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Inbox, Settings, Plus, X, Sparkles } from 'lucide-react';
import { useCompose } from '../context/ComposeContext';

export interface SidebarNavProps {
  onCloseMobileMenu?: () => void;
  isMobile?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  onCloseMobileMenu,
  isMobile = false,
}) => {
  const location = useLocation();
  const { openCompose } = useCompose();

  interface NavigationItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }

  const navigationItems: NavigationItem[] = [
    {
      path: '/dashboard',
      label: 'Inbox',
      icon: <Inbox size={16} />,
    },
    {
      path: '/dashboard/settings',
      label: 'Settings',
      icon: <Settings size={16} />,
    },
  ];

  const isItemActive = (path: string) => {
    if (path.includes('tab=integrations')) {
      const searchParams = new URLSearchParams(location.search);
      return (
        location.pathname.startsWith('/dashboard/settings') &&
        searchParams.get('tab') === 'integrations'
      );
    }
    if (path === '/dashboard/settings') {
      const searchParams = new URLSearchParams(location.search);
      return (
        location.pathname.startsWith('/dashboard/settings') &&
        searchParams.get('tab') !== 'integrations'
      );
    }
    if (path === '/dashboard') {
      return (
        location.pathname === '/dashboard' ||
        location.pathname === '/dashboard/'
      );
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <div
      className="flex flex-col h-full flex-1 dark:bg-zinc-900"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Brand Logo ──────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between ${isMobile ? 'pb-4 mb-2' : 'px-5 py-5'}`}
      >
        <div className="flex items-center gap-2.5">
          {/* Logo mark: olive rounded */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Sparkles size={15} className="text-white" fill="white" />
          </div>
          <div className="text-left">
            <h1
              className="text-[15px] leading-none font-bold tracking-tight dark:text-zinc-100"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-ink)',
              }}
            >
              InboxOS
            </h1>
            <span
              className="text-[10px] font-medium tracking-wide block mt-0.5 dark:text-zinc-400"
              style={{ color: 'var(--color-muted)' }}
            >
              Decision Layer
            </span>
          </div>
        </div>

        {isMobile && onCloseMobileMenu && (
          <button
            onClick={onCloseMobileMenu}
            className="p-2 flex items-center justify-center rounded-lg transition-all dark:border-zinc-700 dark:text-zinc-400"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
            }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Compose Button ──────────────────────────────────────────────── */}
      <div className={`${isMobile ? 'py-2 mb-2' : 'px-4 pb-4'}`}>
        <button
          onClick={() => {
            openCompose();
            handleLinkClick();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-[10px] neu-btn-accent transition-all duration-200"
        >
          <Plus size={15} />
          <span>Compose</span>
        </button>
      </div>

      {/* ── Navigation Links ────────────────────────────────────────────── */}
      <nav
        className={`flex-1 overflow-y-auto text-left ${isMobile ? '' : 'px-3'}`}
      >
        <div
          className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 dark:text-zinc-500"
          style={{ color: 'var(--color-muted)' }}
        >
          Workspace
        </div>
        <div className="space-y-0.5">
          {navigationItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] transition-all duration-150 text-[13px] font-medium ${
                  active
                    ? 'bg-[rgba(93,107,47,0.12)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-muted)] hover:bg-[rgba(93,107,47,0.05)] dark:hover:bg-zinc-800/40 hover:text-[var(--color-ink)]'
                }`}
                style={{
                  fontFamily: 'var(--font-body)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${active ? 'opacity-100' : 'opacity-70'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      active
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[rgba(93,107,47,0.12)] text-[var(--color-primary)]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
