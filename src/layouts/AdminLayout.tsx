import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { 
  Users, LayoutDashboard, Menu, X, LogOut, ChevronRight, CreditCard, ToggleLeft, 
  Settings, Bot, Mail, BarChart3, ClipboardList, MessageSquare, Globe, Bell, Shield, ChevronLeft 
} from "lucide-react";

import NotificationBell from '../components/NotificationBell';

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { settings } = useSystemSettings();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Security Center", href: "/admin/security", icon: Shield },
    { name: "Plans", href: "/admin/plans", icon: CreditCard },
    { name: "Features", href: "/admin/features", icon: ToggleLeft },
    { name: "Landing CMS", href: "/admin/landing", icon: LayoutDashboard },
    { name: "SEO Management", href: "/admin/seo", icon: Globe },
    { name: "AI Config", href: "/admin/ai", icon: Bot },
    { name: "Emails", href: "/admin/emails", icon: Mail },
    { name: "FAQs", href: "/admin/faqs", icon: ClipboardList },
    { name: "Support Tickets", href: "/admin/contact", icon: MessageSquare },
    { name: "Settings & Limits", href: "/admin/settings/limits", icon: Settings },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
  ];

  const userFeatures = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Resume Scanner", href: "/analyze", icon: Shield },
    { name: "My Account", href: "/account", icon: Users },
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const currentPage = navigation.find(n => n.href === location.pathname)?.name || "Dashboard";

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const renderSidebarContent = (isCollapsed: boolean) => (
    <>
      <div className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 shrink-0 relative bg-linear-to-r from-slate-900 to-slate-900/95">
        {!isCollapsed && (
          <span className="text-lg sm:text-xl font-bold font-display tracking-tight text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-cyan-400 truncate pr-8">
            {settings.companyName || 'CareerForge AI'}
          </span>
        )}
        {isCollapsed && (
          <div className="w-9 h-9 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold mx-auto shadow-lg shadow-indigo-500/20">
            {(settings.companyName || 'C')[0]}
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/80">
        <div className="mb-6">
          {!isCollapsed && <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-2 mb-3">Admin Panel</p>}
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-indigo-300"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                >
                  <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "text-white" : "group-hover:scale-110 group-hover:text-indigo-400"}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 mb-4">
          {!isCollapsed && <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-2 mb-3">User Features</p>}
          <div className="space-y-1">
            {userFeatures.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-emerald-300"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                >
                  <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "text-white" : "group-hover:scale-110 group-hover:text-emerald-400"}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 shrink-0 bg-slate-900/50">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2 py-2'}`}>
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-inner">
            {user?.name?.[0] || "A"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button 
          onClick={handleSignOut}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`w-full mt-3 flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all duration-300 group ${isCollapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" />
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex h-screen overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-[#0B1120] text-white h-screen shrink-0 transition-all duration-300 relative z-40 border-r border-slate-800/60 ${isDesktopCollapsed ? 'w-[88px]' : 'w-[280px]'}`}
      >
        <button 
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className="absolute -right-3.5 top-8 bg-slate-800 border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 p-1.5 rounded-full z-50 transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 flex items-center justify-center"
        >
          {isDesktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        {renderSidebarContent(isDesktopCollapsed)}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0B1120] text-white h-screen flex flex-col md:hidden shadow-2xl border-r border-slate-800/60"
            >
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setIsMobileOpen(false)} className="p-2 text-rose-500 hover:text-rose-600 rounded-xl transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderSidebarContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 lg:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm shrink-0">
          <button 
            className="md:hidden text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-500 min-w-0">
            <span className="hidden sm:inline">Admin Panel</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:block text-slate-400" />
            <span className="text-slate-900 truncate bg-slate-100 px-2 py-1 rounded-md">{currentPage}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto bg-slate-50/50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
