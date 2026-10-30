import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Package,
  LineChart,
  ShoppingCart,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  PlusCircle,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { NetworkBanner } from '../components/ui/NetworkBanner';
import { SessionExpiredModal } from '../components/ui/SessionExpiredModal';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Invoices',     href: '/purchases',      icon: Receipt },
  { label: 'New Invoice',  href: '/purchases/import', icon: PlusCircle },
  { label: 'Suppliers',   href: '/suppliers',       icon: Building2 },
  { label: 'Products',    href: '/products',        icon: Package },
  { label: 'Analytics',   href: '/analytics',       icon: LineChart },
  { label: 'Order Planner', href: '/order-planner', icon: ShoppingCart },
  { label: 'Audit Logs',  href: '/audit-log',       icon: ClipboardList },
  { label: 'Settings',    href: '/settings',        icon: Settings },
];

function useActiveNav(href: string): boolean {
  const location = useLocation();
  if (href === '/dashboard') return location.pathname === '/dashboard';
  if (href === '/purchases') {
    return (
      location.pathname === '/purchases' ||
      (/^\/purchases\/(?!import).+/.test(location.pathname))
    );
  }
  if (href === '/purchases/import') return location.pathname.startsWith('/purchases/import');
  return (
    location.pathname === href ||
    location.pathname.startsWith(`${href}/`)
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  onClick?: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ item, onClick }) => {
  const isActive = useActiveNav(item.href);
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
        isActive
          ? 'bg-brand-50 text-brand-700 border-l-2 border-brand-600 rounded-l-none pl-[10px]'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon
        className={[
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600',
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
};

export const AppLayout: React.FC = () => {
  const { profile, signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Session expiry detection
  useEffect(() => {
    const isDemo = localStorage.getItem('demo_auth_logged_in') === 'true';
    setSessionExpired(!user && !isDemo);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = (profile?.full_name || profile?.email || 'A')
    .charAt(0)
    .toUpperCase();

  const Sidebar = (
    <aside className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center shrink-0" aria-hidden="true">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-none">Audit & Planner</p>
          <p className="text-xs text-slate-400 mt-0.5">Purchase Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100 pb-safe">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-slate-50 border border-slate-200">
          <div
            className="w-7 h-7 rounded-md bg-brand-700 text-white flex items-center justify-center text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-900 truncate">
              {profile?.full_name || 'Administrator'}
            </p>
            <p className="text-xs text-slate-500 truncate font-mono">
              {profile?.email || 'admin@audit.local'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <NetworkBanner />
      <SessionExpiredModal
        isOpen={sessionExpired}
        onSuccess={() => setSessionExpired(false)}
        onClose={() => setSessionExpired(false)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <div className="no-print hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:z-30 border-r border-slate-200 bg-white">
          {Sidebar}
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="no-print lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Sidebar drawer */}
        <div
          className={[
            'no-print lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200',
            'transition-transform duration-250 ease-out',
            mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
          ].join(' ')}
          aria-hidden={!mobileOpen}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-full">{Sidebar}</div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 lg:ml-60 min-w-0">
          {/* Mobile top bar */}
          <header className="no-print lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center gap-3 px-4 h-14 pt-safe">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
              className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-brand-700 flex items-center justify-center shrink-0" aria-hidden="true">
                <BookOpen className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">Audit & Planner</span>
            </div>
          </header>

          {/* Page content */}
          <main
            id="main-content"
            className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-safe"
          >
            <ErrorBoundary fallbackTitle="This page encountered an error">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};
