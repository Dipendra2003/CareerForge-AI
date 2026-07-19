import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, ChevronLeft, ChevronRight, X, Eye, 
  Calendar, Download, ClipboardList
} from 'lucide-react';
import apiClient from '../../lib/apiClient';

export default function AdminAudit() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState('');

  // Filter options from API
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, module, action, status, dateRange]);

  const fetchFilterOptions = async () => {
    try {
      const response = await apiClient.get('/admin/auditLogs/filters');
      setAvailableModules(response.data.modules || []);
      setAvailableActions(response.data.actions || []);
    } catch (err) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(module && { module }),
        ...(action && { action }),
        ...(status && { status }),
        ...(dateRange && { dateRange }),
      });
      const response = await apiClient.get(`/admin/auditLogs?${params.toString()}`);
      setLogs(response.data.logs || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalCount(response.data.pagination?.totalCount || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...(search && { search }),
        ...(module && { module }),
        ...(action && { action }),
        ...(status && { status }),
        ...(dateRange && { dateRange }),
      });
      
      const response = await apiClient.get(`/admin/auditLogs?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      
      alert("Failed to export logs");
    } finally {
      setIsExporting(false);
    }
  };

  const openLogDetails = (log: any) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  if (authLoading) return <div className="p-8">Loading...</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">View and track all system activities</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search actor, target, IP, or details..."
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            
            <div className="grid grid-cols-2 md:flex gap-4">
              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border bg-white"
                value={module}
                onChange={(e) => { setModule(e.target.value); setPage(1); }}
              >
                <option value="">All Modules</option>
                {availableModules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border bg-white"
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
              >
                <option value="">All Actions</option>
                {availableActions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              
              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border bg-white"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
              </select>

              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border bg-white"
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">Actor</th>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">Module & Action</th>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">Target</th>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wider">IP / Browser</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{log.actorName || log.actorEmail || 'System'}</div>
                      <div className="text-xs text-gray-500">{log.actorEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">{log.module}</div>
                      <div className="text-gray-500">{log.action}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {log.targetType && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                           {log.targetType}
                         </span>
                      )}
                      {log.targetUserId && <div className="text-xs truncate max-w-[120px]" title={log.targetUserId}>{log.targetUserId}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div>{log.ipAddress}</div>
                      <div className="truncate max-w-[120px]" title={log.userAgent}>{log.userAgent?.split(' ')[0]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <button onClick={() => openLogDetails(log)} className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs && logs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Audit Log Details
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Actor</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedLog.actorName} ({selectedLog.actorEmail || 'No Email'})
                        <div className="text-xs text-gray-500">ID: {selectedLog.actorId}</div>
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</dd>
                    </div>
                    
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Action & Module</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className="font-medium">{selectedLog.module}</span> : {selectedLog.action}
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedLog.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedLog.status}
                        </span>
                      </dd>
                    </div>

                    {selectedLog.description && (
                       <div className="sm:col-span-2">
                         <dt className="text-sm font-medium text-gray-500">Description</dt>
                         <dd className="mt-1 text-sm text-gray-900">{selectedLog.description}</dd>
                       </div>
                    )}

                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Target Type & ID</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedLog.targetType || 'N/A'} - {selectedLog.targetId || 'N/A'}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Target User ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 truncate" title={selectedLog.targetUserId}>{selectedLog.targetUserId || 'N/A'}</dd>
                    </div>

                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Endpoint & Method</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedLog.requestMethod} {selectedLog.endpoint}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</dd>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">User Agent</dt>
                      <dd className="mt-1 text-sm text-gray-900 wrap-break-word">{selectedLog.userAgent}</dd>
                    </div>

                    {selectedLog.oldValue && (
                       <div className="sm:col-span-2">
                         <dt className="text-sm font-medium text-gray-500">Old Value</dt>
                         <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto max-h-48">
                           <pre>{JSON.stringify(selectedLog.oldValue, null, 2)}</pre>
                         </dd>
                       </div>
                    )}

                    {selectedLog.newValue && (
                       <div className="sm:col-span-2">
                         <dt className="text-sm font-medium text-gray-500">New Value</dt>
                         <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto max-h-48">
                           <pre>{JSON.stringify(selectedLog.newValue, null, 2)}</pre>
                         </dd>
                       </div>
                    )}

                  </dl>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
