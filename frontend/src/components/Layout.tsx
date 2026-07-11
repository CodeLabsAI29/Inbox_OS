import React, { useState } from 'react';
import { Search, Bell, Moon, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SidebarNav } from './SidebarNav';
import { FloatingActionButton } from './FloatingActionButton';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex min-h-screen font-sans" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-ink)' }}>
      {/* ── Left Sidebar (Desktop) ────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 z-30 shrink-0"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <SidebarNav />
      </aside>

      {/* ── Mobile Sidebar Drawer ─────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 flex md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <aside
          className={`relative flex flex-col w-[260px] h-full p-4 z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <SidebarNav
            isMobile
            onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          />
        </aside>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-20"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-primary)',
            boxShadow: '0 1px 0 rgba(0,0,0,.04)',
          }}
        >
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 flex items-center justify-center transition-all min-h-[40px] min-w-[40px] rounded-lg"
            style={{ border: '1px solid var(--color-border)' }}
            aria-label="Open mobile menu"
          >
            <Menu size={18} style={{ color: 'var(--color-muted)' }} />
          </button>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center w-full max-w-[400px] relative">
            <Search size={14} className="absolute left-3" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] rounded-[10px] outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-body)',
              }}
              onFocus={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(93,107,47,.08)';
              }}
              onBlur={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Right Header */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              className="p-2 flex items-center justify-center transition-all min-h-[36px] min-w-[36px] rounded-lg"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'; }}
              aria-label="Toggle theme"
            >
              <Moon size={15} />
            </button>

            {/* Notifications */}
            <button
              className="p-2 flex items-center justify-center transition-all relative min-h-[36px] min-w-[36px] rounded-lg"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'; }}
              aria-label="Notifications"
            >
              <Bell size={15} />
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full pulse"
                  style={{ backgroundColor: 'var(--color-danger)' }}
                />
            </button>

            {/* Divider */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <p className="text-[13px] font-semibold leading-tight truncate max-w-[120px]" style={{ color: 'var(--color-ink)' }}>
                  {user?.email ? user.email.split('@')[0] : 'User'}
                </p>
                <p className="text-[11px] leading-tight truncate max-w-[120px]" style={{ color: 'var(--color-muted)' }}>
                  {user?.email || 'offline'}
                </p>
              </div>
              <div
                className="w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded-full shrink-0"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                }}
              >
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'IO'}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-muted)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF0EE';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-danger)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)';
              }}
              title="Log Out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Action Button (Mobile) */}
      <FloatingActionButton />
    </div>
  );
};
