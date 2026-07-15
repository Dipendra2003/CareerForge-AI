import React, { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Shield, Key, Smartphone, Globe, Power } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

export default function SecurityTab() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await apiClient.get("/user/security/dashboard");
      setData(response.data);
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggle2FA = async (enable: boolean) => {
    try {
      if (enable) {
        const response = await apiClient.post("/user/security/2fa/enable", {});
        setTwoFaSecret(response.data.secret);
        setBackupCodes(response.data.backupCodes);
        fetchData();
        toast.info("Two-factor authentication setup generated. Please scan the QR code to proceed.", "2FA Setup");
      } else {
        if (!confirm('Are you sure you want to disable 2FA?')) return;
        await apiClient.post("/user/security/2fa/disable", {});
        setTwoFaSecret(null);
        setBackupCodes([]);
        fetchData();
        toast.success("Two-factor authentication disabled successfully.", "Security Updated");
      }
    } catch (e) {
      toast.error("Failed to update 2FA settings. Please try again.", "Security Error");
    }
  };

  const regenerateCodes = async () => {
    if (!confirm('Regenerate backup codes? Old codes will become invalid.')) return;
    try {
      const response = await apiClient.post("/user/security/backup-codes/regenerate", {});
      setBackupCodes(response.data.backupCodes);
      toast.success("Backup codes regenerated successfully. Please save them.", "Codes Updated");
    } catch (e) {
      toast.error("Failed to regenerate backup codes.", "Security Error");
    }
  };

  const revokeSession = async (id: string) => {
    if (!confirm('Log out of this session?')) return;
    try {
      await apiClient.post(`/user/security/sessions/${id}/revoke`, {});
      fetchData();
      toast.success("Active session terminated successfully.", "Session Revoked");
    } catch(e) {
      toast.error("Failed to revoke active session.", "Security Error");
    }
  };

  if (loading || !data) return <div className="p-4">Loading security settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security Center</h2>
        <p className="text-sm text-slate-500">Manage your account security, passwords, and active sessions.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${data.securitySettings?.twoFactorEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
            <p className="text-xs text-slate-500">{data.securitySettings?.twoFactorEnabled ? 'Enabled and securing your account.' : 'Not enabled. We highly recommend enabling 2FA.'}</p>
          </div>
        </div>

        {data.securitySettings?.twoFactorEnabled ? (
          <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
            <button onClick={() => regenerateCodes()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">Regenerate Codes</button>
            <button onClick={() => toggle2FA(false)} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition">Disable 2FA</button>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100">
            <button onClick={() => toggle2FA(true)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm">Enable 2FA</button>
          </div>
        )}

        {twoFaSecret && (
          <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm font-bold text-slate-900 mb-3">Scan this QR Code with your Authenticator App</p>
            <div className="bg-white p-3 inline-block rounded-xl border border-slate-200 shadow-sm">
              <QRCodeSVG value={`otpauth://totp/CareerForge AI?secret=${twoFaSecret}`} size={160} />
            </div>
            <p className="text-xs text-slate-500 mt-3 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block">{twoFaSecret}</p>
          </div>
        )}
        
        {backupCodes.length > 0 && (
          <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-sm font-bold text-amber-900 mb-3">Save these backup codes in a secure location.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs text-amber-800">
              {backupCodes.map((c, i) => <span key={i} className="bg-white/50 px-2 py-1 rounded border border-amber-200/50">{c}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-900">Active Sessions</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {data.activeSessions?.map((sess: any) => (
            <div key={sess.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <p className="text-sm font-bold text-slate-900">{sess.os || 'Unknown OS'} &middot; {sess.browser || 'Unknown Browser'}</p>
                <p className="text-xs text-slate-500 mt-1">{sess.ip} &middot; Last active: {new Date(sess.lastActivity).toLocaleString()}</p>
              </div>
              <button onClick={() => revokeSession(sess.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Log out session">
                <Power className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!data.activeSessions || data.activeSessions.length === 0) && (
             <div className="p-5 text-center text-sm text-slate-500">No active sessions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
