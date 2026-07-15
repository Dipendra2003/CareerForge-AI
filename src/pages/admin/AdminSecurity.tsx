import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Users, Key, Settings, Lock, Activity, Globe } from 'lucide-react';
import SEOMeta from '../../components/SEOMeta';
import apiClient from '../../lib/apiClient';

export default function AdminSecurity() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [logins, setLogins] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await apiClient.get('/admin/security/dashboard');
        setStats(res.data);
      } else if (activeTab === 'logins') {
        const res = await apiClient.get('/admin/security/logins');
        setLogins(res.data);
      } else if (activeTab === 'sessions') {
        const res = await apiClient.get('/admin/security/sessions');
        setSessions(res.data);
      } else if (activeTab === 'alerts') {
        const res = await apiClient.get('/admin/security/alerts');
        setAlerts(res.data);
      } else if (activeTab === 'blocked-ips') {
        const res = await apiClient.get('/admin/security/blocked-ips');
        setBlockedIps(res.data);
      } else if (activeTab === 'failed-logins') {
        const res = await apiClient.get('/admin/security/failed-logins');
        setFailedLogins(res.data);
      } else if (activeTab === 'policy') {
        const res = await apiClient.get('/admin/security/password-policy');
        setPolicy(res.data);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const revokeSession = async (id: string) => {
    if (!confirm('Revoke this session?')) return;
    try {
      await apiClient.post(`/admin/security/sessions/${id}/revoke`);
      fetchData();
    } catch(e) {}
  };

  const unblockIp = async (id: string) => {
    if (!confirm('Unblock this IP?')) return;
    try {
      await apiClient.delete(`/admin/security/blocked-ips/${id}`);
      fetchData();
    } catch(e) {}
  };

  const blockIp = async () => {
    const ip = prompt("Enter IP to block:");
    if (!ip) return;
    const reason = prompt("Reason (optional):");
    try {
      await apiClient.post(`/admin/security/blocked-ips`, { ip, reason });
      fetchData();
    } catch(e) {}
  };

  const updatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/security/password-policy`, policy);
      alert('Policy updated');
    } catch(e) {}
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'logins', label: 'Logins', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Globe },
    { id: 'failed-logins', label: 'Failed Logins', icon: ShieldAlert },
    { id: 'alerts', label: 'Alerts', icon: Shield },
    { id: 'blocked-ips', label: 'Blocked IPs', icon: Lock },
    { id: 'policy', label: 'Policy', icon: Settings },
  ];

  return (
    <>
    <div className="max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEOMeta pageKey="admin_security" defaultTitle="Security Center | Admin" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Center</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise security management and monitoring.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
             { label: 'Active Sessions', value: stats.activeSessions },
             { label: 'Failed Logins (Today)', value: stats.failedLoginsToday },
             { label: 'Blocked IPs', value: stats.blockedIPs },
             { label: '2FA Enabled Users', value: stats.twoFactorUsers },
             { label: 'Security Alerts (Today)', value: stats.alerts },
             { label: 'Password Resets (Today)', value: stats.passwordResets },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'logins' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Time</th>
                <th className="p-4 font-medium text-slate-500">User</th>
                <th className="p-4 font-medium text-slate-500">IP / Device</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="p-4 text-slate-500">{new Date(log.loginTime).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-900">{log.user?.email}</td>
                  <td className="p-4 text-slate-500">{log.ip} &middot; {log.device}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {log.success ? 'Success' : `Failed: ${log.failureReason}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Last Activity</th>
                <th className="p-4 font-medium text-slate-500">User</th>
                <th className="p-4 font-medium text-slate-500">IP / Device</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess: any) => (
                <tr key={sess.id} className="border-b border-slate-100">
                  <td className="p-4 text-slate-500">{new Date(sess.lastActivity).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-900">{sess.user?.email}</td>
                  <td className="p-4 text-slate-500">{sess.ip} &middot; {sess.device}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${sess.revoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {sess.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {!sess.revoked && (
                      <button onClick={() => revokeSession(sess.id)} className="text-red-600 hover:text-red-800 font-medium">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'blocked-ips' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Blocked IPs</h2>
            <button onClick={blockIp} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Block IP</button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">IP</th>
                <th className="p-4 font-medium text-slate-500">Reason</th>
                <th className="p-4 font-medium text-slate-500">Blocked At</th>
                <th className="p-4 font-medium text-slate-500">Expires</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blockedIps.map((b: any) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="p-4 font-mono text-slate-900">{b.ip}</td>
                  <td className="p-4 text-slate-500">{b.reason || '-'}</td>
                  <td className="p-4 text-slate-500">{new Date(b.blockedAt).toLocaleString()}</td>
                  <td className="p-4 text-slate-500">{b.expiresAt ? new Date(b.expiresAt).toLocaleString() : 'Never'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => unblockIp(b.id)} className="text-indigo-600 hover:text-indigo-800 font-medium">Unblock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'failed-logins' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Time</th>
                <th className="p-4 font-medium text-slate-500">Email</th>
                <th className="p-4 font-medium text-slate-500">IP</th>
                <th className="p-4 font-medium text-slate-500">Reason</th>
              </tr>
            </thead>
            <tbody>
              {failedLogins.map((f: any) => (
                <tr key={f.id} className="border-b border-slate-100">
                  <td className="p-4 text-slate-500">{new Date(f.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-900">{f.email}</td>
                  <td className="p-4 font-mono text-slate-500">{f.ip}</td>
                  <td className="p-4 text-red-600 font-medium">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Time</th>
                <th className="p-4 font-medium text-slate-500">Type</th>
                <th className="p-4 font-medium text-slate-500">Message</th>
                <th className="p-4 font-medium text-slate-500">Severity</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="p-4 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-900">{a.type}</td>
                  <td className="p-4 text-slate-500">{a.message}</td>
                  <td className="p-4">
                     <span className={`px-2 py-1 rounded text-xs font-medium ${a.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'policy' && policy && (
        <form onSubmit={updatePolicy} className="bg-white p-8 rounded-xl border border-slate-200 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Password & Session Policy</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Min Length</label>
              <input type="number" value={policy.minLength} onChange={(e) => setPolicy({...policy, minLength: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-24 text-sm" />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Max Failed Attempts (Before IP Block)</label>
              <input type="number" value={policy.maxFailedAttempts} onChange={(e) => setPolicy({...policy, maxFailedAttempts: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-24 text-sm" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Lock Duration (Minutes)</label>
              <input type="number" value={policy.lockDurationMinutes} onChange={(e) => setPolicy({...policy, lockDurationMinutes: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-24 text-sm" />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Refresh Token Expiry (Days)</label>
              <input type="number" value={policy.refreshExpiryDays} onChange={(e) => setPolicy({...policy, refreshExpiryDays: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-24 text-sm" />
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">Save Policy</button>
            </div>
          </div>
        </form>
      )}

    </div>
    </>
  );
}
