import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import LayoutWrapper from "./layouts/LayoutWrapper";
import { Scan } from "./types";
import { useAuth } from "./contexts/AuthContext";
import { useSystemSettings } from "./contexts/SystemSettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import apiClient from "./lib/apiClient";

// Standard synchronous imports for instant page transitions
import LandingPage from "./pages/LandingPage";
import AnalyzerPage from "./pages/AnalyzerPage";
import Dashboard from "./pages/Dashboard";
import AIToolsPage from "./pages/AIToolsPage";
import PricingPage from "./pages/PricingPage";
import AccountPage from "./pages/AccountPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import LegalPage from "./pages/LegalPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PublicScanPage from "./pages/PublicScanPage";
import MaintenancePage from "./pages/MaintenancePage";
import NotificationsPage from "./pages/NotificationsPage";

import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminFeatures from "./pages/admin/AdminFeatures";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAI from "./pages/admin/AdminAI";
import AdminEmails from "./pages/admin/AdminEmails";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminFAQs from "./pages/admin/AdminFAQs";
import AdminContact from "./pages/admin/AdminContact";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminSEO from "./pages/admin/AdminSEO";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSecurity from "./pages/admin/AdminSecurity";

import SecuritySettings from "./pages/settings/SecuritySettings";

export default function App() {

  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authLoading, fetchUserRecord } = useAuth();
  const { settings, loading: settingsLoading } = useSystemSettings();

  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [appIsSyncing, setAppIsSyncing] = useState(false);

  // Load and refresh user session scan history from Express API
  const refreshUserData = async () => {
    if (!isAuthenticated) return;
    setAppIsSyncing(true);
    try {
      const scansRes = await apiClient.get("/scans");
      if (scansRes.status === 200) {
        const scansData = scansRes.data;
        const scansList = Array.isArray(scansData) ? scansData : (scansData.scans || []);
        setScans(scansList);
        if (scansList.length > 0) setActiveScan(scansList[0]);
        else setActiveScan(null);
      }
    } catch (err: any) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setAppIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [isAuthenticated]);

  const handleUserSessionSwap = () => {
    
  };

  const handleUpgradePlan = async (plan: string = "pro", billingPeriod: string = "monthly", couponCode?: string) => {
    if (!currentUser || !isAuthenticated) return;
    try {
      const response = await apiClient.post("/stripe/checkout", { plan, billingPeriod, couponCode });
      const data = response?.data;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      
      alert("Failed to initialize billing portal");
    }
  };

  const handleDowngradePlan = async () => {
    if (!currentUser || !isAuthenticated) return;
    try {
      const response = await apiClient.post("/stripe/customer-portal");
      const data = response?.data;
      if (data?.downgradedDirectly) {
        alert("Your plan has been downgraded to Free successfully.");
        await fetchUserRecord();
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      
      alert("Failed to initialize billing portal or downgrade plan.");
    }
  };

  const handleScanCompleted = async (newScan: Scan) => {
    setScans(prev => [newScan, ...prev]);
    setActiveScan(newScan);
    // Refresh user data to update scans_used_this_month
    await fetchUserRecord();
  };

  const handleNavigate = (path: string) => {
    if (path.startsWith("/")) {
        navigate(path);
    } else {
        // Fallback for previous raw ids passed
        if (path === "landing") navigate("/");
        else navigate("/" + path);
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-md bg-indigo-500/20 animate-pulse"></div>
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin relative z-10"></div>
        </div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse tracking-wide">Loading CareerForge AI...</p>
      </div>
    );
  }

  // Check Maintenance Mode (allow admins and login page)
  const isMaintenance = settings.maintenanceMode === true;
  const isAdmin = currentUser?.role === 'admin';
  const isLoginPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/admin');

  if (isMaintenance && !isAdmin && !isLoginPage) {
    return <MaintenancePage />;
  }

  return (
    <Routes>
      {/* Admin Routes - USING Layout wrapper and nested routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="features" element={<AdminFeatures />} />
        <Route path="ai" element={<AdminAI />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="settings/limits" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAudit />} />
        <Route path="faqs" element={<AdminFAQs />} />
        <Route path="contact" element={<AdminContact />} />
        <Route path="landing" element={<AdminLanding />} />
        <Route path="seo" element={<AdminSEO />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* All other routes - WITH Layout wrapper */}
      <Route path="/" element={
        <LayoutWrapper 
          currentUser={currentUser} 
          appIsSyncing={appIsSyncing}
        >
          <LandingPage onNavigate={handleNavigate} onUpgrade={handleUpgradePlan} userPlan={currentUser?.plan as any || "Free"} />
        </LayoutWrapper>
      } />
      
      <Route path="/analyze" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <AnalyzerPage onScanCompleted={handleScanCompleted} currentUser={currentUser as any} onUpgrade={handleUpgradePlan} onNavigate={handleNavigate} />
        </LayoutWrapper>
      } />
      
      <Route path="/scan/:id" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <PublicScanPage />
        </LayoutWrapper>
      } />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ProtectedRoute><Dashboard currentUser={currentUser as any} onNavigate={handleNavigate} onSelectScan={setActiveScan} scans={scans} /></ProtectedRoute>
        </LayoutWrapper>
      } />
      
      <Route path="/tools" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ProtectedRoute><AIToolsPage currentUser={currentUser as any} activeScan={activeScan} onUpgrade={handleUpgradePlan} /></ProtectedRoute>
        </LayoutWrapper>
      } />
      
      <Route path="/account" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ProtectedRoute><AccountPage /></ProtectedRoute>
        </LayoutWrapper>
      } />
      
      <Route path="/notifications" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ProtectedRoute><NotificationsPage /></ProtectedRoute>
        </LayoutWrapper>
      } />
      
      <Route path="/settings/security" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ProtectedRoute><SecuritySettings /></ProtectedRoute>
        </LayoutWrapper>
      } />
      
      <Route path="/pricing" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <PricingPage currentUser={currentUser as any} onUpgrade={handleUpgradePlan} onDowngrade={handleDowngradePlan} />
        </LayoutWrapper>
      } />

      {/* Auth pages */}
      <Route path="/oauth-callback" element={<Navigate to="/dashboard" replace />} />
      
      <Route path="/login" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <LoginPage />
        </LayoutWrapper>
      } />
      
      <Route path="/signup" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <SignupPage />
        </LayoutWrapper>
      } />
      
      <Route path="/verify-email" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <VerifyEmailPage />
        </LayoutWrapper>
      } />
      
      <Route path="/forgot-password" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ForgotPasswordPage />
        </LayoutWrapper>
      } />
      
      <Route path="/reset-password" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ResetPasswordPage />
        </LayoutWrapper>
      } />

      {/* Footer pages */}
      <Route path="/about" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <AboutPage />
        </LayoutWrapper>
      } />
      
      <Route path="/contact" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <ContactPage />
        </LayoutWrapper>
      } />
      
      <Route path="/faq" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <FaqPage />
        </LayoutWrapper>
      } />
      
      <Route path="/help" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <HelpCenterPage />
        </LayoutWrapper>
      } />
      
      <Route path="/legal" element={
        <LayoutWrapper currentUser={currentUser} appIsSyncing={appIsSyncing}>
          <LegalPage />
        </LayoutWrapper>
      } />
    </Routes>
  );
}
