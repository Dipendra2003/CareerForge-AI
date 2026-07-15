import { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, Globe, Activity, Lock, Trash2, Power } from 'lucide-react';
import SEOMeta from '../../components/SEOMeta';
import apiClient from '../../lib/apiClient';
import { QRCodeSVG } from 'qrcode.react';

export default function SecuritySettings() {
  const [data, setData] = useState<any>(null);
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/user/security/dashboard');
      setData(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggle2FA = async (enable: boolean) => {
    try {
      if (enable) {
        const res = await apiClient.post('/user/security/2fa/enable');
        setTwoFaSecret(res.data.secret);
        setBackupCodes(res.data.backupCodes);
      } else {
        if (!confirm('Disable 2FA? This will make your account less secure.')) return;
        await apiClient.post('/user/security/2fa/disable');
        setTwoFaSecret(null);
        setBackupCodes([]);
      }
      fetchData();
    } catch(e) {}
  };

  const regenerateCodes = async () => {
    if (!confirm('Regenerate backup codes? Old ones will be invalidated.')) return;
    try {
      const res = await apiClient.post('/user/security/backup-codes/regenerate');
      setBackupCodes(res.data.backupCodes);
    } catch(e) {}
  };

  const revokeSession = async (id: string) => {
    if (!confirm('Log out of this session?')) return;
    try {
      await apiClient.post(`/user/security/sessions/${id}/revoke`);
      fetchData();
    } catch(e) {}
  };

  const revokeAllSessions = async () => {
    if (!confirm('Log out of all other sessions?')) return;
    try {
      await apiClient.post(`/user/security/sessions/revoke-all?exceptCurrent=true`);
      fetchData();
    } catch(e) {}
  };

  const updateSettings = async (updates: any) => {
    try {
      const newSettings = { ...data.securitySettings, ...updates };
      await apiClient.put(`/user/security/settings`, newSettings);
      setData({ ...data, securitySettings: newSettings });
    } catch(e) {}
  };

  if (!data) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-4xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-8">
      <SEOMeta pageKey="security" defaultTitle="Security Settings" />
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security Center</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account security and active sessions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2FA Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.securitySettings?.twoFactorEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Two-Factor Authentication (2FA)</h2>
              <p className="text-xs text-slate-500">{data.securitySettings?.twoFactorEnabled ? 'Enabled and securing your account.' : 'Not enabled. We highly recommend enabling 2FA.'}</p>
            </div>
          </div>
          
          {data.securitySettings?.twoFactorEnabled ? (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
               <button onClick={() => regenerateCodes()} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Regenerate Codes</button>
               <button onClick={() => toggle2FA(false)} className="text-sm font-medium text-red-600 hover:text-red-800">Disable 2FA</button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100">
               <button onClick={() => toggle2FA(true)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-medium transition">Enable 2FA</button>
            </div>
          )}

          {twoFaSecret && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-900 mb-2">Scan this QR Code with your Authenticator App</p>
              <div className="bg-white p-2 inline-block rounded border border-slate-200">
                <QRCodeSVG value={`otpauth://totp/CareerForge AI?secret=${twoFaSecret}`} size={128} />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-mono break-all">{twoFaSecret}</p>
            </div>
          )}
          
          {backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 mb-2">Save these backup codes. You will not see them again.</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-amber-800">
                {backupCodes.map((c, i) => <span key={i}>{c}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Security Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
           <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Security Alerts</h2>
              <p className="text-xs text-slate-500">Get notified of suspicious activity.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 space-y-3">
             <label className="flex items-center justify-between cursor-pointer">
               <span className="text-sm text-slate-700">New Login Emails</span>
               <input type="checkbox" checked={data.securitySettings?.loginEmailAlerts} onChange={(e) => updateSettings({ loginEmailAlerts: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
             </label>
             <label className="flex items-center justify-between cursor-pointer">
               <span className="text-sm text-slate-700">New Device Alerts</span>
               <input type="checkbox" checked={data.securitySettings?.newDeviceAlerts} onChange={(e) => updateSettings({ newDeviceAlerts: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
             </label>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Active Sessions</h2>
          </div>
          <button onClick={revokeAllSessions} className="text-sm font-medium text-red-600 hover:text-red-800">Logout All Other Devices</button>
        </div>
        <div className="divide-y divide-slate-100">
          {data.activeSessions.map((sess: any) => (
            <div key={sess.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{sess.os} &middot; {sess.browser}</p>
                <p className="text-xs text-slate-500">{sess.ip} &middot; Last active: {new Date(sess.lastActivity).toLocaleString()}</p>
              </div>
              <button onClick={() => revokeSession(sess.id)} className="text-slate-400 hover:text-red-600 transition" title="Log out session">
                <Power className="w-4 h-4" />
              </button>
            </div>
          ))}
          {data.activeSessions.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No active sessions found.</div>}
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
           <h2 className="font-semibold text-slate-900">Recent Login History</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="p-4 font-medium">Date & Time</th>
              <th className="p-4 font-medium">Device & Location</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.loginHistory.map((log: any) => (
              <tr key={log.id}>
                <td className="p-4 text-slate-600">{new Date(log.loginTime).toLocaleString()}</td>
                <td className="p-4 text-slate-600">{log.browser} on {log.os} ({log.ip})</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {log.success ? 'Success' : log.failureReason || 'Failed'}
                  </span>
                </td>
              </tr>
            ))}
            {data.loginHistory.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-slate-500">No login history available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
