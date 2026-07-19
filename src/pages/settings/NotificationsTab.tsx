import React, { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Bell, Mail, Smartphone, ShieldCheck, Zap } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

export default function NotificationsTab() {
  const toast = useToast();
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    inAppEnabled: true,
    marketingEnabled: true,
    billingEnabled: true,
    securityEnabled: true,
    aiEnabled: true,
    systemEnabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const { data } = await apiClient.get("/user/notifications/preferences");
      if (data) setPreferences(data);
    } catch (err) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string) => {
    const newPrefs = { ...preferences, [key]: !(preferences as any)[key] };
    setPreferences(newPrefs);
    try {
      await apiClient.put("/user/notifications/preferences", newPrefs);
      toast.success("Notification preferences updated successfully!", "Preferences Saved");
    } catch (err) {
      
      // Revert on failure
      setPreferences(preferences);
      toast.error("Failed to save notification preferences.", "Preferences Error");
    }
  };

  if (loading) return <div className="p-4">Loading preferences...</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Notification Preferences</h2>
        <p className="text-sm text-slate-500">Choose how and when we communicate with you.</p>
      </div>

      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Global Settings</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800 text-sm">Email Notifications</p>
                <p className="text-xs text-slate-500">Receive alerts and updates directly to your inbox.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={preferences.emailEnabled} onChange={() => handleToggle('emailEnabled')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800 text-sm">In-App Notifications</p>
                <p className="text-xs text-slate-500">Show alerts within the dashboard while using the app.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={preferences.inAppEnabled} onChange={() => handleToggle('inAppEnabled')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Notification Categories</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 text-sm">Billing & Subscriptions</p>
                <p className="text-xs text-slate-500">Invoices, renewals, and payment issues.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={preferences.billingEnabled} onChange={() => handleToggle('billingEnabled')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 text-sm flex items-center gap-1">Security Alerts <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /></p>
                <p className="text-xs text-slate-500">New logins, password changes, and account safety.</p>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input type="checkbox" className="sr-only peer" checked disabled />
                <div className="w-11 h-6 bg-indigo-600 opacity-60 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[22px] after:bg-white after:border after:rounded-full after:h-5 after:w-5"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 text-sm flex items-center gap-1">AI Insights <Zap className="w-3.5 h-3.5 text-amber-500" /></p>
                <p className="text-xs text-slate-500">Alerts when long-running AI scans or generated content completes.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={preferences.aiEnabled} onChange={() => handleToggle('aiEnabled')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 text-sm">Marketing & Promotions</p>
                <p className="text-xs text-slate-500">Special offers, new features, and newsletters.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={preferences.marketingEnabled} onChange={() => handleToggle('marketingEnabled')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
