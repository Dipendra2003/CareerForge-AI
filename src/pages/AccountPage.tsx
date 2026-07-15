import React, { useState, useEffect } from "react";
import { User, ShieldCheck, CreditCard, Bell, Key, LogOut, Settings, CreditCardIcon, FileText, Smartphone, Download, UserCircle, Globe, Link2, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

// Components for tabs
import ProfileTab from "./settings/ProfileTab";
import SecurityTab from "./settings/SecurityTab";
import BillingTab from "./settings/BillingTab";
import NotificationsTab from "./settings/NotificationsTab";
import ConnectedAccountsTab from "./settings/ConnectedAccountsTab";
import PrivacyTab from "./settings/PrivacyTab";

const AccountPage: React.FC = () => {
  const { user, signOut, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: <UserCircle className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "connected", label: "Connected Accounts", icon: <Link2 className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy & Data", icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (!user) return null;

  return (
    <div className="w-full max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar / Top Nav Wrapper */}
        <div className="w-full lg:w-64 shrink-0">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-4 mb-4 lg:block hidden">Account Settings</h2>
          
          {/* Mobile & Tablet horizontal scrollable navigation */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-4 mb-2 px-1 scrollbar-none snap-x whitespace-nowrap">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-center ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-center bg-red-50 border border-red-100 text-red-600 hover:bg-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Desktop vertical sidebar navigation */}
          <div className="hidden lg:block space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-slate-100">
               <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8 min-h-[500px]">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "connected" && <ConnectedAccountsTab />}
          {activeTab === "privacy" && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
