import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Moon,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SidebarNav } from './SidebarNav';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex min-h-screen bg-bg-base text-gray-100 font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* ── Left Sidebar (Desktop) ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[260px] glass border-r border-white/5 h-screen sticky top-0 z-30 shrink-0">
        <SidebarNav />
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────────────────────────────── */}
      <div className={`fixed inset-0 z-50 flex md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Mobile drawer container */}
        <aside className={`relative flex flex-col w-[260px] bg-bg-base border-r border-white/10 h-full p-4 z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarNav 
            isMobile 
            onCloseMobileMenu={() => setIsMobileMenuOpen(false)} 
          />
        </aside>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        
        {/* Main Navbar Header */}
        <header className="glass border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </button>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center w-full max-w-[380px] relative">
            <Search size={16} className="absolute left-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions, emails, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all duration-200"
            />
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-4">
            
            {/* Dark Mode toggle visual */}
            <button 
              className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle dark mode"
            >
              <Moon size={18} />
            </button>

            {/* Notification Bell */}
            <button 
              className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            </button>

            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

            {/* User Profile Info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-200 truncate max-w-[120px]">
                  {user?.email ? user.email.split('@')[0] : 'User'}
                </p>
                <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                  {user?.email || 'offline'}
                </p>
              </div>
              <button 
                onClick={logout}
                title="Log Out"
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/10 transition-all active:scale-95"
              >
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'OS'}
              </button>
            </div>

          </div>

        </header>

        {/* Dashboard Content Portal */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

      </div>

    </div>
  );
};
