import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Inbox, 
  CheckSquare, 
  Zap, 
  Settings, 
  Sparkles, 
  Activity,
  Plus,
  X
} from 'lucide-react';
import { useCompose } from '../context/ComposeContext';

export interface SidebarNavProps {
  onCloseMobileMenu?: () => void;
  isMobile?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ 
  onCloseMobileMenu, 
  isMobile = false 
}) => {
  const location = useLocation();
  const { openCompose } = useCompose();

  const navigationItems = [
    { path: '/dashboard', label: 'Inbox', icon: <Inbox size={18} />, count: 14 },
    { path: '/dashboard/tasks', label: 'Dashboard Tasks', icon: <CheckSquare size={18} />, count: 5 },
    { path: '/dashboard/rules', label: 'Routing Rules', icon: <Zap size={18} /> },
    { path: '/dashboard/settings', label: 'Preferences', icon: <Settings size={18} /> },
  ];

  // Helper to determine if the navigation item path is currently active
  const isItemActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <div className="flex flex-col h-full flex-1">
      {/* ── Brand Logo Header ─────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between ${isMobile ? 'pb-6 border-b border-white/5 mb-4' : 'px-6 py-6 border-b border-white/5'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 glow-accent shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent leading-none">
              InboxOS
            </h1>
            <span className="text-[10px] text-indigo-400/80 font-semibold tracking-wider uppercase block mt-1">
              Decision Layer
            </span>
          </div>
        </div>
        
        {isMobile && onCloseMobileMenu && (
          <button 
            onClick={onCloseMobileMenu}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Compose Action Button ──────────────────────────────────────────────── */}
      <div className={`${isMobile ? 'py-2 mb-4' : 'px-4 py-4'}`}>
        <button 
          onClick={() => {
            openCompose();
            handleLinkClick();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-200 glow-accent-hover active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Compose Action</span>
        </button>
      </div>

      {/* ── Navigation Links ─────────────────────────────────────────────────── */}
      <nav className={`flex-1 space-y-1.5 overflow-y-auto text-left ${isMobile ? '' : 'px-3'}`}>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-4 mb-2">
          Workspace
        </div>
        {navigationItems.map((item) => {
          const active = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border-l-4 ${
                active 
                  ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border-accent shadow-[0_4px_12px_rgba(99,102,241,0.15)] font-semibold' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`${active ? 'text-accent' : 'text-gray-400'}`}>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  active 
                    ? 'bg-accent text-white' 
                    : 'bg-white/10 text-gray-300'
                }`}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── System Status Card ────────────────────────────────────────────────── */}
      <div className={`border-t border-white/5 ${isMobile ? 'pt-4 mt-4' : 'p-4'}`}>
        <div className="glass-panel rounded-xl p-3 border border-white/5 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-gray-300">AI Agent Active</span>
            </div>
            <Activity size={12} className="text-indigo-400" />
          </div>
          
          <p className="text-[10px] text-gray-400 leading-normal mb-2">
            Analyzing incoming streams automatically. Gmail linked.
          </p>
          
          <div className="flex items-center justify-between text-[9px] text-gray-500 border-t border-white/5 pt-2">
            <span>Provider: OpenAI</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
