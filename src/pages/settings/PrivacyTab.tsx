import React, { useState } from "react";
import apiClient from "../../lib/apiClient";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function PrivacyTab() {
  const { user, signOut } = useAuth();
  const [emailConfirm, setEmailConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleExportData = async () => {
    try {
      const response = await apiClient.post("/user/export", {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `careerforgeai_data_${user?.id}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      
      alert("Failed to export data.");
    }
  };

  const handleDelete = async () => {
    if (emailConfirm !== user?.email) return;
    setIsDeleting(true);
    try {
      await apiClient.delete("/user/account");
      signOut();
    } catch (err) {
      
      alert("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Privacy & Data</h2>
        <p className="text-sm text-slate-500">Manage your data, export your information, or delete your account.</p>
      </div>

      <div className="border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4 text-indigo-600" /> Export Account Data
          </h3>
          <p className="text-xs text-slate-500 mt-1">Download a copy of all your personal data, scans, and settings in JSON format.</p>
        </div>
        <button onClick={handleExportData} className="px-5 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition">
          Export My Data
        </button>
      </div>

      <div className="border border-red-200 bg-red-50/30 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-red-700 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h3>
          <p className="text-xs text-slate-600 mt-1">Permanently delete your account and all associated data. This action cannot be undone and will instantly cancel any active subscriptions.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-xl hover:bg-red-100 transition">
          Delete Account
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-6 shadow-xl border border-slate-200">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirm Deletion
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                You are about to permanently delete your account. This will instantly revoke access, cancel any active Stripe subscriptions, and irrevocably destroy your data.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Confirm Email</label>
                <input 
                   type="email" 
                   value={emailConfirm}
                  onChange={e => setEmailConfirm(e.target.value)}
                  placeholder={user?.email}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                 onClick={() => {
                  setShowModal(false);
                  setEmailConfirm("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button 
                 onClick={handleDelete}
                disabled={isDeleting || emailConfirm !== user?.email}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
