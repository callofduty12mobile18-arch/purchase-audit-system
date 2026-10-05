import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Package,
  TrendingUp,
  LineChart,
  ShoppingCart,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  PlusCircle,
  Bell,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const AppLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/purchases', icon: Receipt },
    { name: 'New Invoice', href: '/purchases/import', icon: PlusCircle, highlight: true },
    { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Price History', href: '/price-history', icon: TrendingUp },
    { name: 'Analytics', href: '/analytics', icon: LineChart },
    { name: 'Order Planner', href: '/order-planner', icon: ShoppingCart },
    { name: 'Audit Logs', href: '/audit-log', icon: ClipboardList },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isNavActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/purchases') {
      return location.pathname === '/purchases' || /^\/purchases\/(?!import).+/.test(location.pathname);
    }
    if (href === '/purchases/import') return location.pathname.startsWith('/purchases/import');
    if (href === '/suppliers') return location.pathname.startsWith('/suppliers');
    if (href === '/products') return location.pathname.startsWith('/products');
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F5F7FF] text-[#1F1F2C] flex flex-col md:flex-row font-sans selection:bg-[#4B49AC] selection:text-white">
      {/* Mobile Top Navigation */}
      <header className="no-print md:hidden flex items-center justify-between gap-2 px-4 py-3 bg-white/95 backdrop-blur-xl border-b border-[#ECEEF5] sticky top-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#4B49AC] text-white shadow-md shadow-[#4B49AC]/25 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#1F1F2C] tracking-tight leading-none truncate">AUDIT & PLANNER</h1>
            <span className="text-[10px] text-[#7DA0FA] font-bold uppercase tracking-wider">Enterprise v1.0</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm"
            onClick={() => navigate('/purchases/import')}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            + Bill
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="tap-target p-2 rounded-xl text-[#6C7383] hover:text-[#4B49AC] hover:bg-[#F5F7FF] border border-[#ECEEF5] transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="no-print md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop & Mobile Slideover Sidebar */}
      <aside
        className={`no-print fixed md:static inset-y-0 left-0 z-50 w-68 bg-white border-r border-[#ECEEF5] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xl md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-5.5 border-b border-[#ECEEF5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4B49AC] text-white shadow-md shadow-[#4B49AC]/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1F1F2C] tracking-tight leading-snug">Audit & Planner</h1>
              <p className="text-[11px] text-[#7DA0FA] font-semibold">Invoice Intelligence</p>
            </div>
          </div>
        </div>

        <div className="md:hidden px-5 py-4 border-b border-[#ECEEF5] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C7383]">Navigation Menu</span>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-[#8F93A0] hover:text-[#1F1F2C] hover:bg-[#F5F7FF]" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 border-b border-[#ECEEF5] space-y-3">
          <Button
            variant="primary"
            className="w-full justify-center py-2.5 text-sm font-semibold rounded-xl shadow-md shadow-[#4B49AC]/25 hover:shadow-lg hover:shadow-[#4B49AC]/35"
            onClick={() => {
              navigate('/purchases/import');
              setMobileMenuOpen(false);
            }}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            New Purchase Invoice
          </Button>

          <form onSubmit={handleSearchSubmit} className="md:hidden relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F93A0]" />
            <input
              type="search"
              placeholder="Quick search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-[#1F1F2C] text-xs placeholder-[#8F93A0] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
            />
          </form>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          {navigation.map((item) => {
            const isActive = isNavActive(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 min-h-[42px] ${
                  isActive
                    ? 'bg-[#4B49AC] text-white font-semibold shadow-md shadow-[#4B49AC]/25'
                    : 'text-[#6C7383] hover:text-[#4B49AC] hover:bg-[#F5F7FF]'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#8F93A0] group-hover:text-[#4B49AC]'}`} />
                <span className="flex-1 truncate">{item.name}</span>
                {item.highlight && (
                  <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#7DA0FA] animate-pulse'}`} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-3.5 border-t border-[#ECEEF5] bg-[#F8F9FE] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="p-2 rounded-xl bg-white border border-[#ECEEF5] flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#4B49AC] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {profile?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1F1F2C] truncate">{profile?.full_name || 'Auditor User'}</p>
                <p className="text-[10px] text-[#6C7383] font-mono truncate">{profile?.email || 'admin@audit.local'}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-2 rounded-lg text-[#8F93A0] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Desktop Top Header */}
        <header className="no-print hidden md:flex items-center justify-between px-8 py-3.5 bg-white/90 backdrop-blur-xl border-b border-[#ECEEF5] sticky top-0 z-30 shadow-xs">
          <div className="relative w-96 max-w-full">
            <form onSubmit={handleSearchSubmit}>
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F93A0]" />
              <input
                type="text"
                placeholder="Search supplier, invoice #, product nickname, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs text-[#1F1F2C] placeholder-[#8F93A0] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#8F93A0] border border-[#ECEEF5] bg-white pointer-events-none">
                ↵
              </span>
            </form>
          </div>

          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-3.5 py-1.5 text-xs"
              onClick={() => navigate('/purchases/import')}
              icon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              New Invoice
            </Button>
            <div className="h-4 w-px bg-[#ECEEF5]" />
            <div className="w-8 h-8 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] flex items-center justify-center text-[#6C7383] hover:text-[#4B49AC] cursor-pointer transition-colors">
              <Bell className="w-4 h-4" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-[#F5F7FF] pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
