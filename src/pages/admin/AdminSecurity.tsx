import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Users, Settings, Lock, Activity, Globe, FileText, Search, Filter, Loader2 } from 'lucide-react';
import SEOMeta from '../../components/SEOMeta';
import apiClient from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';

export default function AdminSecurity() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [logins, setLogins] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
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
      } else if (activeTab === 'activity') {
        const res = await apiClient.get('/admin/audit?module=Security&limit=100');
        setActivityLogs(res.data.logs || []);
      } else if (activeTab === 'policy') {
        const res = await apiClient.get('/admin/security/password-policy');
        setPolicy(res.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to fetch security data", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSearchQuery('');
    setFilterStatus('all');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const revokeSession = async (id: string) => {
    if (!window.confirm('Revoke this session?')) return;
    try {
      await apiClient.post(`/admin/security/sessions/${id}/revoke`);
      toast.success("Session revoked successfully", "Success");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to revoke session", "Error");
    }
  };

  const unblockIp = async (id: string) => {
    if (!window.confirm('Unblock this IP?')) return;
    try {
      await apiClient.delete(`/admin/security/blocked-ips/${id}`);
      toast.success("IP unblocked successfully", "Success");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to unblock IP", "Error");
    }
  };

  const blockIp = async () => {
    const ip = window.prompt("Enter IP to block:");
    if (!ip) return;
    const reason = window.prompt("Reason (optional):");
    try {
      await apiClient.post(`/admin/security/blocked-ips`, { ip, reason });
      toast.success("IP blocked successfully", "Success");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to block IP", "Error");
    }
  };

  const updatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/security/password-policy`, policy);
      toast.success("Password policy updated successfully", "Success");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to update policy", "Error");
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'logins', label: 'Logins', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Globe },
    { id: 'failed-logins', label: 'Failed Logins', icon: ShieldAlert },
    { id: 'alerts', label: 'Alerts', icon: Shield },
    { id: 'blocked-ips', label: 'Blocked IPs', icon: Lock },
    { id: 'activity', label: 'Activity', icon: FileText },
    { id: 'policy', label: 'Policy', icon: Settings },
  ];

  const getFilteredData = (data: any[], type: string) => {
    return data.filter(item => {
      let matchesSearch = true;
      let matchesFilter = true;

      const q = searchQuery.toLowerCase();

      if (type === 'logins') {
        if (q) matchesSearch = item.user?.email?.toLowerCase().includes(q) || item.ip?.toLowerCase().includes(q) || item.device?.toLowerCase().includes(q);
        if (filterStatus !== 'all') matchesFilter = filterStatus === 'success' ? item.success : !item.success;
      } else if (type === 'sessions') {
        if (q) matchesSearch = item.user?.email?.toLowerCase().includes(q) || item.ip?.toLowerCase().includes(q) || item.device?.toLowerCase().includes(q);
        if (filterStatus !== 'all') matchesFilter = filterStatus === 'active' ? !item.revoked : item.revoked;
      } else if (type === 'failed-logins') {
        if (q) matchesSearch = item.email?.toLowerCase().includes(q) || item.ip?.toLowerCase().includes(q) || item.reason?.toLowerCase().includes(q);
      } else if (type === 'alerts') {
        if (q) matchesSearch = item.type?.toLowerCase().includes(q) || item.message?.toLowerCase().includes(q);
        if (filterStatus !== 'all') matchesFilter = item.severity?.toLowerCase() === filterStatus.toLowerCase();
      } else if (type === 'blocked-ips') {
        if (q) matchesSearch = item.ip?.toLowerCase().includes(q) || item.reason?.toLowerCase().includes(q);
      } else if (type === 'activity') {
        if (q) matchesSearch = item.action?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.actorName?.toLowerCase().includes(q) || item.actorEmail?.toLowerCase().includes(q);
      }

      return matchesSearch && matchesFilter;
    });
  };

  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderSearchAndFilter = (type: string) => (
    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50">
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      {['logins', 'sessions', 'alerts'].includes(type) && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            {type === 'logins' && (
              <>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </>
            )}
            {type === 'sessions' && (
              <>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </>
            )}
            {type === 'alerts' && (
              <>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </>
            )}
          </select>
        </div>
      )}
    </div>
  );

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-700">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <span className="px-2 font-bold">‹</span>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                    currentPage === i + 1 ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <span className="px-2 font-bold">›</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

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

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={loading}
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

      {activeTab === 'logins' && (() => {
        const filtered = getFilteredData(logins, 'logins');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {renderSearchAndFilter('logins')}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-500">Time</th>
                    <th className="p-4 font-medium text-slate-500">User</th>
                    <th className="p-4 font-medium text-slate-500">IP / Device</th>
                    <th className="p-4 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log: any) => (
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
                  {loading && paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No matching logins found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'sessions' && (() => {
        const filtered = getFilteredData(sessions, 'sessions');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {renderSearchAndFilter('sessions')}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
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
                  {paginated.map((sess: any) => (
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
                  {loading && paginated.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching sessions found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'blocked-ips' && (() => {
        const filtered = getFilteredData(blockedIps, 'blocked-ips');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50">
              <div className="relative flex-1 max-w-md w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search IPs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button onClick={blockIp} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap self-start sm:self-auto">Block IP</button>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
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
                  {paginated.map((b: any) => (
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
                  {loading && paginated.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching blocked IPs found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'failed-logins' && (() => {
        const filtered = getFilteredData(failedLogins, 'failed-logins');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {renderSearchAndFilter('failed-logins')}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-500">Time</th>
                    <th className="p-4 font-medium text-slate-500">Email</th>
                    <th className="p-4 font-medium text-slate-500">IP</th>
                    <th className="p-4 font-medium text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((f: any) => (
                    <tr key={f.id} className="border-b border-slate-100">
                      <td className="p-4 text-slate-500">{new Date(f.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-900">{f.email}</td>
                      <td className="p-4 font-mono text-slate-500">{f.ip}</td>
                      <td className="p-4 text-red-600 font-medium">{f.reason}</td>
                    </tr>
                  ))}
                  {loading && paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No matching failed logins found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'alerts' && (() => {
        const filtered = getFilteredData(alerts, 'alerts');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {renderSearchAndFilter('alerts')}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-500">Time</th>
                    <th className="p-4 font-medium text-slate-500">Type</th>
                    <th className="p-4 font-medium text-slate-500">Message</th>
                    <th className="p-4 font-medium text-slate-500">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a: any) => (
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
                  {loading && paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No matching alerts found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'activity' && (() => {
        const filtered = getFilteredData(activityLogs, 'activity');
        const paginated = getPaginatedData(filtered);
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {renderSearchAndFilter('activity')}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-500">Time</th>
                    <th className="p-4 font-medium text-slate-500">Actor</th>
                    <th className="p-4 font-medium text-slate-500">Action</th>
                    <th className="p-4 font-medium text-slate-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-900">{log.actorName || log.actorEmail || 'System'}</td>
                      <td className="p-4 font-medium text-indigo-600">{log.action}</td>
                      <td className="p-4 text-slate-500 truncate max-w-xs" title={log.description}>{log.description}</td>
                    </tr>
                  ))}
                  {loading && paginated.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading...</td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No matching activity logs found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {activeTab === 'policy' && policy && (
        <form onSubmit={updatePolicy} className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Password & Session Policy</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Min Length</label>
              <input type="number" value={policy.minLength} onChange={(e) => setPolicy({...policy, minLength: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-full sm:w-24 text-sm" />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Max Failed Attempts (Before IP Block)</label>
              <input type="number" value={policy.maxFailedAttempts} onChange={(e) => setPolicy({...policy, maxFailedAttempts: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-full sm:w-24 text-sm" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Lock Duration (Minutes)</label>
              <input type="number" value={policy.lockDurationMinutes} onChange={(e) => setPolicy({...policy, lockDurationMinutes: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-full sm:w-24 text-sm" />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Refresh Token Expiry (Days)</label>
              <input type="number" value={policy.refreshExpiryDays} onChange={(e) => setPolicy({...policy, refreshExpiryDays: Number(e.target.value)})} className="border border-slate-200 rounded p-2 w-full sm:w-24 text-sm" />
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100 mt-6">
              <button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">Save Policy</button>
            </div>
          </div>
        </form>
      )}

    </div>
    </>
  );
}
