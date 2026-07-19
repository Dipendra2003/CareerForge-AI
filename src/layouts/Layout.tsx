import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, RefreshCw, Layers,
  Menu, X, LayoutDashboard, LogOut, ChevronLeft, ChevronRight, History, Shield,
  User as UserIcon, MessageSquareHeart
} from "lucide-react";
import { User } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

import Footer from "../components/Footer";
import AnnouncementBanner from "../components/AnnouncementBanner";
import NotificationBell from "../components/NotificationBell";
import TestimonialModal from "../components/TestimonialModal";

export default function Layout({ 
  children, 
  currentUser, 
  appIsSyncing
}: { 
  children: React.ReactNode, 
  currentUser: User | null, 
  appIsSyncing: boolean
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAuthenticated, signOut } = useAuth();
  const { settings } = useSystemSettings();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1).toLowerCase() : currentPath.toLowerCase();

  const authSidebarLinks = [
    { id: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "/analyze", label: "Resume Scanner", icon: History },
    { id: "/tools", label: "AI Tools", icon: Sparkles },
    { id: "/account", label: "Account", icon: UserIcon },
  ];

  if (currentUser?.role === "admin") {
    authSidebarLinks.push({ id: "/admin/dashboard", label: "Admin Panel", icon: Shield });
  }

  const publicNavLinks = [
    { id: "/", label: "Overview", icon: Layers },
    { id: "/analyze", label: "Resume Scanner", icon: History },
    { id: "/pricing", label: "Pricing", icon: Sparkles },
    { id: "/about", label: "About", icon: UserIcon },
  ];

  // Which links to show based on auth state
  const currentNavLinks = isAuthenticated ? authSidebarLinks : publicNavLinks;

  const renderTopNavbar = () => (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-border px-4 sm:px-6 h-[60px] shrink-0 flex items-center w-full">
      <div className="w-full max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={`${settings.companyName || 'CareerForge AI'} Logo`} className="h-6 object-contain" />
            ) : (
              <Layers className="w-6 h-6 text-primary shrink-0" />
            )}
            <span className="font-black text-slate-900 tracking-tight text-xl leading-none font-display hidden sm:block">{settings.companyName || 'CareerForge AI'}</span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-6 ml-6">
            {currentNavLinks.map(link => {
              const Icon = link.icon;
              let isActive = currentPath === link.id || (link.id !== "/" && currentPath.startsWith(link.id.split('?')[0]));
              if (link.id.includes('?tab=history')) {
                 isActive = location.search.includes('tab=history');
              } else if (currentPath === '/dashboard' && location.search.includes('tab=history')) {
                 isActive = false;
              }
              
              return (
                <Link 
                  key={link.id} 
                  to={link.id} 
                  className={`text-sm font-semibold transition flex items-center gap-1.5 ${isActive ? "text-primary" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.label}
                  {link.id === "/tools" && (!currentUser?.plan || currentUser.plan.toLowerCase() === "free") && (
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping shrink-0 ml-1" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {appIsSyncing && <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0 mr-2" />}
          
          {isAuthenticated ? (
            <>
              {/* Responsive Role/Plan Badge */}
              <div className="hidden sm:flex items-center gap-2">
                {currentUser?.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                    currentUser?.plan?.toLowerCase() === 'pro' 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {currentUser?.plan ? currentUser.plan.toUpperCase() : 'FREE'}
                  </span>
                )}
              </div>

              {currentUser?.role === 'admin' && (
                <Link 
                  to="/admin/dashboard" 
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Panel
                </Link>
              )}

              <button 
                onClick={() => setIsFeedbackModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-100 transition-all shadow-sm"
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                Feedback
              </button>

              <NotificationBell />

              <button onClick={handleSignOut} className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition whitespace-nowrap hidden lg:block">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hidden lg:block">Log In</Link>
              <Link to="/signup" className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition whitespace-nowrap hidden lg:block">Sign Up</Link>
            </>
          )}

          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );

  const renderMobileDrawer = () => (
    <AnimatePresence>
      {isMobileOpen && (
        <>
          <motion.div key="sidebar-logo-div" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <motion.aside 
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-[280px] bg-white border-r border-border z-50 flex flex-col lg:hidden shadow-2xl"
          >
            <div className="p-5 border-b border-border flex items-center justify-between h-[60px]">
              <Link to="/" className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMobileOpen(false)}>
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={`${settings.companyName || 'CareerForge AI'} Logo`} className="h-8 object-contain shrink-0" />
                ) : (
                  <div className="p-1.5 bg-primary rounded-lg text-white shrink-0">
                    <Layers className="w-5 h-5 shrink-0" />
                  </div>
                )}
                <div>
                  <span className="font-black text-slate-900 tracking-tight text-lg leading-tight block font-display">{settings.companyName || 'CareerForge AI'}</span>
                </div>
              </Link>
              <button onClick={() => setIsMobileOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
              {currentNavLinks.map(link => {
                const Icon = link.icon;
                let isActive = currentPath === link.id || (link.id !== "/" && currentPath.startsWith(link.id.split('?')[0]));
                if (link.id.includes('?tab=history')) {
                   isActive = location.search.includes('tab=history');
                } else if (currentPath === '/dashboard' && location.search.includes('tab=history')) {
                   isActive = false;
                }
                
                return (
                  <Link
                    key={link.id}
                    to={link.id}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition text-sm font-semibold ${isActive ? "bg-indigo-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    {Icon && <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-primary" : "text-slate-400"}`} />}
                    {link.label}
                  </Link>
                )
              })}

              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
                {isAuthenticated ? (
                  <>
                    <button 
                      onClick={() => { setIsFeedbackModalOpen(true); setIsMobileOpen(false); }} 
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition text-sm font-semibold text-amber-600 hover:bg-amber-50"
                    >
                      <MessageSquareHeart className="w-[18px] h-[18px] shrink-0" />
                      Feedback
                    </button>
                    <button onClick={() => { handleSignOut(); setIsMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition text-sm font-semibold text-red-600 hover:bg-red-50">
                      <LogOut className="w-[18px] h-[18px] shrink-0" />
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 rounded-xl cursor-pointer transition text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">Log In</Link>
                    <Link to="/signup" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 rounded-xl bg-slate-900 text-white transition text-sm font-semibold text-center mt-2 hover:bg-slate-800">Sign Up</Link>
                  </>
                )}
              </div>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-page font-sans antialiased text-slate-800 flex flex-col overflow-hidden">
      <AnnouncementBanner />
      {renderTopNavbar()}
      {renderMobileDrawer()}
      <div className="flex-1 overflow-y-auto w-full relative flex flex-col">
        <main className="w-full flex flex-col overflow-x-hidden flex-1 shrink-0">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </main>
        {!["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"].includes(normalizedPath) && (
          <Footer />
        )}
      </div>

      <TestimonialModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
      />
    </div>
  );
}
